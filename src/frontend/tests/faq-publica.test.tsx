import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import PaginaFAQ from "../src/modulos/preguntas-frecuentes/paginas/paginaFAQ";
import { faqApi } from "../src/shared/api/faq";

vi.mock("../src/shared/api/faq", () => ({
  faqApi: {
    listarPublicas: vi.fn(),
  },
}));

const pregunta = {
  id: "faq-1",
  categoria: "Inscripción",
  pregunta: "¿Cómo me inscribo?",
  respuesta: "Completando el formulario público.",
  orden: 1,
  activa: true,
};

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(faqApi.listarPublicas)
    .mockResolvedValue([pregunta]);
});

describe("Preguntas frecuentes públicas", () => {
  it("carga las preguntas desde el backend", async () => {
    render(<PaginaFAQ />);

    expect(
      await screen.findByRole("button", {
        name: pregunta.pregunta,
      })
    ).toBeInTheDocument();

    expect(faqApi.listarPublicas)
      .toHaveBeenCalledTimes(1);
  });

  it("agrupa las preguntas por categoría", async () => {
    render(<PaginaFAQ />);

    expect(
      await screen.findByRole("heading", {
        name: "Inscripción",
      })
    ).toBeInTheDocument();
  });

  it("permite abrir y cerrar una respuesta", async () => {
    render(<PaginaFAQ />);

    const boton = await screen.findByRole("button", {
      name: pregunta.pregunta,
    });

    const respuesta = screen.getByText(
      pregunta.respuesta
    );

    expect(respuesta).not.toBeVisible();

    fireEvent.click(boton);

    expect(respuesta).toBeVisible();

    expect(boton).toHaveAttribute(
      "aria-expanded",
      "true"
    );

    fireEvent.click(boton);

    expect(respuesta).not.toBeVisible();
  });

  it("no muestra preguntas desactivadas", async () => {
    vi.mocked(faqApi.listarPublicas)
      .mockResolvedValue([
        pregunta,
        {
          ...pregunta,
          id: "faq-2",
          pregunta: "Pregunta desactivada",
          activa: false,
        },
      ]);

    render(<PaginaFAQ />);

    await screen.findByRole("button", {
      name: pregunta.pregunta,
    });

    expect(
      screen.queryByText("Pregunta desactivada")
    ).not.toBeInTheDocument();
  });

  it("informa cuando no hay preguntas publicadas", async () => {
    vi.mocked(faqApi.listarPublicas)
      .mockResolvedValue([]);

    render(<PaginaFAQ />);

    expect(
      await screen.findByText(
        "No hay preguntas frecuentes publicadas."
      )
    ).toBeInTheDocument();
  });

  it("permite reintentar una consulta fallida", async () => {
    vi.mocked(faqApi.listarPublicas)
      .mockRejectedValueOnce(
        new Error("Error de conexión")
      );

    render(<PaginaFAQ />);

    expect(
      await screen.findByText(
        "No se pudieron cargar las preguntas frecuentes."
      )
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Reintentar",
      })
    );

    expect(
      await screen.findByRole("button", {
        name: pregunta.pregunta,
      })
    ).toBeInTheDocument();

    expect(faqApi.listarPublicas)
      .toHaveBeenCalledTimes(2);
  });
});
