import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { api } from "../src/shared/api/client";
import SeminariosEstudiantePage from "../src/modulos/perfiles/estudiante/paginas/SeminariosEstudiantePage";
import EstadoAcademicoPage from "../src/modulos/perfiles/estudiante/paginas/EstadoAcademicoPage";
vi.mock("../src/shared/api/client", () => ({ api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({ useAuth: () => ({ user: { token: "prueba" } }) }));
const materia = { id: "s1", nombre: "Seminario de prueba", carrera_nombre: "Maestría", docente_nombre: "Docente", fecha_inicio: "2026-11-01", fecha_fin: "2026-12-01" };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(api.get).mockImplementation(async <T,>(ruta: string) => (ruta.endsWith("disponibles") ? [materia] : []) as T); });
it("no inscribe sin confirmar", async () => {
  render(<MemoryRouter initialEntries={["/dashboard/seminarios"]}><SeminariosEstudiantePage /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Inscribirme a un seminario" }));
  fireEvent.change(await screen.findByLabelText("Seminario disponible *"), { target: { value: "s1" } });
  fireEvent.click(screen.getByRole("button", { name: "Inscribirme" }));
  fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancelar" }));
  expect(api.post).not.toHaveBeenCalled();
});
it("inscribe una vez y no presenta asistencia ficticia", async () => {
  vi.mocked(api.post).mockResolvedValue({ inscripcion_id: "i1", seminario_id: "s1", seminario_nombre: materia.nombre, carrera_nombre: materia.carrera_nombre, asistencias: 0, total_clases: 0, porcentaje_asistencia: null, nota_final: null, estado: "CURSANDO" });
  render(<MemoryRouter initialEntries={["/dashboard/seminarios"]}><SeminariosEstudiantePage /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Inscribirme a un seminario" }));
  fireEvent.change(await screen.findByLabelText("Seminario disponible *"), { target: { value: "s1" } });
  fireEvent.click(screen.getByRole("button", { name: "Inscribirme" }));
  fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Confirmar inscripción" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
  expect(await screen.findByText("Sin clases registradas")).toBeInTheDocument();
});

const cursada = { inscripcion_id: "i1", seminario_id: "s1", seminario_nombre: materia.nombre, carrera_nombre: materia.carrera_nombre, asistencias: 0, total_clases: 0, porcentaje_asistencia: null, nota_final: null, estado: "CURSANDO" };

it("estado académico solo consulta el historial", async () => {
  render(<MemoryRouter><EstadoAcademicoPage /></MemoryRouter>);
  expect(await screen.findByText("Aún no registrás inscripciones a seminarios.")).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith("/seminarios/mi-cursada", "prueba");
  expect(api.get).not.toHaveBeenCalledWith("/seminarios/disponibles", "prueba");
  expect(screen.queryByRole("button", { name: "Inscribirme a un seminario" })).not.toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Condición académica" })).toBeInTheDocument();
});

it("no solicita la baja si se cancela", async () => {
  vi.mocked(api.get).mockImplementation(async <T,>(ruta: string) => (ruta.endsWith("disponibles") ? [materia] : [cursada]) as T);
  render(<MemoryRouter><SeminariosEstudiantePage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Desinscribirme" }));
  fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancelar" }));
  expect(api.delete).not.toHaveBeenCalled();
});

it("bloquea la baja cuando hay clases registradas", async () => {
  vi.mocked(api.get).mockImplementation(async <T,>(ruta: string) => (ruta.endsWith("disponibles") ? [] : [{ ...cursada, total_clases: 1 }]) as T);
  render(<MemoryRouter><SeminariosEstudiantePage /></MemoryRouter>);
  expect(await screen.findByRole("button", { name: "Desinscribirme" })).toBeDisabled();
  expect(api.delete).not.toHaveBeenCalled();
});

it("confirma la baja y actualiza el listado", async () => {
  let inscripto = true;
  vi.mocked(api.get).mockImplementation(async <T,>(ruta: string) => (ruta.endsWith("disponibles") ? [materia] : inscripto ? [cursada] : []) as T);
  vi.mocked(api.delete).mockImplementation(async () => { inscripto = false; return undefined as never; });
  render(<MemoryRouter><SeminariosEstudiantePage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Desinscribirme" }));
  fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Confirmar baja" }));
  await waitFor(() => expect(api.delete).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: "Inscribirme a un seminario" }));
  expect(await screen.findByRole("option", { name: `${materia.nombre} — ${materia.carrera_nombre}` })).toBeInTheDocument();
});


it("muestra el acceso a inscripción incluso cuando no hay seminarios disponibles", async () => {
  vi.mocked(api.get).mockResolvedValue([]);
  render(<MemoryRouter><SeminariosEstudiantePage /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Inscribirme a un seminario" }));
  expect(await screen.findByText("No tenés nuevos seminarios disponibles para inscribirte.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Inscribirme" })).toBeDisabled();
  expect(api.post).not.toHaveBeenCalled();
});
