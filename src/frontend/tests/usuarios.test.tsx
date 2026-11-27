import { MemoryRouter, Routes, Route } from "react-router-dom";

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import DetalleLegajoPage from "../src/modulos/perfiles/conduccion/paginas/DetalleLegajoPage";
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
      id: "admin-prueba",
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
    async <T,>(ruta: string): Promise<T> => {
      return (ruta.endsWith("/candidatos") ? [{id:"legajo-1", nombre:"Ana", apellido:"Perez", dni:"12345678", correo_electronico:"ana@example.com", carrera:"Maestría", numero_seguimiento:"INS-2026-1"}] : []) as T;
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
        numeros_legajo: ["26-001-001"],
        correo_acceso_enviado: true,
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

function confirmarOperacion(
  nombre = "Confirmar guardado"
) {
  fireEvent.click(
    within(screen.getByRole("alertdialog")).getByRole(
      "button",
      { name: nombre }
    )
  );
}

async function completarFormulario() {
  fireEvent.change(screen.getByLabelText("Rol"), { target: { value: "ALUMNO" } });
  await screen.findByRole("option", { name: /Perez, Ana/ });
  fireEvent.change(screen.getByLabelText("Alumno matriculado"), { target: { value: "legajo-1" } });
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

    expect(screen.queryByLabelText("Contraseña temporal")).not.toBeInTheDocument();
    expect(screen.queryByRole("option", {name:"ASPIRANTE"})).not.toBeInTheDocument();
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

    await completarFormulario();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Crear usuario",
      }),
    );

    confirmarOperacion();

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/autenticacion/usuarios",
        {
          nombre: "Ana",
          apellido: "Perez",
          dni: "12345678",
          correo_electronico: "ana@example.com",
          legajo_id: "legajo-1",
          tipo_usuario: "ALUMNO",
        },
        "token-admin-prueba",
      );
    });
  });

  it("muestra el legajo asignado en el listado", async () => {
    vi.mocked(api.get).mockResolvedValueOnce([{id:"usuario-1", nombre:"Ana", apellido:"Pérez", dni:"12345678", correo_electronico:"ana@example.com", tipo_usuario:"ALUMNO", activo:true, debe_cambiar_contrasena:false, numeros_legajo:["26-001-001"]}]);
    render(<UsuariosPage />);
    expect(await screen.findByText("26-001-001")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", {name:"Legajo"})).toBeInTheDocument();
  });

  it("muestra el error cuando el correo está duplicado", async () => {
    vi.mocked(api.post).mockRejectedValueOnce(
      new Error(
        "Ya existe un usuario con ese correo",
      ),
    );

    await abrirFormulario();

    await completarFormulario();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Crear usuario",
      }),
    );

    confirmarOperacion();

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

    confirmarOperacion();

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

render(<UsuariosPage />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Desactivar",
      }),
    );

    expect(api.patch).not.toHaveBeenCalled();

    confirmarOperacion("Confirmar");

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

render(<UsuariosPage />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Activar",
      }),
    );

    expect(api.patch).not.toHaveBeenCalled();

    confirmarOperacion("Confirmar");

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

render(<UsuariosPage />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Desactivar",
      }),
    );

    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole(
        "button",
        { name: "Cancelar" }
      )
    );

    expect(api.patch).not.toHaveBeenCalled();
  });
});

describe("Confirmaciones compartidas de usuarios", () => {
  it("no crea un usuario antes de confirmar", async () => {
    await abrirFormulario();
    await completarFormulario();

    fireEvent.click(
      screen.getByRole("button", { name: "Crear usuario" })
    );

    expect(screen.getByRole("alertdialog"))
      .toBeInTheDocument();

    expect(api.post).not.toHaveBeenCalled();
  });

  it("conserva los datos al cancelar el alta", async () => {
    await abrirFormulario();
    await completarFormulario();

    fireEvent.click(
      screen.getByRole("button", { name: "Crear usuario" })
    );

    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole(
        "button",
        { name: "Cancelar" }
      )
    );

    expect(api.post).not.toHaveBeenCalled();

    expect(screen.getByLabelText("Nombre"))
      .toHaveValue("Ana");

    expect(screen.queryByRole("alertdialog"))
      .not.toBeInTheDocument();
  });

  it("impide confirmar dos veces la misma operación", async () => {
    await abrirFormulario();
    await completarFormulario();

    fireEvent.click(
      screen.getByRole("button", { name: "Crear usuario" })
    );

    const boton = within(
      screen.getByRole("alertdialog")
    ).getByRole("button", {
      name: "Confirmar guardado",
    });

    fireEvent.click(boton);
    fireEvent.click(boton);

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog"))
        .not.toBeInTheDocument();
    });

    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it("no elimina al usuario cuando se cancela", async () => {
    simularUsuarioExistente();

    render(<UsuariosPage />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Eliminar",
      })
    );

    expect(api.delete).not.toHaveBeenCalled();

    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole(
        "button",
        { name: "Cancelar" }
      )
    );

    expect(api.delete).not.toHaveBeenCalled();

    expect(screen.queryByRole("alertdialog"))
      .not.toBeInTheDocument();
  });
});


it("abre el legajo indicado por la notificación administrativa", async () => {
  const candidato = {id:"legajo-1", nombre:"Ana", apellido:"Perez", dni:"12345678", correo_electronico:"ana@example.com", carrera:"Maestría", numero_seguimiento:"INS-2026-1"};
  vi.mocked(api.get).mockImplementation(async <T,>(ruta:string):Promise<T> => (ruta.endsWith("/legajo/legajo-1") ? {...candidato, dni_pasaporte:candidato.dni, carrera_elegida:candidato.carrera, numero_legajo:"26-001-001", estado:"ACTIVO", usuario_id:null, conflicto:false, habilitado:true} : ruta.endsWith("/candidatos") ? [candidato] : []) as T);
  render(<MemoryRouter initialEntries={["/dashboard/administrador/usuarios/legajo/legajo-1"]}><Routes><Route path="/dashboard/administrador/usuarios/legajo/:id" element={<DetalleLegajoPage/>}/></Routes></MemoryRouter>);
  expect(await screen.findByText("26-001-001")).toBeInTheDocument();
  expect(screen.getByRole("heading", {name:"Detalle del legajo"})).toBeInTheDocument();
  expect(screen.getByText("Ana Perez")).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith("/autenticacion/usuarios/legajo/legajo-1", "token-admin-prueba");
  expect(screen.queryByRole("button", {name:"Gestión de inscripción"})).not.toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});


it("no permite eliminar la propia cuenta del administrador", async () => {
  vi.mocked(api.get).mockResolvedValue([{id:"admin-prueba", nombre:"Administrador", apellido:"Prueba", dni:"12345678", correo_electronico:"admin@example.com", tipo_usuario:"ADMIN", activo:true, debe_cambiar_contrasena:false}]);
  render(<UsuariosPage />);
  expect(await screen.findByText("Administrador Prueba")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
  expect(api.delete).not.toHaveBeenCalled();
});
