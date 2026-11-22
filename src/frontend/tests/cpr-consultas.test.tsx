import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import ConsultaCPR from "../src/modulos/perfiles/cpr/componentes/ConsultaCPR";
import { api } from "../src/shared/api/client";
vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({useAuth: () => ({user:{token:"cpr"}})}));
vi.mock("../src/shared/api/client", () => ({api:{get:vi.fn()}}));
beforeEach(() => vi.resetAllMocks());
it("consulta estudiantes con el token y filtra sin modificar datos", async () => {
  vi.mocked(api.get).mockResolvedValue([{legajo_id:"a", estudiante:"Pérez, Ana", carrera:"Maestría", tipo:"Maestria", cohorte:"2026", estado:"ACTIVO", trabajo:"Sin registro"}]);
  render(<ConsultaCPR modo="estudiantes"/>);
  expect(await screen.findByText("Pérez, Ana")).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith("/inscripcion/tesis/estudiantes", "cpr");
  fireEvent.change(screen.getByLabelText("Buscar"), {target:{value:"Otro"}});
  expect(screen.queryByText("Pérez, Ana")).not.toBeInTheDocument();
});
it("permite reintentar la consulta de docentes", async () => {
  vi.mocked(api.get).mockRejectedValueOnce(new Error("red")).mockResolvedValueOnce([]);
  render(<ConsultaCPR modo="docentes"/>);
  fireEvent.click(await screen.findByRole("button", {name:"Reintentar"}));
  expect(await screen.findByText(/No se encontraron registros/)).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledTimes(2);
});
