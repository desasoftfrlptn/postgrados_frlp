import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  beforeEach,
  expect,
  it,
  vi,
} from "vitest";

import GestionInscripcion from "../src/modulos/perfiles/conduccion/componentes/GestionInscripcion";
import { api } from "../src/shared/api/client";

vi.mock("../src/shared/api/client", () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({
  useAuth: () => ({
    user: {
      token: "token-prueba",
      rol: "COORDINADOR",
    },
  }),
}));

interface GestionPrueba {
  legajo_id: string;
  estado: string;
  numero_legajo: string | null;
  datos_verificados: boolean;
  tiene_titulo_posgrado: boolean | null;
  fecha_aprobacion: string | null;
  fecha_matricula: string | null;
  fecha_baja: string | null;
  observaciones: string | null;
  documentacion_a_corregir: string[];
}

let gestionActual: GestionPrueba;

beforeEach(() => {
  gestionActual = {
    legajo_id: "legajo-1",
    estado: "PENDIENTE",
    numero_legajo: null,
    datos_verificados: false,
    tiene_titulo_posgrado: null,
    fecha_aprobacion: null,
    fecha_matricula: null,
    fecha_baja: null,
    observaciones: null,
    documentacion_a_corregir: [],
  };

  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
  vi.mocked(api.put).mockReset();

  vi.mocked(api.get).mockImplementation(
    async <T,>(ruta: string): Promise<T> => {
      let respuesta: unknown;

      if (ruta.endsWith("/gestion")) {
        respuesta = { ...gestionActual };
      } else if (ruta.endsWith("/completitud")) {
        respuesta = {
          legajo_id: "legajo-1",
          completitud: null,
          pendiente: "Verificar título de posgrado.",
        };
      } else if (ruta.endsWith("/auditoria")) {
        respuesta = [];
      } else {
        throw new Error(`Ruta no simulada: ${ruta}`);
      }

      return respuesta as T;
    },
  );

  vi.mocked(api.post).mockImplementation(
    async <T,>(): Promise<T> => {
      gestionActual = {
        ...gestionActual,
        estado: "EN_REVISION",
      };

      return { ...gestionActual } as T;
    },
  );

  vi.mocked(api.put).mockImplementation(
    async <T,>(): Promise<T> => {
      gestionActual = {
        ...gestionActual,
        datos_verificados: true,
        tiene_titulo_posgrado: false,
      };

      return { ...gestionActual } as T;
    },
  );

});

async function obtenerBotonRevision() {
  const boton = await screen.findByRole("button", {
    name: "Iniciar revisión",
  });

  await waitFor(() => {
    expect(boton).toBeEnabled();
  });

  return boton;
}


async function confirmarModal() {
  const modal = await screen.findByRole("alertdialog");

  fireEvent.click(
    within(modal).getByRole("button", {
      name: "Confirmar",
    }),
  );
}

it("consulta la gestión usando el token", async () => {
  render(<GestionInscripcion legajoId="legajo-1" />);

  expect(
    await screen.findByText("Pendiente de revisión"),
  ).toBeInTheDocument();

  expect(api.get).toHaveBeenCalledWith(
    "/conduccion/legajos/legajo-1/gestion",
    "token-prueba",
  );
});

it("envía la acción y actualiza el estado", async () => {
  const onEstadoActualizado = vi.fn();

  render(
    <GestionInscripcion
      legajoId="legajo-1"
      onEstadoActualizado={onEstadoActualizado}
    />,
  );

  fireEvent.click(await obtenerBotonRevision());
  await confirmarModal();


  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith(
      "/conduccion/legajos/legajo-1/acciones",
      {
        accion: "REVISAR",
        estado_esperado: "PENDIENTE",
        comentario: null,
        documentacion_a_corregir: [],
      },
      "token-prueba",
    );
  });

  expect(
    await screen.findByText("Operación registrada."),
  ).toBeInTheDocument();

  expect(screen.getByText("En revisión")).toBeInTheDocument();

  expect(onEstadoActualizado).toHaveBeenCalledWith(
    "EN_REVISION",
  );
});

it("no ejecuta la acción si se cancela", async () => {
  render(<GestionInscripcion legajoId="legajo-1" />);

  fireEvent.click(await obtenerBotonRevision());

  const modal = await screen.findByRole("alertdialog");

  expect(api.post).not.toHaveBeenCalled();

  fireEvent.click(
    within(modal).getByRole("button", {
      name: "Cancelar",
    }),
  );

  expect(
    screen.queryByRole("alertdialog"),
  ).not.toBeInTheDocument();

  expect(api.post).not.toHaveBeenCalled();
});

