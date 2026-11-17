
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import UsuariosPage from "../src/modulos/perfiles/administrador/paginas/UsuariosPage";
import { api } from "../src/shared/api/client";

vi.mock("../src/shared/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({
  useAuth: () => ({
    user: {
      token: "token-admin-prueba",
      rol: "ADMIN",
      nombre: "Administrador",
      apellido: "Prueba",
    },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(api.get).mockImplementation(
    async <T,>(): Promise<T> => {
      return [] as T;
    },
  );

  vi.mocked(api.post).mockImplementation(
    async <T,>(): Promise<T> => {
      return {
        id: "usuario-1",
        nombre: "Ana",
        apellido: "Perez",
        dni: "12345678",
        correo_electronico: "ana@example.com",
        tipo_usuario: "ALUMNO",
        activo: true,
        debe_cambiar_contrasena: true,
      } as T;
    },
  );
});

async function abrirFormulario() {
  render(<UsuariosPage />);

  const botonNuevo = await waitFor(() => {
    const boton = screen.getAllByRole("button").find(
      (elemento) =>
        /nuevo usuario|agregar usuario|crear usuario/i.test(
          elemento.textContent ?? "",
        ),
    );

    if (!boton) {
      throw new Error("No se encontró el botón de alta de usuarios");
    }

    return boton;
  });

  fireEvent.click(botonNuevo);

  expect(
    screen.getByRole("heading", {
      name: "Nuevo usuario",
    }),
  ).toBeInTheDocument();
}

function completarFormulario() {
  fireEvent.change(screen.getByLabelText("Nombre"), {
    target: { value: "Ana" },
  });

  fireEvent.change(screen.getByLabelText("Apellido"), {
    target: { value: "Perez" },
  });

  fireEvent.change(screen.getByLabelText("DNI"), {
    target: { value: "12345678" },
  });

  fireEvent.change(
    screen.getByLabelText("Correo electrónico"),
    {
      target: { value: "ana@example.com" },
    },
  );

  fireEvent.change(screen.getByLabelText("Rol"), {
    target: { value: "ALUMNO" },
  });

  fireEvent.change(
    screen.getByLabelText("Contraseña temporal"),
    {
      target: { value: "Temporal123" },
    },
  );
}

describe("UsuariosPage - Alta de usuarios", () => {
  it("muestra los campos del formulario", async () => {
    await abrirFormulario();

    expect(
      screen.getByLabelText("Nombre"),
    ).toBeRequired();

    expect(
      screen.getByLabelText("Apellido"),
    ).toBeRequired();

    expect(
      screen.getByLabelText("DNI"),
    ).toBeRequired();

    expect(
      screen.getByLabelText("Correo electrónico"),
    ).toBeRequired();

    expect(
      screen.getByLabelText("Contraseña temporal"),
    ).toHaveAttribute("minlength", "6");
  });

  it("permite seleccionar el rol ALUMNO", async () => {
    await abrirFormulario();

    const selector = screen.getByLabelText("Rol");

    expect(
      screen.getByRole("option", { name: "ALUMNO" }),
    ).toBeInTheDocument();

    fireEvent.change(selector, {
      target: { value: "ALUMNO" },
    });

    expect(selector).toHaveValue("ALUMNO");
  });

  it("crea un usuario con el rol ALUMNO", async () => {
    await abrirFormulario();

    completarFormulario();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Crear usuario",
      }),
    );

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/autenticacion/usuarios",
        {
          nombre: "Ana",
          apellido: "Perez",
          dni: "12345678",
          correo_electronico: "ana@example.com",
          contrasena: "Temporal123",
          tipo_usuario: "ALUMNO",
        },
        "token-admin-prueba",
      );
    });
  });

  it("muestra el error cuando el correo está duplicado", async () => {
    vi.mocked(api.post).mockRejectedValueOnce(
      new Error(
        "Ya existe un usuario con ese correo",
      ),
    );

    await abrirFormulario();

    completarFormulario();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Crear usuario",
      }),
    );

    expect(
      await screen.findByText(
        "Ya existe un usuario con ese correo",
      ),
    ).toBeInTheDocument();
  });

  it("no envía un formulario con campos vacíos", async () => {
    await abrirFormulario();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Crear usuario",
      }),
    );

    expect(api.post).not.toHaveBeenCalled();
  });
});

function simularUsuarioExistente(activo = true) {
  vi.mocked(api.get).mockImplementation(
    async <T,>(): Promise<T> => {
      return [
        {
          id: "usuario-1",
          nombre: "Ana",
          apellido: "Perez",
          dni: "12345678",
          correo_electronico: "ana@example.com",
          tipo_usuario: "ALUMNO",
          activo,
          debe_cambiar_contrasena: false,
        },
      ] as T;
    },
  );
}

describe("UsuariosPage - Edicion y estado", () => {
  it("permite editar los datos y el rol de un usuario", async () => {
    simularUsuarioExistente();

    render(<UsuariosPage />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Editar",
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: "Editar usuario",
      }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Ana Maria" },
    });

    fireEvent.change(screen.getByLabelText("Rol"), {
      target: { value: "DOCENTE" },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Guardar cambios",
      }),
    );

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/autenticacion/usuarios/usuario-1",
        {
          nombre: "Ana Maria",
          apellido: "Perez",
          dni: "12345678",
          correo_electronico: "ana@example.com",
          tipo_usuario: "DOCENTE",
        },
        "token-admin-prueba",
      );
    });
  });

  it("permite desactivar un usuario", async () => {
    simularUsuarioExistente(true);

    const confirmar = vi
      .spyOn(window, "confirm")
      .mockReturnValue(true);

    render(<UsuariosPage />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Desactivar",
      }),
    );

    confirmar.mockRestore();

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        "/autenticacion/usuarios/usuario-1/estado",
        { activo: false },
        "token-admin-prueba",
      );
    });
  });

  it("permite activar un usuario", async () => {
    simularUsuarioExistente(false);

    const confirmar = vi
      .spyOn(window, "confirm")
      .mockReturnValue(true);

    render(<UsuariosPage />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Activar",
      }),
    );

    confirmar.mockRestore();

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        "/autenticacion/usuarios/usuario-1/estado",
        { activo: true },
        "token-admin-prueba",
      );
    });
  });

  it("no cambia el estado si se cancela", async () => {
    simularUsuarioExistente(true);

    const confirmar = vi
      .spyOn(window, "confirm")
      .mockReturnValue(false);

    render(<UsuariosPage />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Desactivar",
      }),
    );

    confirmar.mockRestore();

    expect(api.patch).not.toHaveBeenCalled();
  });
});
