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

import FormularioInscripcion from
  "../src/modulos/inscripcion/paginas/FormularioInscripcion";

import { api } from "../src/shared/api/client";

import {
  recuperarBorrador,
  guardarBorrador,
  eliminarBorrador,
} from "../src/modulos/inscripcion/borrador";

vi.mock("../src/shared/api/client", () => ({
  api: {
    get: vi.fn(),
    postForm: vi.fn(),
  },
}));

vi.mock("../src/modulos/inscripcion/borrador", () => ({
  recuperarBorrador: vi.fn(),
  guardarBorrador: vi.fn(),
  eliminarBorrador: vi.fn(),
}));

const cohorte = {
  id: "cohorte-1",
  nombre: "Cohorte 2026",
  anio: 2026,
  carrera_id: "carrera-1",
  carrera_nombre: "Especialización de prueba",
};

const datosValidos = {
  dni: "44000000",
  apellido: "Prueba",
  nombre: "Persona",
  email: "persona@example.com",
  tipo_carrera: cohorte.carrera_nombre,
  nacionalidad: "Argentina",
  telefono: "2215551234",
  domicilio: "Calle de prueba",
  pais: "Argentina",
  provincia: "Buenos Aires",
  ciudad: "La Plata",
  titulo_anterior: "Ingeniería",
  universidad_anterior: "UTN",
  correo_alternativo: "",
  forma_conocio_ofertas: "Sitio web",
  motivos_cursar: "Continuar mi formación profesional.",
  solicitud_beca: "",
};

function crearPDF() {
  return new File(
    ["%PDF-1.4"],
    "documento-prueba.pdf",
    { type: "application/pdf" }
  );
}

function prepararBorrador(
  beca = "",
  incluirFormularioBeca = false,
) {
  vi.mocked(recuperarBorrador).mockResolvedValue({
    id: "inscripcion",
    datos: {
      ...datosValidos,
      solicitud_beca: beca,
    },
    documentos: {
      formularioPreinscripcion: crearPDF(),
      formularioInscripcion: crearPDF(),
      dniPasaporte: crearPDF(),
      partidaNacimiento: crearPDF(),
      constanciaCuitCuil: crearPDF(),
      tituloGrado: crearPDF(),
      tituloPosgrado: null,
      formularioBeca: incluirFormularioBeca
        ? crearPDF()
        : null,
    },
    otroPais: "",
    cohorteSeleccionada: cohorte.id,
    etapa: 4,
    actualizadoEn: Date.now(),
  });
}

async function abrirFormularioCompleto() {
  render(<FormularioInscripcion />);

  await waitFor(() => {
    expect(screen.getByLabelText(/^Cohorte/))
      .toHaveValue(cohorte.id);

    expect(screen.getByLabelText(/^Apellido/))
      .toHaveValue(datosValidos.apellido);
  });
}

function avanzar() {
  fireEvent.click(
    screen.getByRole("button", { name: "Siguiente" })
  );
}

function solicitarEnvio() {
  fireEvent.click(
    screen.getByRole("button", {
      name: "Confirmar inscripción",
    })
  );
}

function confirmarEnvio() {
  fireEvent.click(
    within(screen.getByRole("alertdialog"))
      .getByRole("button", {
        name: "Confirmar envío",
      })
  );
}

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(api.get).mockResolvedValue([cohorte]);

  vi.mocked(api.postForm).mockResolvedValue({
    numero_seguimiento: "INS-2026-99",
  });

  vi.mocked(recuperarBorrador)
    .mockResolvedValue(undefined);

  vi.mocked(guardarBorrador)
    .mockResolvedValue(undefined);

  vi.mocked(eliminarBorrador)
    .mockResolvedValue(undefined);
});

