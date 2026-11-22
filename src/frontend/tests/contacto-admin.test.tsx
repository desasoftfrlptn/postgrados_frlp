import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";

import ContactoAdmin from "../src/modulos/perfiles/administrador/home/secciones/ContactoAdmin";

import {
  obtenerConfiguracionContacto,
  actualizarConfiguracionContacto,
  restablecerConfiguracionContacto,
} from "../src/shared/api/contacto";

vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "admin-1",
      rol: "ADMIN",
      token: "token-prueba",
    },
  }),
}));

vi.mock("../src/shared/api/contacto", () => ({
  obtenerConfiguracionContacto: vi.fn(),
  actualizarConfiguracionContacto: vi.fn(),
  restablecerConfiguracionContacto: vi.fn(),
}));

const valoresIniciales = {
  titulo: "Contacto",
  descripcion: "Información institucional",
  formulario_titulo: "Envianos tu consulta",
  formulario_descripcion: "Completá el formulario",
  direccion: "Calle 60 y 124",
  email: "posgrado@example.com",
  telefono: "+54 221 4277270",
  horario: "Lunes a viernes",
  facebook: "",
  instagram: "",
  linkedin: "",
  youtube: "",
};

const obtener = vi.mocked(
  obtenerConfiguracionContacto
);

const actualizar = vi.mocked(
  actualizarConfiguracionContacto
);

const restablecer = vi.mocked(
  restablecerConfiguracionContacto
);

async function comenzarEdicion() {
  render(<ContactoAdmin />);

  fireEvent.click(
    await screen.findByRole("button", {
      name: "Modificar",
    })
  );
}

function modificarDireccion(valor: string) {
  fireEvent.change(
    screen.getByLabelText(/^Dirección/),
    {
      target: { value: valor },
    }
  );
}

function solicitarGuardado() {
  fireEvent.click(
    screen.getByRole("button", {
      name: "Guardar cambios",
    })
  );
}

function confirmarGuardado() {
  const modal = screen.getByRole("alertdialog");

  fireEvent.click(
    within(modal).getByRole("button", {
      name: "Confirmar guardado",
    })
  );
}

beforeEach(() => {
  vi.resetAllMocks();

  obtener.mockResolvedValue({
    seccion: "contacto",
    valores: { ...valoresIniciales },
  });

  actualizar.mockImplementation(async (valores) => ({
    seccion: "contacto",
    valores,
  }));
});

describe("Administración de contacto", () => {
  it("muestra los datos guardados en modo lectura", async () => {
    render(<ContactoAdmin />);

    const direccion = await screen.findByDisplayValue(
      valoresIniciales.direccion
    );

    expect(direccion).toBeDisabled();

    expect(
      screen.getByRole("button", {
        name: "Modificar",
      })
    ).toBeEnabled();
  });

  it("habilita los campos al comenzar la edición", async () => {
    await comenzarEdicion();

    expect(
      screen.getByLabelText(/^Dirección/)
    ).toBeEnabled();

    expect(
      screen.getByRole("button", {
        name: "Guardar cambios",
      })
    ).toBeDisabled();
  });

  it("rechaza campos obligatorios vacíos", async () => {
    await comenzarEdicion();

    modificarDireccion("   ");
    solicitarGuardado();

    expect(
      screen.getByText("Este campo es obligatorio.")
    ).toBeInTheDocument();

    expect(actualizar).not.toHaveBeenCalled();

    expect(
      screen.queryByRole("alertdialog")
    ).not.toBeInTheDocument();
  });

  it("rechaza un correo electrónico inválido", async () => {
    await comenzarEdicion();

    fireEvent.change(
      screen.getByLabelText(/^Correo electrónico/),
      {
        target: { value: "correo-invalido" },
      }
    );

    solicitarGuardado();

    expect(
      screen.getByText(
        "Ingresá un correo electrónico válido."
      )
    ).toBeInTheDocument();

    expect(actualizar).not.toHaveBeenCalled();
  });

  it("rechaza un enlace de red social inválido", async () => {
    await comenzarEdicion();

    fireEvent.change(
      screen.getByLabelText("Instagram"),
      {
        target: { value: "javascript:alert(1)" },
      }
    );

    solicitarGuardado();

    expect(
      screen.getByText(
        "Ingresá un enlace HTTP o HTTPS válido."
      )
    ).toBeInTheDocument();

    expect(actualizar).not.toHaveBeenCalled();
  });

  it("no guarda cambios antes de confirmar", async () => {
    await comenzarEdicion();

    modificarDireccion("Nueva dirección");
    solicitarGuardado();

    expect(
      screen.getByRole("alertdialog")
    ).toBeInTheDocument();

    expect(actualizar).not.toHaveBeenCalled();
  });

  it("permite cancelar el modal sin enviar una petición", async () => {
    await comenzarEdicion();

    modificarDireccion("Nueva dirección");
    solicitarGuardado();

    fireEvent.click(
      within(
        screen.getByRole("alertdialog")
      ).getByRole("button", {
        name: "Volver",
      })
    );

    expect(actualizar).not.toHaveBeenCalled();

    expect(
      screen.getByLabelText(/^Dirección/)
    ).toHaveValue("Nueva dirección");

    expect(
      screen.queryByRole("alertdialog")
    ).not.toBeInTheDocument();
  });

  it("guarda los cambios después de confirmar", async () => {
    await comenzarEdicion();

    modificarDireccion("  Nueva dirección  ");
    solicitarGuardado();
    confirmarGuardado();

    await waitFor(() => {
      expect(actualizar).toHaveBeenCalledOnce();
    });

    expect(actualizar).toHaveBeenCalledWith(
      {
        ...valoresIniciales,
        direccion: "Nueva dirección",
      },
      "token-prueba"
    );

    expect(
      await screen.findByText(
        "La información de contacto fue actualizada correctamente."
      )
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/^Dirección/)
    ).toBeDisabled();
  });

  it("descarta los cambios únicamente después de confirmar", async () => {
    await comenzarEdicion();

    modificarDireccion("Nueva dirección");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Cancelar",
      })
    );

    fireEvent.click(
      within(
        screen.getByRole("alertdialog")
      ).getByRole("button", {
        name: "Descartar cambios",
      })
    );

    expect(
      screen.getByLabelText(/^Dirección/)
    ).toHaveValue(valoresIniciales.direccion);

    expect(
      screen.getByLabelText(/^Dirección/)
    ).toBeDisabled();

    expect(actualizar).not.toHaveBeenCalled();
  });

  it("conserva los cambios si falla el guardado", async () => {
    actualizar.mockRejectedValueOnce(
      new Error("Error del servidor")
    );

    await comenzarEdicion();

    modificarDireccion("Nueva dirección");
    solicitarGuardado();
    confirmarGuardado();

    expect(
      await screen.findByText("Error del servidor")
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/^Dirección/)
    ).toHaveValue("Nueva dirección");

    expect(
      screen.getByLabelText(/^Dirección/)
    ).toBeEnabled();

    expect(
      screen.queryByText(
        "La información de contacto fue actualizada correctamente."
      )
    ).not.toBeInTheDocument();
  });

  it("permite reintentar cuando falla la carga", async () => {
    obtener.mockRejectedValueOnce(
      new Error("Sin conexión")
    );

    render(<ContactoAdmin />);

    expect(
      await screen.findByText("Sin conexión")
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Reintentar",
      })
    );

    expect(
      await screen.findByDisplayValue(
        valoresIniciales.direccion
      )
    ).toBeInTheDocument();

    expect(obtener).toHaveBeenCalledTimes(2);
  });

  it("permite guardar redes sociales opcionales", async () => {
    await comenzarEdicion();

    fireEvent.change(
      screen.getByLabelText("Instagram"),
      {
        target: {
          value: "https://www.instagram.com/utn",
        },
      }
    );

    solicitarGuardado();
    confirmarGuardado();

    await waitFor(() => {
      expect(actualizar).toHaveBeenCalledWith(
        {
          ...valoresIniciales,
          instagram: "https://www.instagram.com/utn",
        },
        "token-prueba"
      );
    });
  });
});

