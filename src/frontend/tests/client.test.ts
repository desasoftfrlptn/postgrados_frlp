import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { api } from "../src/shared/api/client";

const fetchSimulado = vi.fn<typeof fetch>();

function respuestaJSON(
  contenido: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(contenido), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

beforeEach(() => {
  fetchSimulado.mockReset();
  vi.stubGlobal("fetch", fetchSimulado);
});

it("descarga un documento con Bearer y conserva la respuesta binaria", async () => {
  fetchSimulado.mockResolvedValueOnce(new Response("%PDF-1.4", {
    headers: { "Content-Type": "application/pdf" },
  }));
  const archivo = await api.descargar("/documentos/1/download", "token-prueba");
  expect(await archivo.text()).toBe("%PDF-1.4");
  expect(new Headers(fetchSimulado.mock.calls[0][1]?.headers).get("Authorization"))
    .toBe("Bearer token-prueba");
});

describe("Cliente HTTP", () => {
  it("envía el token en Authorization", async () => {
    fetchSimulado.mockResolvedValueOnce(
      respuestaJSON({ id: "usuario-1" }),
    );

    const resultado = await api.get(
      "/autenticacion/me",
      "token-prueba",
    );

    const opciones = fetchSimulado.mock.calls[0][1];

    expect(
      new Headers(opciones?.headers).get("Authorization"),
    ).toBe("Bearer token-prueba");

    expect(resultado).toEqual({ id: "usuario-1" });
  });

  it("no envía Authorization cuando no recibe un token", async () => {
    fetchSimulado.mockResolvedValueOnce(respuestaJSON({}));

    await api.get("/publico");

    const opciones = fetchSimulado.mock.calls[0][1];

    expect(
      new Headers(opciones?.headers).has("Authorization"),
    ).toBe(false);
  });

  it("envía datos JSON en el login", async () => {
    fetchSimulado.mockResolvedValueOnce(
      respuestaJSON({ token: "token-prueba" }),
    );

    const datos = {
      correo_electronico: "ana@example.com",
      contrasena: "ClavePrueba123!",
    };

    await api.post("/autenticacion/login", datos);

    const opciones = fetchSimulado.mock.calls[0][1];

    expect(opciones?.method).toBe("POST");
    expect(opciones?.body).toBe(JSON.stringify(datos));
    expect(
      new Headers(opciones?.headers).get("Content-Type"),
    ).toBe("application/json");
  });

  it("emite la invalidación cuando el token recibe un 401", async () => {
    fetchSimulado.mockResolvedValueOnce(
      respuestaJSON({ detail: "Token inválido" }, 401),
    );

    const dispatch = vi.spyOn(window, "dispatchEvent");

    await expect(
      api.get("/autenticacion/me", "token-vencido"),
    ).rejects.toThrow("Token inválido");

    const evento = dispatch.mock.calls
      .map(([event]) => event)
      .find((event) => event.type === "sesion-invalidada");

    expect(evento).toBeDefined();
    expect((evento as CustomEvent<string>).detail).toBe(
      "token-vencido",
    );
  });

  it("un 401 de login sin token no invalida otra sesión", async () => {
    fetchSimulado.mockResolvedValueOnce(
      respuestaJSON({ detail: "Credenciales incorrectas" }, 401),
    );

    const dispatch = vi.spyOn(window, "dispatchEvent");

    await expect(
      api.post("/autenticacion/login", {}),
    ).rejects.toThrow("Credenciales incorrectas");

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("un 403 informa falta de permisos sin cerrar la sesión", async () => {
    fetchSimulado.mockResolvedValueOnce(
      respuestaJSON({ detail: "Sin permisos" }, 403),
    );

    const dispatch = vi.spyOn(window, "dispatchEvent");

    await expect(
      api.get("/autenticacion/usuarios", "token-prueba"),
    ).rejects.toThrow("Sin permisos");

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("muestra los errores de validación", async () => {
    fetchSimulado.mockResolvedValueOnce(
      respuestaJSON(
        {
          detail: [
            { msg: "Correo inválido" },
            { msg: "Contraseña demasiado corta" },
          ],
        },
        422,
      ),
    );

    await expect(
      api.post("/autenticacion/usuarios", {}),
    ).rejects.toThrow(
      "Correo inválido - Contraseña demasiado corta",
    );
  });

  it("maneja un error cuya respuesta no es JSON", async () => {
    fetchSimulado.mockResolvedValueOnce(
      new Response("Error del servidor", { status: 500 }),
    );

    await expect(api.get("/ejemplo")).rejects.toThrow(
      "Ocurrió un error inesperado.",
    );
  });

  it("acepta una respuesta 204 sin intentar leer JSON", async () => {
    const respuesta = new Response(null, { status: 204 });
    const leerJSON = vi.spyOn(respuesta, "json");

    fetchSimulado.mockResolvedValueOnce(respuesta);

    await expect(
      api.delete("/autenticacion/usuarios/usuario-1", "token"),
    ).resolves.toBeUndefined();

    expect(leerJSON).not.toHaveBeenCalled();
  });


  it("muestra un mensaje claro y conserva la causa del error de conexión", async () => {
    const errorOriginal = new TypeError("Failed to fetch");

    fetchSimulado.mockRejectedValueOnce(errorOriginal);

    try {
      await api.get("/autenticacion/me", "token");
      expect.fail("Se esperaba un error de conexión");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);

      const errorCapturado = error as Error;

      expect(errorCapturado.message).toBe(
        "No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente."
      );

      expect(errorCapturado.cause).toBe(errorOriginal);
    }
  });

});