describe("Formulario público de inscripción", () => {
  it("consulta las cohortes mediante el cliente compartido", async () => {
    render(<FormularioInscripcion />);

    expect(
      await screen.findByRole("option", {
        name: cohorte.carrera_nombre,
      })
    ).toBeInTheDocument();

    expect(api.get).toHaveBeenCalledWith(
      "/cohortes/disponibles"
    );
  });

  it("informa el error al consultar cohortes", async () => {
    vi.mocked(api.get).mockRejectedValue(
      new Error("Error de conexión")
    );

    render(<FormularioInscripcion />);

    expect(
      await screen.findByText(
        "No se pudieron consultar las carreras disponibles."
      )
    ).toBeInTheDocument();

    expect(api.postForm).not.toHaveBeenCalled();
  });

  it("recupera la cohorte y vuelve a validar los datos", async () => {
    prepararBorrador();

    await abrirFormularioCompleto();

    expect(
      screen.getByLabelText(/^Carrera Elegida/)
    ).toHaveValue(cohorte.carrera_nombre);

    expect(
      screen.queryByRole("button", {
        name: "Confirmar inscripción",
      })
    ).not.toBeInTheDocument();
  });

  it("no permite solicitar beca sin el formulario correspondiente", async () => {
    prepararBorrador("30");

    await abrirFormularioCompleto();

    avanzar();
    avanzar();
    avanzar();

    expect(
      screen.getByText(
        "Debés adjuntar el formulario de beca firmado."
      )
    ).toBeInTheDocument();

    expect(api.postForm).not.toHaveBeenCalled();
  });

  it("solicita confirmación y permite cancelar sin enviar", async () => {
    prepararBorrador();

    await abrirFormularioCompleto();

    avanzar();
    avanzar();
    avanzar();

    solicitarEnvio();

    expect(
      screen.getByRole("alertdialog")
    ).toBeInTheDocument();

    expect(api.postForm).not.toHaveBeenCalled();

    fireEvent.click(
      within(screen.getByRole("alertdialog"))
        .getByRole("button", { name: "Cancelar" })
    );

    expect(
      screen.queryByRole("alertdialog")
    ).not.toBeInTheDocument();

    expect(api.postForm).not.toHaveBeenCalled();
    expect(eliminarBorrador).not.toHaveBeenCalled();
  });

  it("registra una inscripción sin beca y elimina el borrador", async () => {
    prepararBorrador();

    await abrirFormularioCompleto();

    avanzar();
    avanzar();
    avanzar();

    solicitarEnvio();
    confirmarEnvio();

    expect(
      await screen.findByText("INS-2026-99")
    ).toBeInTheDocument();

    expect(api.postForm).toHaveBeenCalledTimes(1);

    const llamada = vi.mocked(api.postForm).mock.calls[0];

    expect(llamada[0]).toBe("/inscripcion/");

    const formulario = llamada[1];

    expect(formulario.get("cohorte_id"))
      .toBe(cohorte.id);

    expect(formulario.get("dni_pasaporte"))
      .toBe(datosValidos.dni);

    expect(formulario.has("solicitud_beca"))
      .toBe(false);

    expect(formulario.get("formularioInscripcion"))
      .toBeInstanceOf(File);

    expect(eliminarBorrador).toHaveBeenCalledTimes(1);

    expect(
      screen.queryByLabelText(/^Apellido/)
    ).not.toBeInTheDocument();
  });

  it("conserva el formulario cuando el servidor rechaza la inscripción", async () => {
    vi.mocked(api.postForm).mockRejectedValue(
      new Error("La inscripción ya existe.")
    );

    prepararBorrador();

    await abrirFormularioCompleto();

    avanzar();
    avanzar();
    avanzar();

    solicitarEnvio();
    confirmarEnvio();

    expect(
      await screen.findByText("La inscripción ya existe.")
    ).toBeInTheDocument();

    expect(eliminarBorrador).not.toHaveBeenCalled();

    expect(
      screen.getByRole("button", {
        name: "Confirmar inscripción",
      })
    ).toBeInTheDocument();
  });

  it("envía una solicitud de beca del 100 con su documento", async () => {
    prepararBorrador("100", true);

    await abrirFormularioCompleto();

    avanzar();
    avanzar();
    avanzar();

    solicitarEnvio();
    confirmarEnvio();

    await screen.findByText("INS-2026-99");

    const formulario =
      vi.mocked(api.postForm).mock.calls[0][1];

    expect(formulario.get("solicitud_beca")).toBe("100");

    expect(formulario.get("formularioBeca"))
      .toBeInstanceOf(File);
  });
});

