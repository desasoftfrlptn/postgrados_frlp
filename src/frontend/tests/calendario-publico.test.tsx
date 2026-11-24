
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import PaginaCalendario from "../src/modulos/calendario/paginas/PaginaCalendario";
import { api } from "../src/shared/api/client";
import { obtenerFeriados } from "../src/modulos/calendario/api/feriados";

vi.mock("../src/shared/api/client", () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock("../src/modulos/calendario/api/feriados", () => ({
  obtenerFeriados: vi.fn(),
}));

const hoy = new Date();
const anioActual = hoy.getFullYear();
const mesActual = hoy.getMonth();

const meses = [
  "Enero", "Febrero", "Marzo", "Abril",
  "Mayo", "Junio", "Julio", "Agosto",
  "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const fechaEvento =
  `${anioActual}-${String(mesActual + 1).padStart(2, "0")}-15`;

beforeEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(obtenerFeriados).mockReset();

  vi.mocked(obtenerFeriados).mockResolvedValue([]);

  vi.mocked(api.get).mockImplementation(async (ruta) => {
    if (ruta === "/configuracion-publica/calendario") {
      return {
        valores: {
          titulo: "Calendario de Posgrado",
          descripcion: "Fechas importantes de posgrado",
          anio_minimo: "2025",
          anio_maximo: "2028",
        },
      } as never;
    }

    if (ruta === "/eventos/publicos") {
      return [
        {
          id: "evento-1",
          titulo: "Jornada de investigación",
          descripcion: "Presentación de proyectos.",
          fecha: fechaEvento,
          tipo: "otros:Defensa de tesis",
          activo: true,
        },
        {
          id: "evento-2",
          titulo: "Evento inactivo",
          descripcion: "No debería aparecer.",
          fecha: fechaEvento,
          tipo: "clases",
          activo: false,
        },
      ] as never;
    }

    throw new Error(`Ruta no esperada: ${ruta}`);
  });
});

it("abre el calendario en el mes actual", async () => {
  render(<PaginaCalendario />);

  await screen.findByText("Fechas importantes de posgrado");

  expect(
    screen.getByRole("heading", {
      name: `${meses[mesActual]} ${anioActual}`,
    })
  ).toBeInTheDocument();
});

it("muestra los eventos públicos y su tipo personalizado", async () => {
  render(<PaginaCalendario />);

  expect(
    await screen.findByText("Jornada de investigación")
  ).toBeInTheDocument();

  expect(
    screen.getByText("Defensa de tesis")
  ).toBeInTheDocument();

  expect(
    screen.queryByText("Evento inactivo")
  ).not.toBeInTheDocument();

  expect(api.get).toHaveBeenCalledWith(
    "/eventos/publicos"
  );
});

it("utiliza el rango de años configurado desde Administración", async () => {
  render(<PaginaCalendario />);

  await waitFor(() => {
    expect(
      screen.getByRole("option", { name: "2028" })
    ).toBeInTheDocument();
  });

  fireEvent.change(screen.getByLabelText("Seleccionar año"), {
    target: { value: "2028" },
  });

  expect(
    screen.getByRole("heading", { name: "Enero 2028" })
  ).toBeInTheDocument();
});