describe("Restablecimiento de contacto", () => {
  async function solicitarRestablecimiento() {
    render(<ContactoAdmin />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Restablecer configuración predeterminada",
      })
    );
  }

  function confirmarRestablecimiento() {
    fireEvent.click(
      within(
        screen.getByRole("alertdialog")
      ).getByRole("button", {
        name: "Restablecer configuración",
      })
    );
  }

  it("muestra la opción de restablecer en modo lectura", async () => {
    render(<ContactoAdmin />);

    expect(
      await screen.findByRole("button", {
        name: "Restablecer configuración predeterminada",
      })
    ).toBeEnabled();
  });

  it("no permite restablecer mientras se está editando", async () => {
    await comenzarEdicion();

    expect(
      screen.queryByRole("button", {
        name: "Restablecer configuración predeterminada",
      })
    ).not.toBeInTheDocument();
  });

  it("solicita confirmación antes de restablecer", async () => {
    await solicitarRestablecimiento();

    expect(
      screen.getByRole("alertdialog")
    ).toBeInTheDocument();

    expect(restablecer).not.toHaveBeenCalled();
  });

  it("no realiza peticiones cuando se cancela", async () => {
    await solicitarRestablecimiento();

    fireEvent.click(
      within(
        screen.getByRole("alertdialog")
      ).getByRole("button", {
        name: "Volver",
      })
    );

    expect(restablecer).not.toHaveBeenCalled();
    expect(actualizar).not.toHaveBeenCalled();

    expect(
      screen.queryByRole("alertdialog")
    ).not.toBeInTheDocument();
  });

  it("restablece y muestra los valores devueltos por el Backend", async () => {
    obtener.mockResolvedValueOnce({
      seccion: "contacto",
      valores: {
        ...valoresIniciales,
        direccion: "Dirección modificada",
        instagram: "https://www.instagram.com/utn",
      },
    });

    restablecer.mockResolvedValueOnce({
      seccion: "contacto",
      valores: { ...valoresIniciales },
    });

    await solicitarRestablecimiento();
    confirmarRestablecimiento();

    expect(
      await screen.findByText(
        "Se restableció la configuración predeterminada de contacto."
      )
    ).toBeInTheDocument();

    expect(restablecer).toHaveBeenCalledExactlyOnceWith(
      "token-prueba"
    );

    expect(actualizar).not.toHaveBeenCalled();

    expect(
      screen.getByLabelText(/^Dirección/)
    ).toHaveValue(valoresIniciales.direccion);

    expect(
      screen.getByLabelText("Instagram")
    ).toHaveValue("");

    expect(
      screen.getByLabelText(/^Dirección/)
    ).toBeDisabled();
  });

  it("conserva los datos si falla el restablecimiento", async () => {
    obtener.mockResolvedValueOnce({
      seccion: "contacto",
      valores: {
        ...valoresIniciales,
        direccion: "Dirección modificada",
      },
    });

    restablecer.mockRejectedValueOnce(
      new Error("No se pudo restablecer")
    );

    await solicitarRestablecimiento();
    confirmarRestablecimiento();

    expect(
      await screen.findByText(
        "No se pudo restablecer"
      )
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/^Dirección/)
    ).toHaveValue("Dirección modificada");
  });
});