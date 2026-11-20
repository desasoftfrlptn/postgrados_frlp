
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
    post: vi.fn(),
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

  vi.mocked(api.post).mockResolvedValue(
    configuracion as never
  );
});

describe("Administración del Inicio público", () => {
  it("muestra la configuración en modo lectura", async () => {
    render(<InicioAdmin />);

    const titulo = await screen.findByDisplayValue(
      "Bienvenido a Posgrados"
    );

    expect(titulo).toBeDisabled();

    expect(
      screen.getByRole("button", { name: "Modificar" })
    ).toBeEnabled();

    expect(
      screen.getByRole("button", {
        name: "Restablecer configuración predeterminada",
      })
    ).toBeEnabled();

    expect(
      screen.queryByRole("button", { name: "Guardar cambios" })
    ).not.toBeInTheDocument();
  });

  it("habilita la edición y permite cancelarla", async () => {
    render(<InicioAdmin />);

    const titulo = await screen.findByDisplayValue(
      "Bienvenido a Posgrados"
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Modificar" })
    );

    expect(titulo).toBeEnabled();

    expect(
      screen.getByRole("status")
    ).toHaveTextContent("Estás modificando");

    fireEvent.change(titulo, {
      target: { value: "Título sin guardar" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Cancelar" })
    );

    expect(titulo).toHaveValue("Bienvenido a Posgrados");
    expect(titulo).toBeDisabled();
    expect(api.put).not.toHaveBeenCalled();
  });

  it("solicita confirmación antes de guardar", async () => {
    render(<InicioAdmin />);

    const titulo = await screen.findByDisplayValue(
      "Bienvenido a Posgrados"
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Modificar" })
    );

    fireEvent.change(titulo, {
      target: { value: "Nuevo título" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" })
    );

    expect(
      screen.getByRole("alertdialog", {
        name: "¿Guardar los cambios?",
      })
    ).toBeInTheDocument();

    expect(api.put).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Confirmar guardado",
      })
    );

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/configuracion-publica/home",
        {
          valores: expect.objectContaining({
            hero_titulo: "Nuevo título",
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

    expect(titulo).toBeDisabled();
  });

  it("permite cancelar la confirmación de guardado", async () => {
    render(<InicioAdmin />);

    await screen.findByDisplayValue("Bienvenido a Posgrados");

    fireEvent.click(
      screen.getByRole("button", { name: "Modificar" })
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" })
    );

    fireEvent.click(
      screen.getByRole("alertdialog").querySelector(
        ".admin-inicio-boton-secundario"
      ) as HTMLButtonElement
    );

    expect(api.put).not.toHaveBeenCalled();

    expect(
      screen.getByRole("button", { name: "Guardar cambios" })
    ).toBeInTheDocument();
  });

  it("restablece los valores solo después de confirmar", async () => {
    render(<InicioAdmin />);

    await screen.findByDisplayValue("Bienvenido a Posgrados");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Restablecer configuración predeterminada",
      })
    );

    expect(
      screen.getByRole("alertdialog", {
        name: "¿Restablecer la configuración?",
      })
    ).toBeInTheDocument();

    expect(api.post).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Confirmar restablecimiento",
      })
    );

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/configuracion-publica/home/restablecer",
        undefined,
        "token-admin"
      );
    });

    expect(
      await screen.findByText(
        "Se restableció la configuración predeterminada del Inicio."
      )
    ).toBeInTheDocument();
  });
});