describe("Validaciones adicionales de inscripción", () => {
  it("impide enviar dos veces una inscripción", async () => {
    let resolver!: (
      resultado: { numero_seguimiento: string }
    ) => void;

    vi.mocked(api.postForm).mockImplementation(
      () => new Promise((resolve) => {
        resolver = resolve;
      })
    );

    prepararBorrador();

    await abrirFormularioCompleto();

    avanzar();
    avanzar();
    avanzar();

    solicitarEnvio();

    const boton = within(
      screen.getByRole("alertdialog")
    ).getByRole("button", {
      name: "Confirmar envío",
    });

    fireEvent.click(boton);
    fireEvent.click(boton);

    expect(api.postForm).toHaveBeenCalledTimes(1);
    expect(boton).toBeDisabled();

    resolver({
      numero_seguimiento: "INS-2026-100",
    });

    expect(
      await screen.findByText("INS-2026-100")
    ).toBeInTheDocument();
  });

  it("envía correctamente una solicitud de beca del 30%", async () => {
    prepararBorrador("30", true);

    await abrirFormularioCompleto();

    avanzar();
    avanzar();
    avanzar();

    solicitarEnvio();
    confirmarEnvio();

    await screen.findByText("INS-2026-99");

    const formulario =
      vi.mocked(api.postForm).mock.calls[0][1];

    expect(formulario.get("solicitud_beca"))
      .toBe("30");

    expect(formulario.get("formularioBeca"))
      .toBeInstanceOf(File);
  });

  it("no permite continuar sin apellido", async () => {
    prepararBorrador();

    await abrirFormularioCompleto();

    fireEvent.change(
      screen.getByLabelText(/^Apellido/),
      { target: { value: "" } }
    );

    avanzar();

    expect(
      screen.getByLabelText(/^Apellido/)
    ).toBeInTheDocument();

    expect(api.postForm).not.toHaveBeenCalled();
  });

  it("rechaza un documento con formato incorrecto", async () => {
    prepararBorrador();

    await abrirFormularioCompleto();

    avanzar();

    const campo = screen.getByLabelText(
      /Copia de DNI o pasaporte/
    );

    fireEvent.change(campo, {
      target: {
        files: [
          new File(
            ["contenido"],
            "documento.txt",
            { type: "text/plain" }
          ),
        ],
      },
    });

    expect(
      screen.getByText(
        "El archivo debe estar en formato PDF."
      )
    ).toBeInTheDocument();

    avanzar();

    expect(
      screen.getByText(
        "Debés adjuntar todos los documentos obligatorios para continuar."
      )
    ).toBeInTheDocument();
  });

  it("rechaza un PDF vacío", async () => {
    prepararBorrador();

    await abrirFormularioCompleto();

    avanzar();

    fireEvent.change(
      screen.getByLabelText(/Copia de DNI o pasaporte/),
      {
        target: {
          files: [
            new File(
              [],
              "documento.pdf",
              { type: "application/pdf" }
            ),
          ],
        },
      }
    );

    expect(
      screen.getByText("El archivo PDF está vacío.")
    ).toBeInTheDocument();

    expect(api.postForm).not.toHaveBeenCalled();
  });

  it("bloquea las modificaciones mientras la confirmación está abierta", async () => {
    prepararBorrador();

    await abrirFormularioCompleto();

    avanzar();
    avanzar();
    avanzar();

    solicitarEnvio();

    const botones = screen.getAllByRole(
      "button",
      { name: "Modificar" }
    );

    botones.forEach((boton) => {
      expect(boton).toBeDisabled();
    });

    expect(api.postForm).not.toHaveBeenCalled();
  });
});