it("muestra el error del servidor", async () => {
  vi.mocked(api.post).mockRejectedValueOnce(
    new Error("El estado del legajo cambió."),
  );

  render(<GestionInscripcion legajoId="legajo-1" />);

  fireEvent.click(await obtenerBotonRevision());
  await confirmarModal();


  expect(
    await screen.findByRole("alert"),
  ).toHaveTextContent("El estado del legajo cambió.");
});

it("guarda la verificación", async () => {
  gestionActual.estado = "EN_REVISION";
  render(<GestionInscripcion legajoId="legajo-1" />);

  await screen.findByRole("button", {
    name: "Guardar avances",
  });

  fireEvent.click(
    screen.getByRole("checkbox", {
      name: /Revisé los datos personales y académicos/,
    }),
  );

  fireEvent.change(
    screen.getByRole("combobox", {
      name: /¿Tiene título de posgrado\?/,
    }),
    { target: { value: "no" } },
  );

  fireEvent.click(
    screen.getByRole("button", {
      name: "Guardar avances",
    }),
  );

  await confirmarModal();

  await waitFor(() => {
    expect(api.put).toHaveBeenCalledWith(
      "/conduccion/legajos/legajo-1/verificacion",
      {
        datos_verificados: true,
        tiene_titulo_posgrado: false,
      },
      "token-prueba",
    );
  });

  expect(
    await screen.findByText("Verificación guardada."),
  ).toBeInTheDocument();
});

it("exige observación o documentos para solicitar correcciones", async () => {
  gestionActual.estado = "EN_REVISION";

  render(<GestionInscripcion legajoId="legajo-1" />);

  const boton = await screen.findByRole("button", {
    name: "Solicitar correcciones",
  });

  await waitFor(() => {
    expect(boton).toBeEnabled();
  });

  fireEvent.click(boton);

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Escribí una observación o seleccioná un documento para corregir.",
  );

  expect(api.post).not.toHaveBeenCalled();
});

it("permite reintentar una consulta fallida", async () => {
  vi.mocked(api.get).mockRejectedValueOnce(
    new Error("No se pudo conectar."),
  );

  render(<GestionInscripcion legajoId="legajo-1" />);

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "No se pudo conectar.",
  );

  fireEvent.click(
    screen.getByRole("button", {
      name: "Actualizar gestión",
    }),
  );

  expect(
    await screen.findByText("Pendiente de revisión"),
  ).toBeInTheDocument();
});


it("envía una observación con comentario", async () => {
  gestionActual.estado = "EN_REVISION";

  vi.mocked(api.post).mockImplementationOnce(async <T,>() => {
    gestionActual.estado = "OBSERVADO";
    gestionActual.observaciones = "Falta el título";
    return { ...gestionActual } as T;
  });

  render(<GestionInscripcion legajoId="legajo-1" />);

  const boton = await screen.findByRole("button", {
    name: "Solicitar correcciones",
  });

  fireEvent.change(
    screen.getByRole("textbox", {
      name: "Observaciones para el aspirante",
    }),
    { target: { value: "Falta el título" } },
  );

  await waitFor(() => expect(boton).toBeEnabled());
  fireEvent.click(boton);
  await confirmarModal();


  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith(
      "/conduccion/legajos/legajo-1/acciones",
      {
        accion: "OBSERVAR",
        estado_esperado: "EN_REVISION",
        comentario: "Falta el título",
        documentacion_a_corregir: [],
      },
      "token-prueba",
    );
  });

  expect(await screen.findByText("Requiere correcciones")).toBeInTheDocument();
});

it("permite solicitar correcciones documentales sin comentario", async () => {
  gestionActual.estado = "EN_REVISION";
  vi.mocked(api.post).mockImplementationOnce(async <T,>() => {
    gestionActual.estado = "OBSERVADO";
    gestionActual.documentacion_a_corregir = ["DNI_PASAPORTE"];
    return { ...gestionActual } as T;
  });

  render(<GestionInscripcion legajoId="legajo-1" />);
  const boton = await screen.findByRole("button", {
    name: "Solicitar correcciones",
  });
  await waitFor(() => expect(boton).toBeEnabled());
  fireEvent.click(screen.getByRole("checkbox", { name: "DNI o pasaporte" }));
  fireEvent.click(boton);
  await confirmarModal();


  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith(
      "/conduccion/legajos/legajo-1/acciones",
      {
        accion: "OBSERVAR",
        estado_esperado: "EN_REVISION",
        comentario: null,
        documentacion_a_corregir: ["DNI_PASAPORTE"],
      },
      "token-prueba",
    );
  });
  expect(await screen.findByText("Requiere correcciones")).toBeInTheDocument();
});

