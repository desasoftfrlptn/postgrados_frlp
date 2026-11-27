import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import TrabajosPracticosCPRPage from "../src/modulos/perfiles/cpr/paginas/TrabajosPracticosCPRPage";
import TutoriasCPRPage from "../src/modulos/perfiles/cpr/paginas/TutoriasCPRPage";
import { menuCPR } from "../src/modulos/perfiles/cpr/config/menuCPR";
import { api } from "../src/shared/api/client";

vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({
  useAuth: () => ({ user: { token: "cpr", rol: "CPR" } }),
}));
vi.mock("../src/shared/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));

const alumno = { legajo_id: "l1", estudiante: "Pérez, Ana", carrera: "Maestría", cohorte: "2026", estado: "ACTIVO" };
const trabajo = { id: "tp1", ...alumno, titulo: "Investigación", descripcion: "Descripción", fecha: "2026-01-15", activo: true, version: 1, estado_legajo: "ACTIVO" };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.get).mockImplementation(async (ruta) => {
    if (ruta === "/inscripcion/tesis/estudiantes") return [alumno, { ...alumno, legajo_id: "l2", estudiante: "No habilitado", estado: "PENDIENTE" }] as never;
    if (ruta === "/tutorias/candidatos") return { legajos: [{ ...alumno, estado_legajo: "ACTIVO" }], docentes: [{ id: "d1", nombre: "Tutor de prueba" }] } as never;
    if (ruta === "/inscripcion/trabajos-practicos") return [trabajo] as never;
    return [] as never;
  });
});

it("incorpora accesos independientes al menú CPR", () => {
  expect(menuCPR).toEqual(expect.arrayContaining([
    expect.objectContaining({ ruta: "/dashboard/cpr/trabajos-practicos" }),
    expect.objectContaining({ ruta: "/dashboard/cpr/tutorias" }),
  ]));
});

async function completarTrabajo() {
  render(<TrabajosPracticosCPRPage />);
  fireEvent.click(await screen.findByRole("button", { name: "+ Nuevo trabajo práctico" }));
  expect(screen.queryByRole("option", { name: /No habilitado/ })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Estudiante"), { target: { value: "l1" } });
  fireEvent.change(screen.getByLabelText("Fecha"), { target: { value: "2026-01-15" } });
  fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Trabajo nuevo" } });
  fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Descripción nueva" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
}

it("no registra el trabajo práctico si se cancela la confirmación", async () => {
  await completarTrabajo();
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancelar" }));
  expect(api.post).not.toHaveBeenCalled();
});

it("registra el trabajo asociado al estudiante al confirmar", async () => {
  await completarTrabajo();
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Confirmar" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/inscripcion/trabajos-practicos", {
    legajo_id: "l1", titulo: "Trabajo nuevo", descripcion: "Descripción nueva", fecha: "2026-01-15",
  }, "cpr"));
});

it("modifica un trabajo conservando su versión", async () => {
  render(<TrabajosPracticosCPRPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Modificar" }));
  fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Título modificado" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Confirmar" }));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith("/inscripcion/trabajos-practicos/tp1", {
    titulo: "Título modificado", descripcion: "Descripción", fecha: "2026-01-15", version: 1,
  }, "cpr"));
});

it("da de baja un trabajo solo después de confirmar", async () => {
  render(<TrabajosPracticosCPRPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Dar de baja" }));
  expect(api.patch).not.toHaveBeenCalled();
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Confirmar" }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/inscripcion/trabajos-practicos/tp1/estado", { activo: false, version: 1 }, "cpr"));
});

it("asocia estudiante y tutor desde la página independiente", async () => {
  render(<TutoriasCPRPage />);
  fireEvent.click(await screen.findByRole("button", { name: "+ Nueva tutoría" }));
  fireEvent.change(screen.getByLabelText("Carrera *"), { target: { value: "Maestría" } });
  fireEvent.change(screen.getByLabelText("Cohorte *"), { target: { value: "2026" } });
  fireEvent.change(screen.getByLabelText("Estudiante *"), { target: { value: "l1" } });
  fireEvent.change(screen.getByLabelText("Tutor *"), { target: { value: "d1" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Confirmar" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/tutorias", { legajo_id: "l1", tutor_id: "d1" }, "cpr"));
});