describe("Flujo de becas y recuperación de cohortes", () => {
  it("no muestra el formulario de beca en documentación general", async () => {
    prepararBorrador();

    await abrirFormularioCompleto();

    avanzar();

    expect(
      screen.queryByLabelText(/Formulario de beca firmado/)
    ).not.toBeInTheDocument();
  });

  it("muestra el documento al seleccionar la beca del 30%", async () => {
    prepararBorrador();

    await abrirFormularioCompleto();

    avanzar();
    avanzar();

    expect(
      screen.queryByLabelText(/Formulario de beca firmado/)
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByLabelText("Solicitar beca del 30%")
    );

    expect(
      screen.getByLabelText(/Formulario de beca firmado/)
    ).toBeInTheDocument();
  });

  it("permite cargar el documento de beca sin volver atrás", async () => {
    prepararBorrador();

    await abrirFormularioCompleto();

    avanzar();
    avanzar();

    fireEvent.click(
      screen.getByLabelText("Solicitar beca del 100%")
    );

    fireEvent.change(
      screen.getByLabelText(/Formulario de beca firmado/),
      {
        target: {
          files: [crearPDF()],
        },
      }
    );

    avanzar();

    solicitarEnvio();
    confirmarEnvio();

    await screen.findByText("INS-2026-99");

    const formulario =
      vi.mocked(api.postForm).mock.calls[0][1];

    expect(formulario.get("solicitud_beca"))
      .toBe("100");

    expect(formulario.get("formularioBeca"))
      .toBeInstanceOf(File);
  });

  it("elimina el documento cuando se cancela la solicitud de beca", async () => {
    prepararBorrador("30", true);

    await abrirFormularioCompleto();

    avanzar();
    avanzar();

    fireEvent.click(
      screen.getByLabelText("No solicitar beca")
    );

    expect(
      screen.queryByLabelText(/Formulario de beca firmado/)
    ).not.toBeInTheDocument();

    avanzar();

    solicitarEnvio();
    confirmarEnvio();

    await screen.findByText("INS-2026-99");

    const formulario =
      vi.mocked(api.postForm).mock.calls[0][1];

    expect(formulario.has("solicitud_beca"))
      .toBe(false);

    expect(formulario.has("formularioBeca"))
      .toBe(false);
  });

  it("permite reintentar la consulta de cohortes después de un error", async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce(new Error("Sin conexión"))
      .mockResolvedValueOnce([cohorte]);

    render(<FormularioInscripcion />);

    const reintentar = await screen.findByRole(
      "button",
      { name: "Reintentar" }
    );

    fireEvent.click(reintentar);

    expect(
      await screen.findByRole("option", {
        name: cohorte.carrera_nombre,
      })
    ).toBeInTheDocument();

    expect(api.get).toHaveBeenCalledTimes(2);

    expect(
      screen.queryByRole("button", {
        name: "Reintentar",
      })
    ).not.toBeInTheDocument();
  });

  it("impide avanzar cuando no hay cohortes disponibles", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    render(<FormularioInscripcion />);

    expect(
      await screen.findByText(
        "No hay cohortes abiertas para inscripción."
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Siguiente",
      })
    ).toBeDisabled();

    expect(api.postForm).not.toHaveBeenCalled();
  });
});

describe("Datos personales de inscripción", () => {
  it("rechaza nombres que contienen únicamente espacios", async () => {
    prepararBorrador();

    await abrirFormularioCompleto();

    fireEvent.change(
      screen.getByLabelText(/^Apellido/),
      { target: { value: "   " } }
    );

    avanzar();

    expect(
      screen.getByText("Completá el campo apellido.")
    ).toBeInTheDocument();

    expect(api.postForm).not.toHaveBeenCalled();
  });

  it("permite ingresar una provincia extranjera", async () => {
    prepararBorrador();

    await abrirFormularioCompleto();

    fireEvent.change(
      screen.getByLabelText(/^País/),
      { target: { value: "Otro" } }
    );

    fireEvent.change(
      screen.getByLabelText(/Especificá el país/),
      { target: { value: "Italia" } }
    );

    const provincia = screen.getByRole("textbox", {
      name: /^Provincia/,
    });

    fireEvent.change(provincia, {
      target: { value: "Lombardía" },
    });

    expect(provincia).toHaveValue("Lombardía");
  });

  it("envía el pasaporte normalizado", async () => {
    prepararBorrador();

    await abrirFormularioCompleto();

    fireEvent.change(
      screen.getByLabelText(/^DNI o Pasaporte/),
      { target: { value: "ab123456" } }
    );

    avanzar();
    avanzar();
    avanzar();

    solicitarEnvio();
    confirmarEnvio();

    await screen.findByText("INS-2026-99");

    const formulario =
      vi.mocked(api.postForm).mock.calls[0][1];

    expect(formulario.get("dni_pasaporte"))
      .toBe("AB123456");
  });
});

describe("Persistencia de borradores", () => {
  it("informa que los datos se guardan en el navegador", async () => {
    render(<FormularioInscripcion />);

    expect(
      screen.getByText(/Los datos y documentos se guardan/)
    ).toBeInTheDocument();

    await screen.findByLabelText(/^Apellido/);
  });

  it("no guarda un formulario completamente vacío", async () => {
    render(<FormularioInscripcion />);

    await screen.findByLabelText(/^Apellido/);

    await new Promise((resolve) =>
      setTimeout(resolve, 650)
    );

    expect(guardarBorrador).not.toHaveBeenCalled();
  });

  it("guarda los datos modificados y la cohorte seleccionada", async () => {
    prepararBorrador();

    await abrirFormularioCompleto();

    fireEvent.change(
      screen.getByLabelText(/^Apellido/),
      { target: { value: "Nuevo apellido" } }
    );

    await waitFor(() => {
      expect(guardarBorrador).toHaveBeenCalledWith(
        expect.objectContaining({
          cohorteSeleccionada: cohorte.id,
          datos: expect.objectContaining({
            apellido: "Nuevo apellido",
          }),
        })
      );
    }, { timeout: 2000 });
  });
});