it("no modifica el estado antes de confirmar", async () => {
  render(<GestionInscripcion legajoId="legajo-1" />);

  fireEvent.click(await obtenerBotonRevision());

  expect(
    await screen.findByRole("alertdialog"),
  ).toBeInTheDocument();

  expect(api.post).not.toHaveBeenCalled();
  expect(api.put).not.toHaveBeenCalled();
});


it("evita enviar dos veces la misma operación", async () => {
  render(<GestionInscripcion legajoId="legajo-1" />);

  fireEvent.click(await obtenerBotonRevision());

  const modal = await screen.findByRole("alertdialog");

  const confirmar = within(modal).getByRole("button", {
    name: "Confirmar",
  });

  fireEvent.click(confirmar);
  fireEvent.click(confirmar);

  expect(
    await screen.findByText("Operación registrada."),
  ).toBeInTheDocument();

  expect(api.post).toHaveBeenCalledTimes(1);
});


it("cancela la verificación sin guardar los cambios", async () => {
  gestionActual.estado = "EN_REVISION";
  render(<GestionInscripcion legajoId="legajo-1" />);

  await screen.findByRole("button", {
    name: "Guardar avances",
  });

  fireEvent.change(
    screen.getByRole("combobox", {
      name: /¿Tiene título de posgrado\?/,
    }),
    { target: { value: "no" } },
  );

  fireEvent.click(
    screen.getByRole("button", {
      name: "Guardar avances",
    }),
  );

  const modal = await screen.findByRole("alertdialog");

  fireEvent.click(
    within(modal).getByRole("button", {
      name: "Cancelar",
    }),
  );

  expect(api.put).not.toHaveBeenCalled();

  expect(
    screen.queryByRole("alertdialog"),
  ).not.toBeInTheDocument();
});


it("permite cancelar una operación mediante Escape", async () => {
  render(<GestionInscripcion legajoId="legajo-1" />);

  fireEvent.click(await obtenerBotonRevision());

  await screen.findByRole("alertdialog");

  fireEvent.keyDown(document, {
    key: "Escape",
  });

  expect(
    screen.queryByRole("alertdialog"),
  ).not.toBeInTheDocument();

  expect(api.post).not.toHaveBeenCalled();
});
it("consulta la completitud documental usando el token", async () => {
  render(<GestionInscripcion legajoId="legajo-1" />);

  await obtenerBotonRevision();

  expect(api.get).toHaveBeenCalledWith(
    "/conduccion/legajos/legajo-1/completitud",
    "token-prueba",
  );
});

it("impide aprobar si faltan requisitos", async () => {
  gestionActual.estado = "EN_REVISION";

  render(<GestionInscripcion legajoId="legajo-1" />);

  const boton = await screen.findByRole("button", {
    name: "Aprobar inscripción",
  });

  expect(boton).toBeDisabled();
  expect(api.post).not.toHaveBeenCalled();
});

it("actualiza la completitud después de guardar la verificación", async () => {
  gestionActual.estado = "EN_REVISION";
  render(<GestionInscripcion legajoId="legajo-1" />);

  await screen.findByRole("button", {
    name: "Guardar avances",
  });

  fireEvent.change(
    screen.getByRole("combobox", {
      name: /¿Tiene título de posgrado\?/,
    }),
    { target: { value: "no" } },
  );

  fireEvent.click(
    screen.getByRole("button", {
      name: "Guardar avances",
    }),
  );

  await confirmarModal();

  expect(
    await screen.findByText("Verificación guardada."),
  ).toBeInTheDocument();

  const consultas = vi.mocked(api.get).mock.calls.filter(
    ([ruta]) => ruta.endsWith("/completitud"),
  );

  expect(consultas).toHaveLength(2);
});

