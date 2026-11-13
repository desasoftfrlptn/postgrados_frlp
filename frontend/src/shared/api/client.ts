/**
 * Cliente HTTP base. Adaptado al backend FastAPI:
 *  - Errores: FastAPI responde `{ detail: string | {error,message,field} | ValidationItem[] }`.
 *    Todo se normaliza a `ApiError`.
 *  - Auth de staff: Bearer access token + refresh token (rotativo, de un solo uso).
 *    Ante un 401 se renueva la sesión una sola vez (single-flight) y se reintenta el request.
 *  - Aspirantes: cookie HttpOnly `acceso_aspirante` (sin Bearer). Los endpoints que la usan
 *    deben llamarse con `credentials: "include"` y `auth: false`.
 */

// Ojo: las rutas de los routers son /auth, /accesos, /legajos (sin prefijo de versión).
// Si en main.py se monta con include_router(prefix="/api/v1") este default es correcto;
// si no, definir VITE_API_BASE_URL.

const BASE_URL = String(import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1").replace(/\/+$/, "");

/* ───────────────────────────── Errores ───────────────────────────── */

interface ValidationItem {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR"
  | (string & {}); // el backend puede mandar códigos propios (ej. "CONFLICT" en ConflictoLegajo)

export class ApiError extends Error {
  statusCode: number;
  errorCode: ApiErrorCode;
  /** Campo asociado al error (primer campo inválido en 422, o `field` en 409 de legajos). */
  field?: string;
  /** Errores de validación 422 de Pydantic: { "email": "mensaje", "domicilio.calle": "..." }. */
  fieldErrors?: Record<string, string>;

  constructor(init: {
    statusCode: number;
    message: string;
    errorCode?: ApiErrorCode;
    field?: string;
    fieldErrors?: Record<string, string>;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.statusCode = init.statusCode;
    this.errorCode = init.errorCode ?? codeFromStatus(init.statusCode);
    this.field = init.field;
    this.fieldErrors = init.fieldErrors;
  }

  get isNetworkError() { return this.statusCode === 0; }
  get isUnauthorized() { return this.statusCode === 401; }
  get isForbidden() { return this.statusCode === 403; }
  get isNotFound() { return this.statusCode === 404; }
  get isConflict() { return this.statusCode === 409; }
  get isValidation() { return this.statusCode === 422; }
  get isRateLimited() { return this.statusCode === 429; }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

/**
 * Para `QueryClient({ defaultOptions: { queries: { retry: shouldRetryQuery } } })`.
 * No tiene sentido reintentar 4xx (401/403/404/409/422/429): solo errores de red o 5xx.
 */
export const shouldRetryQuery = (failureCount: number, error: unknown) => {
  if (failureCount >= 2) return false;
  if (isApiError(error)) return error.statusCode === 0 || error.statusCode >= 500;
  return true;
};

function codeFromStatus(status: number): ApiErrorCode {
  if (status === 0) return "NETWORK_ERROR";
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 422) return "VALIDATION_ERROR";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "SERVER_ERROR";
  return "UNKNOWN_ERROR";
}

function defaultMessage(status: number): string {
  if (status === 0) return "No se pudo conectar con el servidor";
  if (status === 401) return "Sesión inválida o vencida";
  if (status === 403) return "No tenés permisos para realizar esta acción";
  if (status === 404) return "No se encontró el recurso solicitado";
  if (status === 422) return "Los datos enviados no son válidos";
  if (status === 429) return "Demasiados intentos, probá de nuevo en unos minutos";
  if (status >= 500) return "Error inesperado del servidor";
  return "Error inesperado";
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const asString = (v: unknown) => (typeof v === "string" ? v : undefined);

const LOC_PREFIXES = new Set(["body", "query", "path", "header", "cookie"]);

function buildApiError(status: number, data: unknown): ApiError {
  const detail = isRecord(data) ? data.detail : undefined;

  // 422 de validación de FastAPI/Pydantic: detail es un array
  if (Array.isArray(detail)) {
    const fieldErrors: Record<string, string> = {};
    const generales: string[] = []; // errores de modelo (sin campo), ej. "Debe indicar el tipo de beca"
    for (const item of detail as ValidationItem[]) {
      const msg = item.msg.replace(/^Value error, /, ""); // prefijo que agrega Pydantic a los validators propios
      const key = (item.loc ?? []).filter((p) => !LOC_PREFIXES.has(String(p))).join(".");
      if (!key) generales.push(msg);
      else if (!(key in fieldErrors)) fieldErrors[key] = msg;
    }
    return new ApiError({
      statusCode: status,
      message: generales[0] ?? defaultMessage(422),
      errorCode: "VALIDATION_ERROR",
      field: Object.keys(fieldErrors)[0],
      fieldErrors,
    });
  }

  // HTTPException(detail="texto")
  if (typeof detail === "string") {
    return new ApiError({ statusCode: status, message: detail });
  }

  // HTTPException(detail={error, message, field}) (ej. ConflictoLegajo) o body plano {message,...}
  const source = isRecord(detail) ? detail : isRecord(data) ? data : undefined;
  return new ApiError({
    statusCode: status,
    message: asString(source?.message) ?? defaultMessage(status),
    errorCode: asString(source?.error),
    field: asString(source?.field),
  });
}

/* ──────────────────────── Configuración de sesión ──────────────────────── */

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

let getToken: () => string | null = () => null;
let getRefreshToken: () => string | null = () => null;
let onTokensRefreshed: (tokens: TokenPair) => void = () => {};
let onUnauthorized: () => void = () => {};

/**
 * - getToken / getRefreshToken: leen los tokens del store de auth.
 * - onTokensRefreshed: DEBE persistir ambos tokens (el refresh token rota: el anterior queda revocado).
 * - onUnauthorized: la sesión no se pudo recuperar → limpiar store/caché y redirigir a login.
 *   Puede invocarse varias veces si fallan requests concurrentes; debe ser idempotente.
 */
export function configureApiClient(options: {
  getToken: () => string | null;
  getRefreshToken?: () => string | null;
  onTokensRefreshed?: (tokens: TokenPair) => void;
  onUnauthorized?: () => void;
}) {
  getToken = options.getToken;
  if (options.getRefreshToken) getRefreshToken = options.getRefreshToken;
  if (options.onTokensRefreshed) onTokensRefreshed = options.onTokensRefreshed;
  if (options.onUnauthorized) onUnauthorized = options.onUnauthorized;
}

/* ───────────────────────────── Request core ───────────────────────────── */

type QueryValue = string | number | boolean | Date | null | undefined;
export type QueryParams = Record<string, QueryValue | QueryValue[]>;

export interface RequestOptions extends Omit<RequestInit, "body"> {
  /** Se serializa a JSON automáticamente (excepto FormData). */
  body?: unknown;
  /** Default true. Poner false en endpoints públicos o que usan cookie de aspirante. */
  auth?: boolean;
  /** Query string. Se omiten undefined, null y "". Booleanos → "true"/"false". */
  params?: QueryParams;
  /** Default true. Si es false, un 401 no intenta renovar la sesión. */
  retryOnUnauthorized?: boolean;
}

function buildUrl(path: string, params?: QueryParams): string {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  if (!params) return url;

  const search = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    for (const value of Array.isArray(raw) ? raw : [raw]) {
      if (value === undefined || value === null || value === "") continue;
      search.append(key, value instanceof Date ? value.toISOString() : String(value));
    }
  }
  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
}

type ResponseKind = "json" | "blob";

interface Parsed<T> {
  data: T;
  response: Response;
}

async function execute<T>(
  path: string,
  options: RequestOptions,
  token: string | null,
  kind: ResponseKind,
): Promise<Parsed<T>> {
  const { body, auth: _auth, params, retryOnUnauthorized: _retry, headers, ...rest } = options;

  const finalHeaders = new Headers(headers);
  if (!finalHeaders.has("Accept")) {
    finalHeaders.set("Accept", kind === "blob" ? "*/*" : "application/json");
  }

  const isFormData = body instanceof FormData;
  if (body !== undefined && !isFormData && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (token) finalHeaders.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      ...rest,
      headers: finalHeaders,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    });
  } catch (error) {
    // Las cancelaciones de TanStack Query (AbortSignal) se propagan tal cual
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError({ statusCode: 0, message: defaultMessage(0) });
  }

  if (!response.ok) {
    const isJson = response.headers.get("content-type")?.includes("application/json");
    let data: unknown;
    try {
      data = isJson ? await response.json() : undefined;
    } catch {
      data = undefined;
    }
    throw buildApiError(response.status, data);
  }

  // 204 No Content (logout, DELETE /accesos/sesion) u otras respuestas sin body
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return { data: undefined as T, response };
  }

  if (kind === "blob") return { data: (await response.blob()) as T, response };

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : await response.text();
  return { data: data as T, response };
}

