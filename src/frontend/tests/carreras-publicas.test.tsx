
// Pruebas de la página pública de carreras.

import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";

import PaginaCarreras from "../src/modulos/carreras/paginas/PaginaCarreras";
import { api } from "../src/shared/api/client";

vi.mock("../src/shared/api/client", () => ({
  api: { get: vi.fn() },
}));

const carreras = [
  {
    id: "1",
    nombre: "Especialización en Sistemas",
    tipo: "Especializacion",
    descripcion: "Carrera de especialización",
    duracion: "2 años",
    activo: true,
  },
  {
    id: "2",
    nombre: "Maestría en Tecnología",
    tipo: "Maestria",
    descripcion: "Carrera de maestría",
    duracion: "2 años",
    activo: true,
  },
  {
    id: "3",
    nombre: "Doctorado inactivo",
    tipo: "Doctorado",
    descripcion: "Carrera desactivada",
    duracion: "4 años",
    activo: false,
  },
];

beforeEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.get).mockResolvedValue(carreras);
});

function mostrarPagina() {
  render(
    <MemoryRouter>
      <PaginaCarreras />
    </MemoryRouter>
  );
}

it("muestra las carreras activas del Backend", async () => {
  mostrarPagina();

  expect(await screen.findByText("Especialización en Sistemas"))
    .toBeInTheDocument();

  expect(screen.getByText("Maestría en Tecnología"))
    .toBeInTheDocument();

  expect(screen.queryByText("Doctorado inactivo"))
    .not.toBeInTheDocument();

  expect(api.get).toHaveBeenCalledWith("/carreras");
});

it("filtra las carreras por categoría", async () => {
  mostrarPagina();

  await screen.findByText("Especialización en Sistemas");

  fireEvent.click(
    screen.getByRole("button", { name: "Maestrías" })
  );

  expect(screen.getByText("Maestría en Tecnología"))
    .toBeInTheDocument();

  expect(screen.queryByText("Especialización en Sistemas"))
    .not.toBeInTheDocument();
});
