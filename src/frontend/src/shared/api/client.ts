const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://127.0.0.1:8001/api/v1";

const API_BASE =
  import.meta.env.VITE_API_BASE ??
  "http://127.0.0.1:8001";


interface ErrorValidacion {
  msg?: string;
}


function obtenerMensajeError(
  data: unknown
): string {
  if (
    data === null ||
    typeof data !== "object"
  ) {
    return "Ocurrió un error inesperado.";
  }

  const respuestaError = data as {
    detail?: unknown;
    message?: unknown;
  };


  if (
    typeof respuestaError.detail === "string"
  ) {
    return respuestaError.detail;
  }


  if (
    Array.isArray(
      respuestaError.detail
    )
  ) {
    const mensajes =
      respuestaError.detail
        .map((error) => {
          if (
            error &&
            typeof error === "object" &&
            "msg" in error
          ) {
            const errorValidacion =
              error as ErrorValidacion;

            return (
              errorValidacion.msg ??
              null
            );
          }

          return null;
        })
        .filter(
          (mensaje): mensaje is string =>
            mensaje !== null
        );


    if (mensajes.length > 0) {
      return mensajes.join(" - ");
    }
  }


  if (
    typeof respuestaError.message === "string"
  ) {
    return respuestaError.message;
  }


  return "No se pudo completar la operación.";
}


function crearHeaders(
  token?: string,
  esFormData = false
): Headers {
  const headers =
    new Headers();


  if (!esFormData) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }


  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`
    );
  }


  return headers;
}


async function request<T>(
  ruta: string,
  opciones: RequestInit,
  token?: string
): Promise<T> {
  const respuesta =
    await fetch(
      `${API_URL}${ruta}`,
      {
        ...opciones,
        headers:
          crearHeaders(
            token,
            opciones.body instanceof FormData
          ),
      }
    );


  if (!respuesta.ok) {
    let data: unknown;

    try {
      data =
        await respuesta.json();
    } catch {
      data = null;
    }


    throw new Error(
      obtenerMensajeError(
        data
      )
    );
  }


  if (
    respuesta.status === 204
  ) {
    return undefined as T;
  }


  const data =
    await respuesta.json();


  return data as T;
}


export const api = {
  get<T>(
    ruta: string,
    token?: string
  ): Promise<T> {
    return request<T>(
      ruta,
      {
        method: "GET",
      },
      token
    );
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
      {
        method: "DELETE",
      },
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


export function obtenerUrlArchivo(
  ruta: string | null
): string {
  if (!ruta) {
    return "";
  }


  if (
    ruta.startsWith("http://") ||
    ruta.startsWith("https://")
  ) {
    return ruta;
  }


  if (
    ruta.startsWith("/")
  ) {
    return `${API_BASE}${ruta}`;
  }


  return `${API_BASE}/${ruta}`;
}