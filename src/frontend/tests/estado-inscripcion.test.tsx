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

import EstadoInscripcionPage from "../src/modulos/inscripcion/paginas/EstadoInscripcionPage";
import { inscripcionApi } from "../src/modulos/inscripcion/api";

vi.mock("../src/modulos/inscripcion/api", () => ({
  inscripcionApi: {
    consultarEstado: vi.fn(),
  },
}));

beforeEach(() => {
  vi.mocked(inscripcionApi.consultarEstado).mockReset();
});

function completarConsulta() {
  fireEvent.change(
    screen.getByLabelText("Número de seguimiento"),
    { target: { value: "INS-2026-15" } },
  );

  fireEvent.change(
    screen.getByLabelText("DNI o pasaporte"),
    { target: { value: "44000000" } },
  );
}

function consultar() {
  fireEvent.click(
    screen.getByRole("button", {
      name: "Consultar estado",
    }),
  );
}

it("consulta el estado utilizando los datos ingresados", async () => {
  vi.mocked(inscripcionApi.consultarEstado).mockResolvedValue({
    numero_seguimiento: "INS-2026-15",
    estado: "PENDIENTE",
    observaciones: null,
    documentacion_a_corregir: [],
  } as Awaited<ReturnType<typeof inscripcionApi.consultarEstado>>);

  render(<EstadoInscripcionPage />);
  completarConsulta();
  consultar();

  expect(inscripcionApi.consultarEstado).toHaveBeenCalledWith(
    "INS-2026-15",
    "44000000",
  );

  expect(
    await screen.findByText("Pendiente de revisión"),
  ).toBeInTheDocument();
});

it("muestra las observaciones y la documentación solicitada", async () => {
  vi.mocked(inscripcionApi.consultarEstado).mockResolvedValue({
    numero_seguimiento: "INS-2026-15",
    estado: "OBSERVADO",
    observaciones: "Adjuntar documentación legible.",
    documentacion_a_corregir: ["TITULO_GRADO"],
  } as Awaited<ReturnType<typeof inscripcionApi.consultarEstado>>);

  render(<EstadoInscripcionPage />);
  completarConsulta();
  consultar();

  expect(
    await screen.findByText("Requiere correcciones"),
  ).toBeInTheDocument();

  expect(
    screen.getByText("Adjuntar documentación legible."),
  ).toBeInTheDocument();

  expect(
    screen.getByText("Título de grado"),
  ).toBeInTheDocument();
});

it("muestra los errores y conserva los datos ingresados", async () => {
  vi.mocked(inscripcionApi.consultarEstado).mockRejectedValue(
    new Error("No se encontró la inscripción."),
  );

  render(<EstadoInscripcionPage />);
  completarConsulta();
  consultar();

  expect(await screen.findByRole("alert"))
    .toHaveTextContent("No se encontró la inscripción.");

  expect(screen.getByLabelText("Número de seguimiento"))
    .toHaveValue("INS-2026-15");

  expect(screen.getByLabelText("DNI o pasaporte"))
    .toHaveValue("44000000");
});

it("no consulta cuando los campos contienen solo espacios", () => {
  render(<EstadoInscripcionPage />);

  fireEvent.change(
    screen.getByLabelText("Número de seguimiento"),
    { target: { value: "   " } },
  );

  fireEvent.change(
    screen.getByLabelText("DNI o pasaporte"),
    { target: { value: "   " } },
  );

  consultar();

  expect(inscripcionApi.consultarEstado)
    .not.toHaveBeenCalled();

  expect(screen.getByRole("alert"))
    .toHaveTextContent("Completá ambos campos");
});

