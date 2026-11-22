import type { ReactNode } from "react";
import { act, renderHook, render, screen, waitFor } from "@testing-library/react";
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { AuthProvider } from "../src/modulos/manejo-sesion/AuthProvider";
import { useAuth } from "../src/modulos/manejo-sesion/useAuth";
import { api, ApiError } from "../src/shared/api/client";

vi.mock("../src/shared/api/client", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/shared/api/client")>(),
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

const respuestaLogin = {
  id: "usuario-1",
  nombre: "Ana",
  apellido: "Perez",
  dni: "12345678",
  correo_electronico: "ana@example.com",
  tipo_usuario: "ALUMNO",
  token: "token-actual",
  debe_cambiar_contrasena: true,
};

function Wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

function prepararHook() {
  return renderHook(() => useAuth(), {
    wrapper: Wrapper,
  });
}

beforeEach(() => {
  sessionStorage.clear();
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
  vi.mocked(api.post).mockResolvedValue(respuestaLogin);
});

afterEach(() => { vi.useRealTimers(); sessionStorage.clear(); });

it("cierra la sesión al vencer el JWT aunque no haya solicitudes", async () => {
  vi.useFakeTimers();
  const exp = Math.floor(Date.now() / 1000) + 60;
  vi.mocked(api.post).mockResolvedValueOnce({
    ...respuestaLogin,
    token: `header.${btoa(JSON.stringify({ exp }))}.firma`,
  });
  const { result } = prepararHook();
  await act(async () => { await result.current.login("ana@example.com", "Clave123!"); });
  expect(result.current.user).not.toBeNull();
  act(() => { vi.advanceTimersByTime(60_000); });
  expect(result.current.user).toBeNull();
  expect(result.current.motivoCierre).toContain("venció");
});

it("una respuesta de login pendiente no restaura una sesión cerrada", async () => {
  let resolver!: (valor: typeof respuestaLogin) => void;
  vi.mocked(api.post).mockReturnValueOnce(new Promise(resolve => { resolver = resolve; }));
  const { result } = prepararHook();
  let pendiente!: Promise<unknown>;
  act(() => { pendiente = result.current.login("ana@example.com", "Clave123!"); });
  act(() => { result.current.logout(); });
  await act(async () => {
    resolver(respuestaLogin);
    await expect(pendiente).rejects.toThrow("cancelado");
  });
  expect(result.current.user).toBeNull();
});

describe("useAuth y AuthProvider", () => {
  it("requiere estar dentro del proveedor", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth debe usarse dentro de AuthProvider",
    );
  });

  it("no habilita una sesión privada para un aspirante", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      ...respuestaLogin,
      tipo_usuario: "ASPIRANTE",
    });
    const { result } = prepararHook();
    await act(async () => {
      await expect(result.current.login("ana@example.com", "Clave123!"))
        .rejects.toThrow("Los aspirantes realizan su seguimiento desde el sitio público.");
    });
    expect(result.current.user).toBeNull();
  });

  it("inicia sin usuario autenticado", () => {
    const { result } = prepararHook();

    expect(result.current.user).toBeNull();
  });

  it("inicia sesión y conserva los datos del usuario", async () => {
    const { result } = prepararHook();

    await act(async () => {
      await result.current.login(
        " ana@example.com ",
        "ClavePrueba123!",
      );
    });

    expect(api.post).toHaveBeenCalledWith(
      "/autenticacion/login",
      {
        correo_electronico: "ana@example.com",
        contrasena: "ClavePrueba123!",
      },
    );

    expect(result.current.user).toEqual({
      id: "usuario-1",
      nombre: "Ana",
      apellido: "Perez",
      dni: "12345678",
      email: "ana@example.com",
      rol: "ALUMNO",
      token: "token-actual",
      debeCambiarContrasena: true,
    });
  });

  it.each([
    ["", "Clave123!"],
    ["   ", "Clave123!"],
    ["ana@example.com", ""],
    ["ana@example.com", "   "],
  ])(
    "rechaza campos vacíos: %s / %s",
    async (email, password) => {
      const { result } = prepararHook();

      await act(async () => {
        await expect(
          result.current.login(email, password),
        ).rejects.toThrow(
          "El email y la contraseña son obligatorios",
        );
      });

      expect(api.post).not.toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    },
  );

  it("propaga el error de login sin iniciar sesión", async () => {
    vi.mocked(api.post).mockRejectedValueOnce(
      new Error("Correo o contraseña incorrectos"),
    );

    const { result } = prepararHook();

    await act(async () => {
      await expect(
        result.current.login(
          "ana@example.com",
          "incorrecta",
        ),
      ).rejects.toThrow("Correo o contraseña incorrectos");
    });

    expect(result.current.user).toBeNull();
  });

  it("cierra la sesión", async () => {
    const { result } = prepararHook();

    await act(async () => {
      await result.current.login(
        "ana@example.com",
        "ClavePrueba123!",
      );
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
  });

  it("confirma el cambio de contraseña", async () => {
    const { result } = prepararHook();

    await act(async () => {
      await result.current.login(
        "ana@example.com",
        "ClavePrueba123!",
      );
    });

    act(() => {
      result.current.confirmarCambioContrasena();
    });

    expect(
      result.current.user?.debeCambiarContrasena,
    ).toBe(false);
    expect(result.current.user?.token).toBe("token-actual");
  });

  it("confirmar cambio sin sesión no crea un usuario", () => {
    const { result } = prepararHook();

    act(() => {
      result.current.confirmarCambioContrasena();
    });

    expect(result.current.user).toBeNull();
  });

  it("invalida la sesión cuando se rechaza su token", async () => {
    const { result } = prepararHook();

    await act(async () => {
      await result.current.login(
        "ana@example.com",
        "ClavePrueba123!",
      );
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent("sesion-invalidada", {
          detail: "token-actual",
        }),
      );
    });

    expect(result.current.user).toBeNull();
  });

  it("un error de un token anterior no cierra la sesión actual", async () => {
    const { result } = prepararHook();

    await act(async () => {
      await result.current.login(
        "ana@example.com",
        "ClavePrueba123!",
      );
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent("sesion-invalidada", {
          detail: "token-anterior",
        }),
      );
    });

    expect(result.current.user?.token).toBe("token-actual");
  });
});


it("restaura la sesión al recargar consultando el servidor", async () => {
  sessionStorage.setItem("posgrados.token", "token-guardado");
  vi.mocked(api.get).mockResolvedValue(respuestaLogin);
  function Perfil() { const { user } = useAuth(); return <span>{user?.nombre}</span>; }
  render(<AuthProvider><Perfil /></AuthProvider>);
  await waitFor(() => expect(screen.getByText("Ana")).toBeInTheDocument());
  expect(api.get).toHaveBeenCalledWith("/autenticacion/me", "token-guardado");
});


it("descarta el token rechazado al restaurar la sesión", async () => {
  sessionStorage.setItem("posgrados.token", "token-vencido");
  vi.mocked(api.get).mockRejectedValue(new ApiError("Vencido", 401));
  render(<AuthProvider><span>Portal</span></AuthProvider>);
  await screen.findByText("Portal");
  expect(sessionStorage.getItem("posgrados.token")).toBeNull();
});
