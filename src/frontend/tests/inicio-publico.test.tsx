
import {
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import HomePage from "../src/modulos/home/paginas/HomePage";
import { api } from "../src/shared/api/client";

vi.mock("../src/shared/api/client", () => ({
  api: {
    get: vi.fn(),
  },
}));

const configuracion = {
  seccion: "home",
  valores: {
    hero_titulo: "Inicio configurado desde administración",
    hero_descripcion: "Descripción actualizada",
    boton_inscripcion: "Comenzar inscripción",
    boton_informacion: "Contactanos",
    boton_estado_inscripcion: "Consultar mi inscripción",
    tarjeta_carreras_titulo: "Oferta académica",
    tarjeta_carreras_descripcion: "Carreras disponibles",
    tarjeta_carreras_enlace: "Explorar carreras",
    tarjeta_calendario_titulo: "Fechas académicas",
    tarjeta_calendario_descripcion: "Fechas importantes",
    tarjeta_calendario_enlace: "Consultar fechas",
    tarjeta_noticias_titulo: "Últimas noticias",
    tarjeta_noticias_descripcion: "Novedades institucionales",
    tarjeta_noticias_enlace: "Leer noticias",
    tarjeta_faq_titulo: "Consultas frecuentes",
    tarjeta_faq_descripcion: "Respuestas a tus preguntas",
    tarjeta_faq_enlace: "Consultar preguntas",
  },
};

function mostrarInicio() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Inicio público", () => {
  it("consulta la configuración pública del Backend", async () => {
    vi.mocked(api.get).mockResolvedValue(
      configuracion as never
    );

    mostrarInicio();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/configuracion-publica/home"
      );
    });
  });

  it("muestra los textos configurados por el administrador", async () => {
    vi.mocked(api.get).mockResolvedValue(
      configuracion as never
    );

    mostrarInicio();

    expect(
      await screen.findByRole("heading", {
        name: "Inicio configurado desde administración",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText("Descripción actualizada")
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", {
        name: "Consultar mi inscripción",
      })
    ).toHaveAttribute(
      "href",
      "/estado-inscripcion"
    );

    expect(
      screen.getByRole("heading", {
        name: "Oferta académica",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: "Últimas noticias",
      })
    ).toBeInTheDocument();
  });

  it("mantiene los textos iniciales si falla el Backend", async () => {
    vi.mocked(api.get).mockRejectedValue(
      new Error("Error de conexión")
    );

    mostrarInicio();

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(
      "No se pudo cargar la configuración actualizada del inicio."
    );

    expect(
      screen.getByRole("heading", {
        name: "Bienvenido al Sistema de Posgrado UTN FRLP",
      })
    ).toBeInTheDocument();
  });
});