it("oculta el resultado anterior al modificar los datos", async () => {
  vi.mocked(inscripcionApi.consultarEstado).mockResolvedValue({
    numero_seguimiento: "INS-2026-15",
    estado: "PENDIENTE",
    observaciones: null,
    documentacion_a_corregir: [],
  } as Awaited<ReturnType<typeof inscripcionApi.consultarEstado>>);

  render(<EstadoInscripcionPage />);
  completarConsulta();
  consultar();

  await screen.findByText("Pendiente de revisión");

  fireEvent.change(
    screen.getByLabelText("DNI o pasaporte"),
    { target: { value: "45000000" } },
  );

  expect(
    screen.queryByText("Pendiente de revisión"),
  ).not.toBeInTheDocument();
});

it("bloquea los campos mientras se realiza la consulta", async () => {
  type Respuesta = Awaited<
    ReturnType<typeof inscripcionApi.consultarEstado>
  >;

  let resolver!: (valor: Respuesta) => void;

  vi.mocked(inscripcionApi.consultarEstado).mockReturnValue(
    new Promise((resolve) => {
      resolver = resolve;
    }),
  );

  render(<EstadoInscripcionPage />);
  completarConsulta();
  consultar();

  expect(screen.getByLabelText("Número de seguimiento"))
    .toBeDisabled();

  expect(screen.getByLabelText("DNI o pasaporte"))
    .toBeDisabled();

  expect(
    screen.getByRole("button", { name: "Consultando..." }),
  ).toBeDisabled();

  resolver({
    numero_seguimiento: "INS-2026-15",
    estado: "PENDIENTE",
    observaciones: null,
    documentacion_a_corregir: [],
  } as Respuesta);

  await waitFor(() => {
    expect(screen.getByLabelText("DNI o pasaporte"))
      .toBeEnabled();
  });

  expect(inscripcionApi.consultarEstado)
    .toHaveBeenCalledTimes(1);
});

it.each([
  ["44.000.000", "44000000"],
  ["ab123456", "AB123456"],
  [" 44000000 ", "44000000"],
])(
  "normaliza el documento %s antes de consultar",
  async (documento, esperado) => {
    vi.mocked(inscripcionApi.consultarEstado).mockResolvedValue({
      numero_seguimiento: "INS-2026-15",
      estado: "PENDIENTE",
      observaciones: null,
      documentacion_a_corregir: [],
    } as Awaited<
      ReturnType<typeof inscripcionApi.consultarEstado>
    >);

    render(<EstadoInscripcionPage />);
    completarConsulta();

    fireEvent.change(
      screen.getByLabelText("DNI o pasaporte"),
      { target: { value: documento } }
    );

    consultar();

    expect(inscripcionApi.consultarEstado)
      .toHaveBeenCalledWith("INS-2026-15", esperado);

    expect(
      await screen.findByText("Pendiente de revisión")
    ).toBeInTheDocument();
  }
);

it("no consulta cuando el documento es inválido", () => {
  render(<EstadoInscripcionPage />);
  completarConsulta();

  fireEvent.change(
    screen.getByLabelText("DNI o pasaporte"),
    { target: { value: "ABC" } }
  );

  consultar();

  expect(inscripcionApi.consultarEstado)
    .not.toHaveBeenCalled();

  expect(screen.getByRole("alert"))
    .toHaveTextContent("Ingresá un DNI o pasaporte válido.");
});

it("normaliza el número de seguimiento", async () => {
  vi.mocked(inscripcionApi.consultarEstado).mockResolvedValue({
    numero_seguimiento: "INS-2026-15",
    estado: "PENDIENTE",
    observaciones: null,
    documentacion_a_corregir: [],
  } as Awaited<
    ReturnType<typeof inscripcionApi.consultarEstado>
  >);

  render(<EstadoInscripcionPage />);
  completarConsulta();

  fireEvent.change(
    screen.getByLabelText("Número de seguimiento"),
    { target: { value: " ins-2026-15 " } }
  );

  consultar();

  expect(inscripcionApi.consultarEstado)
    .toHaveBeenCalledWith(
      "INS-2026-15",
      "44000000"
    );

  expect(
    await screen.findByText("Pendiente de revisión")
  ).toBeInTheDocument();
});
