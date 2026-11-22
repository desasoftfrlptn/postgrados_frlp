import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import ConsultaTesis from "../src/modulos/perfiles/shared/componentes/ConsultaTesis";
import { tesisApi, type RegistroTesis } from "../src/shared/api/tesis";
import { ApiError } from "../src/shared/api/client";

const sesion = vi.hoisted(() => ({ rol: "CPR" }));
vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({
  useAuth: () => ({ user: { token: "prueba", rol: sesion.rol } }),
}));
vi.mock("../src/shared/api/tesis", () => ({
  tesisApi: { listar: vi.fn(), candidatos: vi.fn(), crear: vi.fn(), modificar: vi.fn() },
}));

const candidato = { legajo_id: "legajo-1", estudiante: "Pérez, Ana", carrera: "Maestría en Datos", tipo: "Maestria", cohorte: "2026" };
const registro: RegistroTesis = {
  ...candidato, legajo_id: "legajo-2", id: "tesis-1", version: 1,
  titulo: "Análisis de datos académicos", director: "Persona Directora", codirector: null,
  fecha_aprobacion: null, numero_resolucion: null,
};

beforeEach(() => {
  vi.resetAllMocks();
  sesion.rol = "CPR";
  vi.mocked(tesisApi.listar).mockResolvedValue([registro]);
  vi.mocked(tesisApi.candidatos).mockResolvedValue([candidato]);
  vi.mocked(tesisApi.crear).mockResolvedValue(registro);
  vi.mocked(tesisApi.modificar).mockResolvedValue({ ...registro, version: 2 });
});

async function montarCPR() {
  render(<ConsultaTesis editable />);
  await screen.findByText(registro.titulo);
}

async function completarAlta() {
  await montarCPR();
  fireEvent.click(screen.getByRole("button", { name: "Registrar tesis" }));
  fireEvent.change(screen.getByLabelText("Estudiante y cohorte"), { target: { value: candidato.legajo_id } });
  fireEvent.change(screen.getByLabelText("Título de la tesis"), { target: { value: "Proyecto de investigación" } });
  fireEvent.change(screen.getByLabelText("Director", { exact: true }), { target: { value: "Dirección de prueba" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
}

it("carga registros reales y filtra por estado", async () => {
  await montarCPR();
  expect(tesisApi.listar).toHaveBeenCalledWith("prueba");
  fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "aprobada" } });
  expect(screen.queryByText(registro.titulo)).not.toBeInTheDocument();
});

it("cancelar la confirmación no registra la tesis", async () => {
  await completarAlta();
  fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancelar" }));
  expect(tesisApi.crear).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Título de la tesis")).toHaveValue("Proyecto de investigación");
});

it("registra una tesis solo al confirmar", async () => {
  await completarAlta();
  expect(tesisApi.crear).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Guardar" }));
  await waitFor(() => expect(tesisApi.crear).toHaveBeenCalledTimes(1));
  expect(tesisApi.crear).toHaveBeenCalledWith(expect.objectContaining({ legajo_id: candidato.legajo_id, titulo: "Proyecto de investigación" }), "prueba");
  expect(await screen.findByText("Tesis guardada correctamente.")).toBeInTheDocument();
});

it("exige fecha y resolución juntas", async () => {
  await montarCPR();
  fireEvent.click(screen.getByRole("button", { name: "Editar" }));
  fireEvent.change(screen.getByLabelText("Número de resolución"), { target: { value: "CPR-2026-1" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  expect(await screen.findByText(/deben completarse juntas/)).toBeInTheDocument();
  expect(tesisApi.modificar).not.toHaveBeenCalled();
});

it("conserva el formulario y evita sobrescribir versiones ante 409", async () => {
  vi.mocked(tesisApi.modificar).mockRejectedValue(new ApiError("La tesis fue modificada.", 409));
  await montarCPR();
  fireEvent.click(screen.getByRole("button", { name: "Editar" }));
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Guardar" }));
  expect(await screen.findByText(/Cerrá este formulario/)).toBeInTheDocument();
  expect(tesisApi.modificar).toHaveBeenCalledWith(registro.id, expect.objectContaining({ version: 1 }), "prueba");
});

it.each(["ALUMNO", "COORDINADOR"])("%s consulta sin controles de escritura", async rol => {
  sesion.rol = rol;
  render(<ConsultaTesis editable />);
  expect(await screen.findByText(registro.titulo)).toBeInTheDocument();
  expect(tesisApi.candidatos).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Registrar tesis" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
});

it("permite reintentar si falla la consulta", async () => {
  vi.mocked(tesisApi.listar).mockRejectedValueOnce(new Error("Sin conexión"));
  render(<ConsultaTesis editable />);
  expect(await screen.findByText("Sin conexión")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(await screen.findByText(registro.titulo)).toBeInTheDocument();
});


it("explica el estado vacío de CPR y permite actualizar", async () => {
  vi.mocked(tesisApi.listar).mockResolvedValue([]);
  vi.mocked(tesisApi.candidatos).mockResolvedValue([]);
  render(<ConsultaTesis editable />);
  expect(await screen.findByText("No hay estudiantes habilitados para registrar una tesis")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Registrar tesis" })).toBeDisabled();
  expect(screen.getByText("Todavía no hay tesis registradas")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Actualizar listado" }));
  await waitFor(() => expect(tesisApi.candidatos).toHaveBeenCalledTimes(2));
});
