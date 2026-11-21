import {
  fireEvent,
  render,
  screen,
  waitFor,
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

  vi.spyOn(window, "confirm").mockReturnValue(true);
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

it("consulta la gestión usando el token", async () => {
  render(<GestionInscripcion legajoId="legajo-1" />);

  expect(
    await screen.findByText("PENDIENTE"),
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

  expect(screen.getByText("EN REVISION")).toBeInTheDocument();

  expect(onEstadoActualizado).toHaveBeenCalledWith(
    "EN_REVISION",
  );
});

it("no ejecuta la acción si se cancela", async () => {
  vi.mocked(window.confirm).mockReturnValue(false);

  render(<GestionInscripcion legajoId="legajo-1" />);

  fireEvent.click(await obtenerBotonRevision());

  expect(api.post).not.toHaveBeenCalled();
});

it("muestra el error del servidor", async () => {
  vi.mocked(api.post).mockRejectedValueOnce(
    new Error("El estado del legajo cambió."),
  );

  render(<GestionInscripcion legajoId="legajo-1" />);

  fireEvent.click(await obtenerBotonRevision());

  expect(
    await screen.findByRole("alert"),
  ).toHaveTextContent("El estado del legajo cambió.");
});

it("guarda la verificación", async () => {
  render(<GestionInscripcion legajoId="legajo-1" />);

  await obtenerBotonRevision();

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
      name: "Guardar verificación",
    }),
  );

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
    "Escribí una observación o seleccioná al menos un documento para corregir.",
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
    await screen.findByText("PENDIENTE"),
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

  expect(await screen.findByText("OBSERVADO")).toBeInTheDocument();
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
  expect(await screen.findByText("OBSERVADO")).toBeInTheDocument();
});