function prepararAprobacion(documentacionCompleta = true) {
  gestionActual = {
    ...gestionActual,
    estado: "EN_REVISION",
    datos_verificados: true,
    tiene_titulo_posgrado: false,
  };

  const consultaOriginal =
    vi.mocked(api.get).getMockImplementation();

  vi.mocked(api.get).mockImplementation(
    async <T,>(ruta: string, token?: string): Promise<T> => {
      if (ruta.endsWith("/completitud")) {
        return {
          legajo_id: "legajo-1",
          pendiente: null,
          completitud: {
            porcentaje: documentacionCompleta ? 100 : 83,
            documentos_requeridos: 6,
            documentos_presentados: documentacionCompleta ? 6 : 5,
            documentos_faltantes: documentacionCompleta
              ? []
              : ["Título de grado"],
            completo: documentacionCompleta,
          },
        } as T;
      }

      if (!consultaOriginal) {
        throw new Error("Consulta no configurada.");
      }

      return consultaOriginal(ruta, token) as Promise<T>;
    },
  );
}

it("habilita la aprobación con todos los requisitos completos", async () => {
  prepararAprobacion();

  render(<GestionInscripcion legajoId="legajo-1" />);

  expect(
    await screen.findByRole("button", {
      name: "Aprobar inscripción",
    }),
  ).toBeEnabled();

  expect(
    screen.getByRole("progressbar", {
      name: "Completitud documental",
    }),
  ).toHaveAttribute("value", "100");

  expect(api.post).not.toHaveBeenCalled();
});

it("aprueba la inscripción después de confirmar", async () => {
  prepararAprobacion();

  vi.mocked(api.post).mockImplementation(
    async <T,>(): Promise<T> => {
      gestionActual = {
        ...gestionActual,
        estado: "COMPLETADO",
        numero_legajo: "26-001-001",
      };

      return { ...gestionActual } as T;
    },
  );

  render(<GestionInscripcion legajoId="legajo-1" />);

  fireEvent.click(
    await screen.findByRole("button", {
      name: "Aprobar inscripción",
    }),
  );

  expect(api.post).not.toHaveBeenCalled();

  await confirmarModal();

  expect(api.post).toHaveBeenCalledWith(
    "/conduccion/legajos/legajo-1/acciones",
    {
      accion: "APROBAR",
      estado_esperado: "EN_REVISION",
      comentario: null,
      documentacion_a_corregir: [],
    },
    "token-prueba",
  );

  expect(
    await screen.findByText("Aprobada"),
  ).toBeInTheDocument();

  expect(api.post).toHaveBeenCalledTimes(1);
});

it("impide aprobar con documentación incompleta", async () => {
  prepararAprobacion(false);

  render(<GestionInscripcion legajoId="legajo-1" />);

  expect(
    await screen.findByRole("button", {
      name: "Aprobar inscripción",
    }),
  ).toBeDisabled();

  expect(
    screen.getByText("Documentos faltantes"),
  ).toBeInTheDocument();

  expect(api.post).not.toHaveBeenCalled();
});

it("guarda la verificación pendiente y comprueba la documentación antes de aprobar", async () => {
  prepararAprobacion();

  render(<GestionInscripcion legajoId="legajo-1" />);

  const aprobar = await screen.findByRole("button", {
    name: "Aprobar inscripción",
  });

  fireEvent.change(
    screen.getByRole("combobox", {
      name: /¿Tiene título de posgrado\?/,
    }),
    { target: { value: "si" } },
  );

  expect(api.put).not.toHaveBeenCalled();
  expect(api.post).not.toHaveBeenCalled();

  vi.mocked(api.put).mockImplementationOnce(async <T,>() => {
    gestionActual.tiene_titulo_posgrado = true;
    return { ...gestionActual } as T;
  });

  const consultaOriginal = vi.mocked(api.get).getMockImplementation();

  vi.mocked(api.get).mockImplementation(async <T,>(ruta: string, token?: string): Promise<T> => {
    if (ruta.endsWith("/completitud")) {
      return {
        legajo_id: "legajo-1",
        pendiente: null,
        completitud: {
          porcentaje: 80,
          documentos_requeridos: 5,
          documentos_presentados: 4,
          documentos_faltantes: ["Título de posgrado"],
          completo: false,
        },
      } as T;
    }

    if (!consultaOriginal) throw new Error("Consulta no configurada");
    return consultaOriginal(ruta, token) as Promise<T>;
  });

  fireEvent.click(aprobar);
  await confirmarModal();

  await waitFor(() => {
    expect(api.put).toHaveBeenCalledWith(
      "/conduccion/legajos/legajo-1/verificacion",
      {
        datos_verificados: true,
        tiene_titulo_posgrado: true,
      },
      "token-prueba",
    );
  });

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "No se puede aprobar"
  );

  expect(api.post).not.toHaveBeenCalled();
});

