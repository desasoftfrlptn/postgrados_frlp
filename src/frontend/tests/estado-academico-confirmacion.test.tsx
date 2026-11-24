import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { api } from "../src/shared/api/client";
import EstadoAcademicoPage from "../src/modulos/perfiles/estudiante/paginas/EstadoAcademicoPage";
vi.mock("../src/shared/api/client", () => ({ api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({ useAuth: () => ({ user: { token: "prueba" } }) }));
const materia = { id: "s1", nombre: "Seminario de prueba", carrera_nombre: "Maestría", docente_nombre: "Docente", fecha_inicio: "2026-11-01", fecha_fin: "2026-12-01" };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(api.get).mockImplementation(async <T,>(ruta: string) => (ruta.endsWith("disponibles") ? [materia] : []) as T); });
it("no inscribe sin confirmar", async () => {
  render(<MemoryRouter initialEntries={["/dashboard/estado-academico?vista=seminarios"]}><EstadoAcademicoPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Inscribirme" }));
  fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancelar" }));
  expect(api.post).not.toHaveBeenCalled();
});
it("inscribe una vez y no presenta asistencia ficticia", async () => {
  vi.mocked(api.post).mockResolvedValue({ inscripcion_id: "i1", seminario_id: "s1", seminario_nombre: materia.nombre, carrera_nombre: materia.carrera_nombre, asistencias: 0, total_clases: 0, porcentaje_asistencia: null, nota_final: null, estado: "CURSANDO" });
  render(<MemoryRouter initialEntries={["/dashboard/estado-academico?vista=seminarios"]}><EstadoAcademicoPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Inscribirme" }));
  fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Confirmar inscripción" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
  expect(await screen.findByText("Sin clases registradas")).toBeInTheDocument();
});
