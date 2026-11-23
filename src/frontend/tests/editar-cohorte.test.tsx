import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditarCohorte from "../src/modulos/perfiles/shared/componentes/EditarCohorte";
import { api } from "../src/shared/api/client";

vi.mock("../src/shared/api/client", () => ({ api: { put: vi.fn() } }));
const cohorte = { id: "1", nombre: "Cohorte 2026", anio: 2026, carrera_id: "c1", fecha_inicio: null, abierta: false };
const carreras = [{ id: "c1", nombre: "Sistemas", activo: true }];
const guardada = vi.fn();
function preparar() {
  render(<EditarCohorte cohorte={cohorte} carreras={carreras} token="prueba" cancelar={vi.fn()} guardada={guardada} />);
  fireEvent.change(screen.getByLabelText("Nombre *"), { target: { value: "Nuevo nombre" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  return screen.findByRole("alertdialog");
}
beforeEach(() => vi.clearAllMocks());
describe("Edición de cohortes", () => {
  it("no modifica si se cancela", async () => {
    fireEvent.click(within(await preparar()).getByRole("button", { name: "Cancelar" }));
    expect(api.put).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Nombre *")).toHaveValue("Nuevo nombre");
  });
  it("guarda una vez y devuelve la cohorte actualizada", async () => {
    const nueva = { ...cohorte, nombre: "Nuevo nombre" };
    vi.mocked(api.put).mockResolvedValueOnce(nueva);
    fireEvent.click(within(await preparar()).getByRole("button", { name: "Confirmar" }));
    await screen.findByRole("button", { name: "Guardar cambios" });
    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledWith("/cohortes/1", {nombre: "Nuevo nombre", anio: 2026, carrera_id: "c1", fecha_inicio: null, anterior: {nombre: "Cohorte 2026", anio: 2026, carrera_id: "c1", fecha_inicio: null}}, "prueba");
    // El consumidor vuelve al listado con la respuesta del servidor.
    await vi.waitFor(() => expect(guardada).toHaveBeenCalledWith(nueva));
  });
  it("mantiene los datos y muestra el conflicto junto al formulario", async () => {
    vi.mocked(api.put).mockRejectedValueOnce(new Error("No se puede cambiar la carrera ni el año."));
    fireEvent.click(within(await preparar()).getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se puede cambiar");
    expect(screen.getByLabelText("Nombre *")).toHaveValue("Nuevo nombre");
    expect(guardada).not.toHaveBeenCalled();
  });
});
