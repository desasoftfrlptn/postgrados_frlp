import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import DashboardCPRPage from "../src/modulos/perfiles/cpr/paginas/DashboardCPRPage";
import { api } from "../src/shared/api/client";
import { tesisApi } from "../src/shared/api/tesis";

vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({ useAuth: () => ({ user: { token: "prueba", rol: "CPR" } }) }));
vi.mock("../src/shared/api/tesis", () => ({ tesisApi: { listar: vi.fn(), candidatos: vi.fn() } }));
vi.mock("../src/shared/api/client", () => ({ api: { get: vi.fn() } }));
vi.mock("../src/modulos/perfiles/shared/componentes/ListaAlertas", () => ({ default: () => null }));
const candidato = { legajo_id: "l1", estudiante: "Ana Pérez", carrera: "Maestría en Datos", tipo: "Maestria", cohorte: "2026" };
function montar() { render(<MemoryRouter><DashboardCPRPage /></MemoryRouter>); }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(api.get).mockResolvedValue([]); vi.mocked(tesisApi.listar).mockResolvedValue([]); vi.mocked(tesisApi.candidatos).mockResolvedValue([]); });
it("muestra estudiantes habilitados e indicadores reales", async () => {
  vi.mocked(tesisApi.candidatos).mockResolvedValue([candidato]);
  montar();
  expect(await screen.findByText("Ana Pérez")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Estudiantes habilitados para registrar tesis (1)" }).parentElement).toHaveTextContent("1");
  expect(tesisApi.candidatos).toHaveBeenCalledWith("prueba");
});
it("distingue una consulta vacía de un fallo", async () => {
  montar();
  expect(await screen.findByText("No hay tesis pendientes de aprobación.")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Tesis registradas" }).parentElement).toHaveTextContent("0");
});
it("permite reintentar sin mostrar ceros inventados", async () => {
  vi.mocked(tesisApi.listar).mockRejectedValueOnce(new Error("Sin conexión"));
  montar();
  expect(await screen.findByText("No se pudo cargar el resumen de CPR.")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Tesis registradas" }).parentElement).toHaveTextContent("—");
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(await screen.findByText("No hay tesis pendientes de aprobación.")).toBeInTheDocument();
});

it("cuenta docentes sin duplicar y muestra solo trabajos y tutorías activos", async () => {
  vi.mocked(api.get).mockResolvedValueOnce([{legajo_id: "l1"}])
    .mockResolvedValueOnce([{id: "d1"}, {id: "d1"}])
    .mockResolvedValueOnce([{activo: true}, {activo: false}])
    .mockResolvedValueOnce([{activa: true}, {activa: false}]);
  montar();
  await screen.findByText("No hay tesis pendientes de aprobación.");
  for (const nombre of ["Estudiantes matriculados", "Docentes con seminarios", "Trabajos prácticos activos", "Tutorías activas"]) {
    expect(screen.getByRole("heading", {name: nombre}).parentElement).toHaveTextContent("1");
  }
  expect(screen.queryByRole("heading", {name: "Aprobadas por CPR"})).not.toBeInTheDocument();
});
it("conserva los indicadores disponibles ante un fallo parcial", async () => {
  vi.mocked(api.get).mockRejectedValueOnce(new Error("red"));
  montar();
  await screen.findByText("No se pudo cargar el resumen de CPR.");
  expect(screen.getByRole("heading", {name: "Estudiantes matriculados"}).parentElement).toHaveTextContent("—");
  expect(screen.getByRole("heading", {name: "Tutorías activas"}).parentElement).toHaveTextContent("0");
});