it("informa errores al consultar la completitud documental", async () => {
  prepararAprobacion();

  const consultaOriginal =
    vi.mocked(api.get).getMockImplementation();

  vi.mocked(api.get).mockImplementation(
    async <T,>(ruta: string, token?: string): Promise<T> => {
      if (ruta.endsWith("/completitud")) {
        throw new Error(
          "No se pudo consultar la documentación.",
        );
      }

      if (!consultaOriginal) {
        throw new Error("Consulta no configurada.");
      }

      return consultaOriginal(ruta, token) as Promise<T>;
    },
  );

  render(<GestionInscripcion legajoId="legajo-1" />);

  expect(
    await screen.findByRole("alert"),
  ).toHaveTextContent(
    "No se pudo consultar la documentación.",
  );

  expect(
    screen.queryByRole("button", {
      name: "Aprobar inscripción",
    }),
  ).not.toBeInTheDocument();

  expect(api.post).not.toHaveBeenCalled();
});

it("notifica la actualización documental al guardar la verificación", async () => {
  gestionActual.estado = "EN_REVISION";
  const actualizarDocumentacion = vi.fn();

  render(
    <GestionInscripcion
      legajoId="legajo-1"
      onDocumentacionActualizada={actualizarDocumentacion}
    />,
  );

  await screen.findByRole("button", {
    name: "Guardar avances",
  });

  fireEvent.change(
    screen.getByRole("combobox", {
      name: /¿Tiene título de posgrado\?/,
    }),
    { target: { value: "no" } },
  );

  fireEvent.click(
    screen.getByRole("button", {
      name: "Guardar avances",
    }),
  );

  expect(actualizarDocumentacion).not.toHaveBeenCalled();

  await confirmarModal();

  expect(
    await screen.findByText("Verificación guardada."),
  ).toBeInTheDocument();

  expect(actualizarDocumentacion).toHaveBeenCalledTimes(1);
});

it("no notifica cambios documentales cuando falla una operación", async () => {
  const actualizarDocumentacion = vi.fn();

  vi.mocked(api.post).mockRejectedValueOnce(
    new Error("No se pudo registrar la operación."),
  );

  render(
    <GestionInscripcion
      legajoId="legajo-1"
      onDocumentacionActualizada={actualizarDocumentacion}
    />,
  );

  fireEvent.click(await obtenerBotonRevision());

  await confirmarModal();

  expect(
    await screen.findByRole("alert"),
  ).toHaveTextContent(
    "No se pudo registrar la operación.",
  );

  expect(actualizarDocumentacion).not.toHaveBeenCalled();
});

it("muestra los documentos observados por el coordinador", async () => {
  gestionActual = {
    ...gestionActual,
    estado: "OBSERVADO",
    observaciones: "Adjuntar documentación legible.",
    documentacion_a_corregir: [
      "DNI_PASAPORTE",
      "TITULO_GRADO",
    ],
  };

  render(<GestionInscripcion legajoId="legajo-1" />);

  const documentos = await screen.findByRole("region", {
    name: "Documentos observados",
  });

  expect(
    within(documentos).getByText("DNI o pasaporte"),
  ).toBeInTheDocument();

  expect(
    within(documentos).getByText("Título de grado"),
  ).toBeInTheDocument();

  expect(
    screen.getByText("Adjuntar documentación legible."),
  ).toBeInTheDocument();
});

it("no muestra documentos observados cuando no existen", async () => {
  render(<GestionInscripcion legajoId="legajo-1" />);

  await obtenerBotonRevision();

  expect(
    screen.queryByRole("region", {
      name: "Documentos observados",
    }),
  ).not.toBeInTheDocument();
});

it("exige un motivo antes de rechazar una inscripción", async () => {
  gestionActual.estado = "EN_REVISION";

  render(<GestionInscripcion legajoId="legajo-1" />);

  fireEvent.click(
    await screen.findByRole("button", {
      name: "Rechazar inscripción",
    }),
  );

  expect(await screen.findByRole("alert"))
    .toHaveTextContent("Indicá el motivo del rechazo.");

  expect(
    screen.queryByRole("alertdialog"),
  ).not.toBeInTheDocument();

  expect(api.post).not.toHaveBeenCalled();
});

