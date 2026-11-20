
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import NoticiasAdmin from "../src/modulos/perfiles/administrador/home/secciones/NoticiasAdmin";
import { api } from "../src/shared/api/client";

vi.mock("../src/shared/api/client", () => ({
  api: {
    get: vi.fn(),
    postForm: vi.fn(),
    putForm: vi.fn(),
    patch: vi.fn(),
  },
  obtenerUrlArchivo: (ruta: string | null) => ruta ?? "",
}));

vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({
  useAuth: () => ({
    user: { token: "token-admin" },
  }),
}));

const noticia = {
  id: "noticia-1",
  titulo: "Nueva carrera de posgrado",
  categoria: "Académico",
  resumen: "Se presentó una nueva carrera.",
  contenido: "Información sobre la nueva carrera.",
  fecha: "2026-11-19",
  imagen_url: null,
  activo: true,
};

beforeEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.postForm).mockReset();
  vi.mocked(api.patch).mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("permite crear una noticia", async () => {
  vi.mocked(api.get).mockResolvedValue([]);
  vi.mocked(api.postForm).mockResolvedValue(noticia);

  render(<NoticiasAdmin />);

  fireEvent.click(
    screen.getByRole("button", { name: /Nueva noticia/i })
  );

  fireEvent.change(screen.getByLabelText("Título"), {
    target: { value: "Nueva carrera de posgrado" },
  });

  fireEvent.change(screen.getByLabelText("Categoría"), {
    target: { value: "Académico" },
  });

  fireEvent.change(screen.getByLabelText("Fecha"), {
    target: { value: "2026-11-19" },
  });

  fireEvent.change(screen.getByLabelText("Resumen"), {
    target: { value: "Se presentó una nueva carrera." },
  });

  fireEvent.change(screen.getByLabelText("Contenido"), {
    target: { value: "Información sobre la nueva carrera." },
  });

  fireEvent.click(
    screen.getByRole("button", { name: "Crear noticia" })
  );

  await waitFor(() => {
    expect(api.postForm).toHaveBeenCalledWith(
      "/noticias",
      expect.any(FormData),
      "token-admin"
    );
  });
});

it("permite despublicar una noticia", async () => {
  vi.mocked(api.get).mockResolvedValue([noticia]);
  vi.mocked(api.patch).mockResolvedValue({
    ...noticia,
    activo: false,
  });

  vi.stubGlobal("confirm", vi.fn(() => true));

  render(<NoticiasAdmin />);

  expect(
    await screen.findByText("Nueva carrera de posgrado")
  ).toBeInTheDocument();

  fireEvent.click(
    screen.getByRole("button", { name: "Despublicar" })
  );

  await waitFor(() => {
    expect(api.patch).toHaveBeenCalledWith(
      "/noticias/noticia-1/estado",
      { activo: false },
      "token-admin"
    );
  });
});
