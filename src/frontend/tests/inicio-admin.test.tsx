
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

import InicioAdmin from "../src/modulos/perfiles/administrador/home/secciones/InicioAdmin";
import { api } from "../src/shared/api/client";

vi.mock("../src/shared/api/client", () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({
  useAuth: () => ({
    user: {
      token: "token-admin",
      rol: "ADMIN",
    },
  }),
}));

const configuracion = {
  seccion: "home",
  valores: {
    hero_titulo: "Bienvenido a Posgrados",
    hero_descripcion: "Información institucional",
    boton_inscripcion: "Inscribite ahora",
    boton_informacion: "Solicitar información",
    boton_estado_inscripcion: "Consultar estado de inscripción",
    tarjeta_carreras_titulo: "Carreras",
    tarjeta_carreras_descripcion: "Oferta académica",
    tarjeta_carreras_enlace: "Ver carreras",
    tarjeta_calendario_titulo: "Calendario",
    tarjeta_calendario_descripcion: "Fechas importantes",
    tarjeta_calendario_enlace: "Ver calendario",
    tarjeta_noticias_titulo: "Noticias",
    tarjeta_noticias_descripcion: "Novedades",
    tarjeta_noticias_enlace: "Ver noticias",
    tarjeta_faq_titulo: "Preguntas frecuentes",
    tarjeta_faq_descripcion: "Consultas",
    tarjeta_faq_enlace: "Ver preguntas",
  },
};

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(api.get).mockResolvedValue(
    configuracion as never
  );

  vi.mocked(api.put).mockImplementation(
    async (_ruta, datos) => ({
      seccion: "home",
      valores: (
        datos as { valores: Record<string, string> }
      ).valores,
    }) as never
  );
});

describe("Administración del Inicio público", () => {
  it("carga los valores guardados", async () => {
    render(<InicioAdmin />);

    expect(
      await screen.findByDisplayValue(
        "Bienvenido a Posgrados"
      )
    ).toBeInTheDocument();

    expect(
      screen.getByDisplayValue(
        "Consultar estado de inscripción"
      )
    ).toBeInTheDocument();

    expect(api.get).toHaveBeenCalledWith(
      "/configuracion-publica/home"
    );
  });

  it("permite modificar y guardar el título principal", async () => {
    render(<InicioAdmin />);

    const titulo = await screen.findByDisplayValue(
      "Bienvenido a Posgrados"
    );

    fireEvent.change(titulo, {
      target: {
        value: "Nuevo título del Inicio",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Guardar cambios",
      })
    );

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/configuracion-publica/home",
        {
          valores: expect.objectContaining({
            hero_titulo: "Nuevo título del Inicio",
          }),
        },
        "token-admin"
      );
    });

    expect(
      await screen.findByText(
        "La página de inicio fue actualizada correctamente."
      )
    ).toBeInTheDocument();
  });

  it("permite editar el botón de estado de inscripción", async () => {
    render(<InicioAdmin />);

    const campo = await screen.findByDisplayValue(
      "Consultar estado de inscripción"
    );

    fireEvent.change(campo, {
      target: {
        value: "Ver estado de mi trámite",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Guardar cambios",
      })
    );

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/configuracion-publica/home",
        {
          valores: expect.objectContaining({
            boton_estado_inscripcion:
              "Ver estado de mi trámite",
          }),
        },
        "token-admin"
      );
    });
  });
});
