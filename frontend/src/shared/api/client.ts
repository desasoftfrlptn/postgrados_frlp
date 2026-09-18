const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  field?: string;
  timestamp: string;
}

export class ApiError extends Error {
  statusCode: number;
  errorCode: string;
  field?: string;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.statusCode = body.statusCode;
    this.errorCode = body.error;
    this.field = body.field;
  }
}

type TokenProvider = () => string | null;
type UnauthorizedHandler = () => void;

let getToken: TokenProvider = () => null;
let onUnauthorized: UnauthorizedHandler = () => {};

export function configureApiClient(options: {
  getToken: TokenProvider;
  onUnauthorized?: UnauthorizedHandler;
}) {
  getToken = options.getToken;
  if (options.onUnauthorized) onUnauthorized = options.onUnauthorized;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown; // se serializa a JSON automáticamente (excepto FormData)
  auth?: boolean; // default true, poner false en endpoints públicos
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string>),
  };

  const isFormData = body instanceof FormData;
  if (!isFormData && body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 204 No Content u otras respuestas sin body
  if (response.status === 204) return undefined as T;

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401) onUnauthorized();

    if (isJson) {
      throw new ApiError(data as ApiErrorBody);
    }
    throw new ApiError({
      statusCode: response.status,
      error: "UNKNOWN_ERROR",
      message: typeof data === "string" ? data : "Error inesperado del servidor",
      timestamp: new Date().toISOString(),
    });
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
