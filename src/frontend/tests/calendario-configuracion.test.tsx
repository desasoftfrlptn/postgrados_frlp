import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import CalendarioPublicoAdmin from "../src/modulos/perfiles/administrador/home/secciones/CalendarioPublicoAdmin";
import { api } from "../src/shared/api/client";

vi.mock("../src/shared/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({
  useAuth: () => ({
    user: { token: "token-admin" },
  }),
}));

const configuracion = {
  valores: {
    titulo: "Calendario Académico",
    descripcion: "Fechas del ciclo lectivo",
    anio_minimo: "2025",
    anio_maximo: "2028",
  },
};

beforeEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.put).mockReset();

  vi.mocked(api.get).mockImplementation(async (ruta) => {
    if (ruta === "/configuracion-publica/calendario") {
      return configuracion;
    }

    if (ruta === "/eventos") {
      return [];
    }

    throw new Error(`Ruta no esperada: ${ruta}`);
  });

  vi.mocked(api.put).mockResolvedValue(configuracion);
});

it("muestra los datos guardados en modo lectura", async () => {
  render(<CalendarioPublicoAdmin />);

  expect(
    await screen.findByText("Fechas del ciclo lectivo")
  ).toBeInTheDocument();

  expect(
    screen.getByRole("button", { name: "Modificar" })
  ).toBeInTheDocument();

  expect(
    screen.queryByRole("textbox", { name: "Título de la página" })
  ).not.toBeInTheDocument();
});

it("habilita la edición y guarda los cambios", async () => {
  render(<CalendarioPublicoAdmin />);

  await screen.findByText("Fechas del ciclo lectivo");

  fireEvent.click(
    screen.getByRole("button", { name: "Modificar" })
  );

  fireEvent.change(
    screen.getByRole("textbox", { name: "Título de la página" }),
    { target: { value: "Nuevo calendario" } }
  );

  fireEvent.click(
    screen.getByRole("button", { name: "Guardar cambios" })
  );

  expect(api.put).not.toHaveBeenCalled();

  expect(
    screen.getByRole("alertdialog")
  ).toBeInTheDocument();

  fireEvent.click(
    screen.getByRole("button", {
      name: "Confirmar guardado",
    })
  );

  await waitFor(() => {
    expect(api.put).toHaveBeenCalledWith(
      "/configuracion-publica/calendario",
      {
        valores: expect.objectContaining({
          titulo: "Nuevo calendario",
          anio_maximo: "2028",
        }),
      },
      "token-admin"
    );
  });
});

it("permite cancelar sin guardar modificaciones", async () => {
  render(<CalendarioPublicoAdmin />);

  await screen.findByText("Fechas del ciclo lectivo");

  fireEvent.click(
    screen.getByRole("button", { name: "Modificar" })
  );

  fireEvent.change(
    screen.getByRole("textbox", { name: "Título de la página" }),
    { target: { value: "Cambio descartado" } }
  );

  fireEvent.click(
    screen.getByRole("button", { name: "Cancelar" })
  );

  expect(
    screen.getByRole("button", { name: "Modificar" })
  ).toBeInTheDocument();

  expect(
    screen.queryByText("Cambio descartado")
  ).not.toBeInTheDocument();

  expect(api.put).not.toHaveBeenCalled();
});