/* ─────────── Renovación de sesión (single-flight) ───────────
 * El backend revoca el refresh token al usarlo. Si dos requests reciben 401 a la vez
 * y cada uno llamara a /auth/refresh, el segundo fallaría y cerraría la sesión.
 * Por eso todos comparten una única promesa de refresh. */

let refreshPromise: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return null;
      try {
        const { data } = await execute<TokenPair>(
          "/auth/refresh",
          { method: "POST", body: { refresh_token: refreshToken } },
          null,
          "json",
        );
        onTokensRefreshed(data);
        return data.access_token;
      } catch (error) {
        // 401 = refresh vencido/revocado → sesión perdida. Otros errores (red, 5xx) se propagan.
        if (error instanceof ApiError && error.statusCode === 401) return null;
        throw error;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function send<T>(path: string, options: RequestOptions, kind: ResponseKind): Promise<Parsed<T>> {
  const { auth = true, retryOnUnauthorized = true } = options;
  const tokenUsed = auth ? getToken() : null;

  try {
    return await execute<T>(path, options, tokenUsed, kind);
  } catch (error) {
    // Solo los endpoints con Bearer disparan renovación/logout. Un 401 de /auth/login
    // ("Credenciales inválidas") o de /accesos/sesion (cookie de aspirante) NO es sesión vencida.
    if (!auth || !(error instanceof ApiError) || error.statusCode !== 401) throw error;

    if (retryOnUnauthorized) {
      // Si otro request ya renovó el token mientras este viajaba, alcanza con reintentar.
      const current = getToken();
      const newToken = current && current !== tokenUsed ? current : await refreshAccessToken();
      if (newToken) {
        try {
          return await execute<T>(path, options, newToken, kind);
        } catch (retryError) {
          if (retryError instanceof ApiError && retryError.statusCode === 401) onUnauthorized();
          throw retryError;
        }
      }
    }

    onUnauthorized();
    throw error;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return (await send<T>(path, options, "json")).data;
}

/* ───────────────────────────── API pública ───────────────────────────── */

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};

/** Descarga de archivos (ej. GET /legajos/exportar → .xlsx). */
export async function download(
  path: string,
  options?: RequestOptions,
): Promise<{ blob: Blob; filename: string | null }> {
  const { data, response } = await send<Blob>(path, { ...options, method: "GET" }, "blob");
  return { blob: data, filename: filenameFrom(response) };
}

// Si front y back están en orígenes distintos, el backend debe exponer Content-Disposition
// en CORS (expose_headers) para que se pueda leer; si no, filename es null.
function filenameFrom(response: Response): string | null {
  const header = response.headers.get("content-disposition");
  if (!header) return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      /* cae al filename simple */
    }
  }
  return /filename="?([^";]+)"?/i.exec(header)?.[1] ?? null;
}