describe("Eliminación de borradores", () => {
  async function solicitarDescarte() {
    prepararBorrador();

    await abrirFormularioCompleto();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Descartar borrador",
      })
    );

    return screen.getByRole("alertdialog");
  }

  it("no muestra la opción de descartar un formulario vacío", async () => {
    render(<FormularioInscripcion />);

    await screen.findByLabelText(/^Apellido/);

    expect(
      screen.queryByRole("button", {
        name: "Descartar borrador",
      })
    ).not.toBeInTheDocument();
  });

  it("permite cancelar sin eliminar los datos", async () => {
    const modal = await solicitarDescarte();

    expect(eliminarBorrador).not.toHaveBeenCalled();

    fireEvent.click(
      within(modal).getByRole("button", {
        name: "Cancelar",
      })
    );

    expect(eliminarBorrador).not.toHaveBeenCalled();

    expect(
      screen.getByLabelText(/^Apellido/)
    ).toHaveValue(datosValidos.apellido);

    expect(
      screen.queryByRole("alertdialog")
    ).not.toBeInTheDocument();
  });

  it("elimina el borrador y limpia el formulario al confirmar", async () => {
    const modal = await solicitarDescarte();

    fireEvent.click(
      within(modal).getByRole("button", {
        name: "Eliminar borrador",
      })
    );

    await waitFor(() => {
      expect(
        screen.getByLabelText(/^Apellido/)
      ).toHaveValue("");
    });

    expect(eliminarBorrador).toHaveBeenCalledTimes(1);

    expect(
      screen.getByLabelText(/^Cohorte/)
    ).toHaveValue("");

    expect(
      screen.getByLabelText(/^Carrera Elegida/)
    ).toHaveValue("");

    expect(api.postForm).not.toHaveBeenCalled();
  });

  it("conserva los datos cuando falla la eliminación", async () => {
    vi.mocked(eliminarBorrador).mockRejectedValue(
      new Error("Error de almacenamiento")
    );

    const modal = await solicitarDescarte();

    fireEvent.click(
      within(modal).getByRole("button", {
        name: "Eliminar borrador",
      })
    );

    expect(
      await screen.findByText(
        "No se pudo descartar el borrador. Intentá nuevamente."
      )
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/^Apellido/)
    ).toHaveValue(datosValidos.apellido);

    expect(api.postForm).not.toHaveBeenCalled();
  });

  it("no permite eliminar el mismo borrador dos veces simultáneamente", async () => {
    let resolver!: () => void;

    vi.mocked(eliminarBorrador).mockImplementation(
      () => new Promise<void>((resolve) => {
        resolver = resolve;
      })
    );

    const modal = await solicitarDescarte();

    const boton = within(modal).getByRole(
      "button",
      { name: "Eliminar borrador" }
    );

    fireEvent.click(boton);
    fireEvent.click(boton);

    await waitFor(() => {
      expect(eliminarBorrador).toHaveBeenCalledTimes(1);
    });

    expect(boton).toBeDisabled();

    resolver();

    await waitFor(() => {
      expect(
        screen.getByLabelText(/^Apellido/)
      ).toHaveValue("");
    });
  });
});

describe("Concurrencia del guardado de inscripción", () => {
  it("espera el guardado pendiente antes de eliminar el borrador", async () => {
    let terminarGuardado!: () => void;

    vi.mocked(guardarBorrador).mockImplementation(
      () => new Promise<void>((resolve) => {
        terminarGuardado = resolve;
      })
    );

    prepararBorrador();

    await abrirFormularioCompleto();

    await waitFor(() => {
      expect(guardarBorrador).toHaveBeenCalledTimes(1);
    }, { timeout: 2000 });

    avanzar();
    avanzar();
    avanzar();

    solicitarEnvio();
    confirmarEnvio();

    await waitFor(() => {
      expect(api.postForm).toHaveBeenCalledTimes(1);
    });

    expect(eliminarBorrador).not.toHaveBeenCalled();

    terminarGuardado();

    expect(
      await screen.findByText("INS-2026-99")
    ).toBeInTheDocument();

    expect(eliminarBorrador).toHaveBeenCalledTimes(1);

    await new Promise((resolve) =>
      setTimeout(resolve, 650)
    );

    expect(guardarBorrador).toHaveBeenCalledTimes(1);
  });
});
