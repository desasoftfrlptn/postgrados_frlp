import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import DashboardCPRPage from "../src/modulos/perfiles/cpr/paginas/DashboardCPRPage";
import { tesisApi } from "../src/shared/api/tesis";

vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({ useAuth: () => ({ user: { token: "prueba", rol: "CPR" } }) }));
vi.mock("../src/shared/api/tesis", () => ({ tesisApi: { listar: vi.fn(), candidatos: vi.fn() } }));
const candidato = { legajo_id: "l1", estudiante: "Ana Pérez", carrera: "Maestría en Datos", tipo: "Maestria", cohorte: "2026" };
function montar() { render(<MemoryRouter><DashboardCPRPage /></MemoryRouter>); }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(tesisApi.listar).mockResolvedValue([]); vi.mocked(tesisApi.candidatos).mockResolvedValue([]); });
it("muestra estudiantes habilitados e indicadores reales", async () => {
  vi.mocked(tesisApi.candidatos).mockResolvedValue([candidato]);
  montar();
  expect(await screen.findByText("Ana Pérez")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Estudiantes sin tesis registrada" }).parentElement).toHaveTextContent("1");
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