it.each(["ACTIVO", "EN_RIESGO"])(
  "exige un motivo para dar de baja desde %s",
  async (estado) => {
    gestionActual.estado = estado;

    render(<GestionInscripcion legajoId="legajo-1" />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Dar de baja",
      }),
    );

    expect(await screen.findByRole("alert"))
      .toHaveTextContent("Indicá el motivo de la baja.");

    expect(
      screen.queryByRole("alertdialog"),
    ).not.toBeInTheDocument();

    expect(api.post).not.toHaveBeenCalled();
  },
);

it("rechaza una inscripción con motivo y confirmación", async () => {
  gestionActual.estado = "EN_REVISION";

  vi.mocked(api.post).mockImplementationOnce(
    async <T,>(): Promise<T> => {
      gestionActual.estado = "RECHAZADO";
      return { ...gestionActual } as T;
    },
  );

  render(<GestionInscripcion legajoId="legajo-1" />);

  const boton = await screen.findByRole("button", {
    name: "Rechazar inscripción",
  });

  fireEvent.change(
    screen.getByRole("textbox", {
      name: "Observaciones para el aspirante",
    }),
    {
      target: {
        value: "No cumple los requisitos de admisión.",
      },
    },
  );

  fireEvent.click(boton);

  expect(api.post).not.toHaveBeenCalled();

  await confirmarModal();

  expect(api.post).toHaveBeenCalledWith(
    "/conduccion/legajos/legajo-1/acciones",
    {
      accion: "RECHAZAR",
      estado_esperado: "EN_REVISION",
      comentario: "No cumple los requisitos de admisión.",
      documentacion_a_corregir: [],
    },
    "token-prueba",
  );

  expect(
    await screen.findByText("Rechazada"),
  ).toBeInTheDocument();
});

it("actualiza el estado después de recibir un conflicto 409", async () => {
  prepararAprobacion();

  const actualizarDocumentacion = vi.fn();

  vi.mocked(api.post).mockImplementationOnce(async () => {
    gestionActual.estado = "COMPLETADO";

    throw Object.assign(
      new Error("El estado del legajo cambió."),
      { status: 409 },
    );
  });

  render(
    <GestionInscripcion
      legajoId="legajo-1"
      onDocumentacionActualizada={actualizarDocumentacion}
    />,
  );

  fireEvent.click(
    await screen.findByRole("button", {
      name: "Aprobar inscripción",
    }),
  );

  await confirmarModal();

  expect(
    await screen.findByRole("alert"),
  ).toHaveTextContent(
    "Revisá los datos actualizados antes de continuar.",
  );

  expect(
    screen.getByText("Aprobada"),
  ).toBeInTheDocument();

  expect(
    screen.queryByRole("button", {
      name: "Aprobar inscripción",
    }),
  ).not.toBeInTheDocument();

  expect(api.post).toHaveBeenCalledTimes(1);

  expect(
    actualizarDocumentacion,
  ).toHaveBeenCalledTimes(1);
});

it("bloquea operaciones si falla la actualización tras un conflicto", async () => {
  prepararAprobacion();

  vi.mocked(api.post).mockImplementationOnce(async () => {
    vi.mocked(api.get).mockRejectedValueOnce(
      new Error("Servidor no disponible."),
    );

    throw Object.assign(
      new Error("El estado del legajo cambió."),
      { status: 409 },
    );
  });

  render(<GestionInscripcion legajoId="legajo-1" />);

  fireEvent.click(
    await screen.findByRole("button", {
      name: "Aprobar inscripción",
    }),
  );

  await confirmarModal();

  await waitFor(() => {
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se pudo actualizar el legajo.",
    );
  });

  expect(
    screen.getByRole("button", {
      name: "Aprobar inscripción",
    }),
  ).toBeDisabled();

  expect(
    screen.getByRole("button", {
      name: "Actualizar gestión",
    }),
  ).toBeEnabled();

  expect(api.post).toHaveBeenCalledTimes(1);
});


it("reúne verificación y resolución en un único formulario sin ejecutar operaciones", async () => {
  gestionActual.estado = "EN_REVISION";
  render(<GestionInscripcion legajoId="legajo-1" />);
  const formulario = await screen.findByRole("form", { name: "Revisión y resolución del legajo" });
  expect(formulario).toContainElement(screen.getByRole("button", { name: "Guardar avances" }));
  expect(formulario).toContainElement(screen.getByRole("button", { name: "Aprobar inscripción" }));
  expect(api.put).not.toHaveBeenCalled();
  expect(api.post).not.toHaveBeenCalled();
});
