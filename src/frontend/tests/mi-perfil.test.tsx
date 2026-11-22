import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "../src/shared/api/client";
import MiPerfilPage from "../src/modulos/perfiles/shared/paginas/MiPerfilPage";

vi.mock("../src/shared/api/client", async (original) => {
  const modulo = await original<typeof import("../src/shared/api/client")>();
  return { ...modulo, api: { ...modulo.api, get: vi.fn(), patch: vi.fn() } };
});
vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({ useAuth: () => ({ user: {
  id: "usuario-prueba", rol: "ALUMNO", token: "token-prueba", nombre: "Ana", apellido: "Pérez", dni: "12345678", email: "ana@example.com"
} }) }));
const perfil = { version: 0, foto: null, datos: { nacionalidad: "Argentina", correo_alternativo: null, telefono_movil: "2211234567", domicilio: "", pais: "Argentina", provincia: "Buenos Aires", ciudad: "La Plata", notificaciones_automaticas: true }, carreras: [{ id: "legajo", carrera: "Maestría", cohorte: "2026" }] };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(api.get).mockResolvedValue(perfil); });
async function editar() {
  render(<MiPerfilPage />);
  await screen.findByDisplayValue("2211234567");
  fireEvent.click(screen.getByRole("button", { name: "Modificar" }));
  fireEvent.change(screen.getByLabelText("Teléfono móvil"), { target: { value: "2211234568" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
}
describe("Mi perfil persistente", () => {
  it("cancelar no envía cambios", async () => {
    await editar();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancelar" }));
    expect(api.patch).not.toHaveBeenCalled();
  });
  it("confirma y envía solamente el campo modificado", async () => {
    vi.mocked(api.patch).mockResolvedValue({ ...perfil, version: 1, datos: { ...perfil.datos, telefono_movil: "2211234568" } });
    await editar();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/autenticacion/mi-perfil", { version: 0, datos: { telefono_movil: "2211234568" } }, "token-prueba"));
    expect(await screen.findByText("Los cambios se guardaron correctamente.")).toBeInTheDocument();
  });
  it("conserva el borrador ante un conflicto", async () => {
    vi.mocked(api.patch).mockRejectedValue(new ApiError("El perfil cambió", 409));
    await editar();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByText("El perfil cambió")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2211234568")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Volver a cargar" })).toBeInTheDocument();
  });
});
