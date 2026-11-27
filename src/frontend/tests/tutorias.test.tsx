import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, it, expect, vi } from "vitest";
import TutoriasGestionPage from "../src/modulos/perfiles/shared/paginas/TutoriasGestionPage";
import { api } from "../src/shared/api/client";
const sesion = vi.hoisted(() => ({ rol: "DOCENTE" }));
vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({ useAuth: () => ({ user: { token: "prueba", rol: sesion.rol } }) }));
vi.mock("../src/shared/api/client", () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
const registros = [{ id: "t1", legajo_id: "l1", estudiante: "Pérez, Ana", carrera: "Maestría", cohorte: "2026", estado_legajo: "ACTIVO", tutor: "Tutor real", activa: true, editable: true, encuentros: [] }];
beforeEach(() => { vi.clearAllMocks(); sesion.rol = "DOCENTE"; vi.mocked(api.get).mockResolvedValue(registros); });
it("muestra encuentros reales sin acciones de escritura al alumno", async () => {
  sesion.rol = "ALUMNO";
  render(<TutoriasGestionPage />);
  expect(await screen.findByText("Tutor: Tutor real")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Registrar encuentro" })).not.toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith("/tutorias", "prueba");
});
async function completar() {
  render(<TutoriasGestionPage />);
  fireEvent.click(await screen.findByRole("button", {name:"Registrar encuentro"}));
  fireEvent.change(screen.getByLabelText("Fecha *"), {target:{value:"2026-01-01"}});
  fireEvent.change(screen.getByLabelText("Observaciones y acuerdos *"), {target:{value:"Revisión"}});
  fireEvent.click(screen.getByRole("button", {name:"Guardar"}));
}
it("cancelar no registra el encuentro", async () => {
  await completar();
  const dialogo = await screen.findByRole("alertdialog");
  fireEvent.click(Array.from(dialogo.querySelectorAll("button")).find(b => b.textContent === "Cancelar")!);
  expect(api.post).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Observaciones y acuerdos *")).toHaveValue("Revisión");
});
it("registra solo al confirmar", async () => {
  vi.mocked(api.post).mockResolvedValue({id:"e1"});
  await completar();
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", {name:"Confirmar"}));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/tutorias/t1/encuentros", {fecha:"2026-01-01", estado:"PENDIENTE", observaciones:"Revisión"}, "prueba"));
});
