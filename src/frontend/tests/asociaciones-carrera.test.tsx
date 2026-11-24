import { render, screen, fireEvent } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AsociacionesCarrera from "../src/modulos/perfiles/administrador/componentes/AsociacionesCarrera";
import { api } from "../src/shared/api/client";
vi.mock("../src/shared/api/client", () => ({ api: { get: vi.fn() } }));
it("consulta asociaciones reales y filtra por cohorte", async () => {
  vi.mocked(api.get).mockResolvedValue({ alumnos: [{ id: "1", alumno: "Pérez, Ana", legajo: "INS-1", cohorte: "2026", estado: "ACTIVO" }], docentes: [{ id: "2", docente: "Docente A", seminario: "Sistemas", activo: true }] });
  render(<MemoryRouter><AsociacionesCarrera carrera={{id: "c1", nombre: "Sistemas"}} token="prueba" volver={vi.fn()} /></MemoryRouter>);
  expect(await screen.findByText("Pérez, Ana")).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith("/carreras/c1/asociaciones", "prueba");
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "2026" } });
  expect(screen.getByText("Pérez, Ana")).toBeInTheDocument();
  expect(screen.queryByText("Docente A")).not.toBeInTheDocument();
});


it("excluye alumnos asociados aunque tengan otro id de inscripción", async () => {
  vi.mocked(api.get).mockResolvedValueOnce({ alumnos: [{ id: "1", alumno: "Pérez, Ana", dni: "12.345", legajo: "L1", cohorte: "2026", estado: "ACTIVO" }], docentes: [] });
  vi.mocked(api.get).mockResolvedValueOnce({ alumnos: [{id: "otra", nombre: "Ana", dni: "12345", legajo: "L1"}, {id: "2", nombre: "Juan", dni: "67890", legajo: "L2"}], cohortes: [{id: "c2", nombre: "2027"}] });
  render(<MemoryRouter><AsociacionesCarrera carrera={{id: "c1", nombre: "Sistemas"}} token="prueba" /></MemoryRouter>);
  await screen.findByText("Pérez, Ana");
  fireEvent.click(screen.getByRole("button", {name: "+ Asociar alumno"}));
  expect(await screen.findByRole("option", {name: /Juan/})).toBeInTheDocument();
  expect(screen.queryByRole("option", {name: /Ana/})).not.toBeInTheDocument();
  expect(screen.getByRole("button", {name: "Guardar asociación"})).toBeDisabled();
});
