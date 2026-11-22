export class ApiError extends Error {
  readonly status: number;

  constructor(mensaje: string, status: number) {
    super(mensaje);
    this.name = "ApiError";
    this.status = status;
  }
}


const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://127.0.0.1:8000/api/v1";

const API_BASE =
  import.meta.env.VITE_API_BASE ??
  "http://127.0.0.1:8000";

const MENSAJE_ERROR_GENERAL =
  "No se pudo completar la operación.";

const MENSAJE_ERROR_CONEXION =
  "No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente.";

interface ErrorValidacion {
  msg?: unknown;
}

interface RespuestaError {
  detail?: unknown;
  message?: unknown;
}

// Extrae mensajes comprensibles de los errores del Backend.
function obtenerMensajeError(data: unknown): string {
  if (data === null || typeof data !== "object") {
    return "Ocurrió un error inesperado.";
  }

  const error = data as RespuestaError;

  if (
    typeof error.detail === "string" &&
    error.detail.trim()
  ) {
    return error.detail;
  }

  // FastAPI puede devolver varios errores de validación.
  if (Array.isArray(error.detail)) {
    const mensajes = error.detail
      .map((item: unknown) => {
        if (
          item !== null &&
          typeof item === "object" &&
          "msg" in item
        ) {
          const validacion = item as ErrorValidacion;

          return typeof validacion.msg === "string"
            ? validacion.msg
            : null;
        }

        return typeof item === "string" ? item : null;
      })
      .filter(
        (mensaje): mensaje is string =>
          typeof mensaje === "string" &&
          mensaje.trim().length > 0
      );

    if (mensajes.length > 0) {
      return mensajes.join(" - ");
    }
  }

  if (
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return MENSAJE_ERROR_GENERAL;
}

// Construye los encabezados sin interferir con FormData.
function crearHeaders(
  token?: string,
  tieneCuerpoJSON = false
): Headers {
  const headers = new Headers();

  if (tieneCuerpoJSON) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

// Lee una respuesta JSON o detecta respuestas vacías.
async function leerRespuesta(
  respuesta: Response
): Promise<unknown> {
  if (respuesta.status === 204 || respuesta.status === 205) {
    return undefined;
  }

  const contenido = await respuesta.text();

  if (!contenido.trim()) {
    return undefined;
  }

  return JSON.parse(contenido) as unknown;
}

// Centraliza solicitudes, autenticación y errores HTTP.
async function request<T>(
  ruta: string,
  opciones: RequestInit,
  token?: string,
  comoArchivo = false
): Promise<T> {
  let respuesta: Response;

  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      headers: crearHeaders(
        token,
        opciones.body !== undefined &&
          !(opciones.body instanceof FormData)
      ),
    });
  } catch (error: unknown) {
    // No convertir una cancelación en un error de conexión.
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    // Errores de red generados por fetch.
    if (error instanceof TypeError) {
      throw new Error(MENSAJE_ERROR_CONEXION, {
        cause: error,
      });
    }

    throw error;
  }

  // Mantiene el contrato actual con AuthProvider.
  if (respuesta.status === 401 && token) {
    window.dispatchEvent(
      new CustomEvent<string>("sesion-invalidada", {
        detail: token,
      })
    );
  }

  if (!respuesta.ok) {
    let data: unknown = null;

    try {
      data = await leerRespuesta(respuesta);
    } catch {
      // El servidor puede responder con HTML o texto.
    }

    throw new ApiError(
      obtenerMensajeError(data),
      respuesta.status,
    );
  }

  if (respuesta.status === 204 || respuesta.status === 205) {
    return undefined as T;
  }

  if (comoArchivo) {
    return (await respuesta.blob()) as T;
  }

  const contenido = await respuesta.text();

  if (!contenido.trim()) {
    return undefined as T;
  }

  try {
    return JSON.parse(contenido) as T;
  } catch {
    throw new Error(
      "El servidor devolvió una respuesta con formato inválido."
    );
  }
}

// Operaciones HTTP utilizadas por los módulos.
export const api = {
  descargar(
    ruta: string,
    token: string
  ): Promise<Blob> {
    return request<Blob>(
      ruta,
      { method: "GET" },
      token,
      true
    );
  },

  get<T>(
    ruta: string,
    token?: string
  ): Promise<T> {
    return request<T>(ruta, { method: "GET" }, token);
  },

  post<T>(
    ruta: string,
    datos?: unknown,
    token?: string
  ): Promise<T> {
    return request<T>(
      ruta,
      {
        method: "POST",
        body:
          datos !== undefined
            ? JSON.stringify(datos)
            : undefined,
      },
      token
    );
  },

  put<T>(
    ruta: string,
    datos?: unknown,
    token?: string
  ): Promise<T> {
    return request<T>(
      ruta,
      {
        method: "PUT",
        body:
          datos !== undefined
            ? JSON.stringify(datos)
            : undefined,
      },
      token
    );
  },

  patch<T>(
    ruta: string,
    datos?: unknown,
    token?: string
  ): Promise<T> {
    return request<T>(
      ruta,
      {
        method: "PATCH",
        body:
          datos !== undefined
            ? JSON.stringify(datos)
            : undefined,
      },
      token
    );
  },

  delete<T>(
    ruta: string,
    token?: string
  ): Promise<T> {
    return request<T>(
      ruta,
      { method: "DELETE" },
      token
    );
  },

  postForm<T>(
    ruta: string,
    datos: FormData,
    token?: string
  ): Promise<T> {
    return request<T>(
      ruta,
      {
        method: "POST",
        body: datos,
      },
      token
    );
  },

  putForm<T>(
    ruta: string,
    datos: FormData,
    token?: string
  ): Promise<T> {
    return request<T>(
      ruta,
      {
        method: "PUT",
        body: datos,
      },
      token
    );
  },
};

// Construye URLs para imágenes y documentos públicos.
export function obtenerUrlArchivo(
  ruta: string | null
): string {
  if (!ruta) return "";

  if (
    ruta.startsWith("http://") ||
    ruta.startsWith("https://")
  ) {
    return ruta;
  }

  if (ruta.startsWith("/")) {
    return `${API_BASE}${ruta}`;
  }

  return `${API_BASE}/${ruta}`;
}
