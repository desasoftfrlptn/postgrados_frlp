
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import NoticiasAdmin from "../src/modulos/perfiles/administrador/home/secciones/NoticiasAdmin";
import { api } from "../src/shared/api/client";

vi.mock("../src/shared/api/client", () => ({
  api: {
    get: vi.fn(),
    postForm: vi.fn(),
    putForm: vi.fn(),
    patch: vi.fn(),
  },
  obtenerUrlArchivo: (ruta: string | null) =>
    ruta ?? "",
}));

vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({
  useAuth: () => ({
    user: {
      token: "token-admin",
      rol: "ADMIN",
    },
  }),
}));

const noticiaPublicada = {
  id: "noticia-1",
  titulo: "Nueva carrera de posgrado",
  categoria: "Académico",
  resumen: "Se incorpora una nueva carrera.",
  contenido: "Información sobre la nueva carrera.",
  fecha: "2026-11-19",
  imagen_url: null,
  activo: true,
};

const noticiaNoPublicada = {
  ...noticiaPublicada,
  activo: false,
};

beforeEach(() => {
  vi.clearAllMocks();

  // Responde a todas las consultas GET, incluso después
  // de crear, publicar o despublicar una noticia.
  vi.mocked(api.get).mockResolvedValue([
    noticiaPublicada,
  ]);

  vi.mocked(api.postForm).mockResolvedValue({
    ...noticiaPublicada,
    id: "noticia-2",
  });

  vi.mocked(api.putForm).mockResolvedValue(
    noticiaPublicada
  );

  vi.mocked(api.patch).mockResolvedValue(
    noticiaNoPublicada
  );
});

describe("Administración de noticias", () => {
  it("permite crear una noticia", async () => {
    render(<NoticiasAdmin />);

    await screen.findByText("Nueva carrera de posgrado");

    fireEvent.click(
      screen.getByRole("button", {
        name: /Nueva noticia/i,
      })
    );

    fireEvent.change(
      screen.getByLabelText("Título"),
      {
        target: {
          value: "Inscripciones abiertas 2027",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText("Categoría"),
      {
        target: {
          value: "Institucional",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText("Fecha"),
      {
        target: {
          value: "2026-11-20",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText("Resumen"),
      {
        target: {
          value: "Comienzan las inscripciones.",
        },
      }
    );

    fireEvent.change(
      screen.getByLabelText("Contenido"),
      {
        target: {
          value: "Información sobre las inscripciones.",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Crear noticia",
      })
    );

    await waitFor(() => {
      expect(api.postForm).toHaveBeenCalledWith(
        "/noticias",
        expect.any(FormData),
        "token-admin"
      );
    });

    const datosEnviados = vi.mocked(api.postForm)
      .mock.calls[0][1] as FormData;

    expect(datosEnviados.get("titulo")).toBe(
      "Inscripciones abiertas 2027"
    );

    expect(datosEnviados.get("categoria")).toBe(
      "Institucional"
    );

    expect(datosEnviados.get("fecha")).toBe(
      "2026-11-20"
    );

    expect(
      await screen.findByRole("status")
    ).toHaveTextContent(
      "La noticia fue creada correctamente."
    );
  });

  it("permite despublicar una noticia con confirmación", async () => {
    render(<NoticiasAdmin />);

    const botonDespublicar =
      await screen.findByRole("button", {
        name: "Despublicar",
      });

    fireEvent.click(botonDespublicar);

    const dialogo = screen.getByRole("alertdialog", {
      name: "¿Despublicar noticia?",
    });

    expect(dialogo).toBeInTheDocument();

    // No debe modificar el estado antes de confirmar.
    expect(api.patch).not.toHaveBeenCalled();

    fireEvent.click(
      within(dialogo).getByRole("button", {
        name: "Confirmar despublicación",
      })
    );

    // Verifica el endpoint, el estado y el token.
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        "/noticias/noticia-1/estado",
        { activo: false },
        "token-admin"
      );
    });

    // Mensaje exacto de la aplicación.
    expect(
      await screen.findByRole("status")
    ).toHaveTextContent(
      "La noticia fue despublicada correctamente."
    );

    // El cuadro de confirmación debe cerrarse.
    expect(
      screen.queryByRole("alertdialog")
    ).not.toBeInTheDocument();
  });

  it("permite cancelar la despublicación", async () => {
    render(<NoticiasAdmin />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Despublicar",
      })
    );

    const dialogo = screen.getByRole("alertdialog", {
      name: "¿Despublicar noticia?",
    });

    fireEvent.click(
      within(dialogo).getByRole("button", {
        name: "Cancelar",
      })
    );

    expect(
      screen.queryByRole("alertdialog")
    ).not.toBeInTheDocument();

    // Cancelar no debe enviar ninguna modificación.
    expect(api.patch).not.toHaveBeenCalled();

    expect(
      screen.getByRole("button", {
        name: "Despublicar",
      })
    ).toBeInTheDocument();
  });

  it("permite publicar una noticia con confirmación", async () => {
    // Comenzamos con una noticia no publicada.
    vi.mocked(api.get).mockResolvedValue([
      noticiaNoPublicada,
    ]);

    vi.mocked(api.patch).mockResolvedValue(
      noticiaPublicada
    );

    render(<NoticiasAdmin />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Publicar",
      })
    );

    const dialogo = screen.getByRole("alertdialog", {
      name: "¿Publicar noticia?",
    });

    expect(dialogo).toBeInTheDocument();

    // La publicación requiere confirmación.
    expect(api.patch).not.toHaveBeenCalled();

    fireEvent.click(
      within(dialogo).getByRole("button", {
        name: "Confirmar publicación",
      })
    );

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        "/noticias/noticia-1/estado",
        { activo: true },
        "token-admin"
      );
    });

    // Mensaje exacto de la aplicación.
    expect(
      await screen.findByRole("status")
    ).toHaveTextContent(
      "La noticia fue publicada correctamente."
    );

    expect(
      screen.queryByRole("alertdialog")
    ).not.toBeInTheDocument();
  });
});
