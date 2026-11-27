
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import EventosAdmin from "../src/modulos/perfiles/administrador/home/secciones/EventosAdmin";
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

const eventoEjemplo = {
  id: "evento-1",
  titulo: "Inicio de clases 2026",
  descripcion: "Comienzo del ciclo lectivo.",
  fecha: "2026-11-25",
  tipo: "clases",
  activo: true,
};

beforeEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
  vi.mocked(api.put).mockReset();
  vi.mocked(api.patch).mockReset();

  vi.mocked(api.post).mockResolvedValue(eventoEjemplo);
  vi.mocked(api.put).mockResolvedValue(eventoEjemplo);
  vi.mocked(api.patch).mockResolvedValue(eventoEjemplo);
});

it("carga los eventos desde el Backend", async () => {
  vi.mocked(api.get).mockResolvedValue([eventoEjemplo]);

  render(<EventosAdmin />);

  expect(
    await screen.findByText("Inicio de clases 2026")
  ).toBeInTheDocument();

  expect(api.get).toHaveBeenCalledWith(
    "/eventos",
    "token-admin"
  );
});

it("permite crear un evento académico", async () => {
  vi.mocked(api.get).mockResolvedValue([]);

  render(<EventosAdmin />);

  fireEvent.click(
    screen.getByRole("button", { name: /Nuevo evento/i })
  );

  fireEvent.change(screen.getByLabelText("Título"), {
    target: { value: "Inicio de clases 2027" },
  });

  fireEvent.change(screen.getByLabelText("Fecha"), {
    target: { value: "2027-03-10" },
  });

  fireEvent.change(screen.getByLabelText("Descripción"), {
    target: { value: "Comienzo de las actividades." },
  });

  fireEvent.click(
    screen.getByRole("button", { name: "Crear evento" })
  );

  expect(api.post).not.toHaveBeenCalled();

  fireEvent.click(
    screen.getByRole("button", {
      name: "Confirmar guardado",
    })
  );

  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith(
      "/eventos",
      {
        titulo: "Inicio de clases 2027",
        descripcion: "Comienzo de las actividades.",
        fecha: "2027-03-10",
        tipo: "clases",
      },
      "token-admin"
    );
  });
});

it("permite especificar un tipo de evento personalizado", async () => {
  vi.mocked(api.get).mockResolvedValue([]);

  render(<EventosAdmin />);

  fireEvent.click(
    screen.getByRole("button", { name: /Nuevo evento/i })
  );

  fireEvent.change(screen.getByLabelText("Título"), {
    target: { value: "Defensa doctoral" },
  });

  fireEvent.change(screen.getByLabelText("Fecha"), {
    target: { value: "2026-11-27" },
  });

  fireEvent.change(screen.getByLabelText("Tipo de evento"), {
    target: { value: "otros" },
  });

  fireEvent.change(
    screen.getByLabelText("Especificá el tipo de evento"),
    { target: { value: "Defensa de tesis" } }
  );

  fireEvent.change(screen.getByLabelText("Descripción"), {
    target: { value: "Presentación del trabajo final." },
  });

  fireEvent.click(
    screen.getByRole("button", { name: "Crear evento" })
  );

  expect(api.post).not.toHaveBeenCalled();

  fireEvent.click(
    screen.getByRole("button", {
      name: "Confirmar guardado",
    })
  );

  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith(
      "/eventos",
      expect.objectContaining({
        tipo: "otros:Defensa de tesis",
      }),
      "token-admin"
    );
  });
});

it("recupera el tipo personalizado al editar un evento", async () => {
  vi.mocked(api.get).mockResolvedValue([
    {
      ...eventoEjemplo,
      titulo: "Defensa doctoral",
      tipo: "otros:Defensa de tesis",
    },
  ]);

  render(<EventosAdmin />);

  expect(
    await screen.findByText("Defensa doctoral")
  ).toBeInTheDocument();

  fireEvent.click(
    screen.getByRole("button", { name: "Editar" })
  );

  expect(
    screen.getByLabelText("Tipo de evento")
  ).toHaveValue("otros");

  expect(
    screen.getByLabelText("Especificá el tipo de evento")
  ).toHaveValue("Defensa de tesis");

  fireEvent.click(
    screen.getByRole("button", { name: "Guardar cambios" })
  );

  expect(api.put).not.toHaveBeenCalled();

  fireEvent.click(
    screen.getByRole("button", {
      name: "Confirmar guardado",
    })
  );

  await waitFor(() => {
    expect(api.put).toHaveBeenCalledWith(
      "/eventos/evento-1",
      expect.objectContaining({
        tipo: "otros:Defensa de tesis",
      }),
      "token-admin"
    );
  });
});

it("permite cancelar la desactivación de un evento", async () => {
  vi.mocked(api.get).mockResolvedValue([eventoEjemplo]);

  render(<EventosAdmin />);

  await screen.findByText("Inicio de clases 2026");

  fireEvent.click(
    screen.getByRole("button", { name: "Desactivar" })
  );

  expect(
    screen.getByRole("alertdialog")
  ).toBeInTheDocument();

  fireEvent.click(
    screen.getByRole("button", { name: "Cancelar" })
  );

  expect(
    screen.queryByRole("alertdialog")
  ).not.toBeInTheDocument();

  expect(api.patch).not.toHaveBeenCalled();
});

it("desactiva un evento después de confirmar", async () => {
  vi.mocked(api.get).mockResolvedValue([eventoEjemplo]);

  render(<EventosAdmin />);

  await screen.findByText("Inicio de clases 2026");

  fireEvent.click(
    screen.getByRole("button", { name: "Desactivar" })
  );

  fireEvent.click(
    screen.getByRole("button", { name: "Desactivar evento" })
  );

  await waitFor(() => {
    expect(api.patch).toHaveBeenCalledWith(
      "/eventos/evento-1/estado",
      { activo: false },
      "token-admin"
    );
  });
});

it("permite volver a activar un evento inactivo", async () => {
  vi.mocked(api.get).mockResolvedValue([
    { ...eventoEjemplo, activo: false },
  ]);

  render(<EventosAdmin />);

  await screen.findByText("Inicio de clases 2026");

  fireEvent.click(
    screen.getByRole("button", { name: "Activar" })
  );

  fireEvent.click(
    screen.getByRole("button", { name: "Activar evento" })
  );

  await waitFor(() => {
    expect(api.patch).toHaveBeenCalledWith(
      "/eventos/evento-1/estado",
      { activo: true },
      "token-admin"
    );
  });
});
