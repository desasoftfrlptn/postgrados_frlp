import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProveedorAlertas from "../src/modulos/perfiles/shared/componentes/ProveedorAlertas";
import CampanaAlertas from "../src/modulos/perfiles/shared/componentes/CampanaAlertas";
import { api } from "../src/shared/api/client";
vi.mock("../src/shared/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/shared/api/client")>();
  return { ...original, api: { ...original.api, get: vi.fn(), patch: vi.fn() } };
});
const alerta = { id: "a1", titulo: "Inscripción aprobada", mensaje: "Nueva inscripción", ruta: "/dashboard/administrador/usuarios", fecha: "2026-11-22T05:00:00Z", leida: false };
function abrir(token = "token-prueba") {
  render(<MemoryRouter><ProveedorAlertas token={token}><CampanaAlertas /></ProveedorAlertas></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: /Notificaciones/i }));
}
beforeEach(() => { vi.resetAllMocks(); });
describe("Bandeja compartida de notificaciones", () => {
  it("consulta con el token y muestra la bandeja vacía", async () => {
    vi.mocked(api.get).mockResolvedValue({ sin_leer: 0, alertas: [] });
    abrir();
    expect(await screen.findByText(/No tenés notificaciones/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/inscripcion/alertas", "token-prueba");
    expect(screen.getByRole("button", { name: "Marcar todas como leídas" })).toBeDisabled();
  });
  it("permite reintentar cuando falla la carga", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("Error de conexión")).mockResolvedValue({ sin_leer: 0, alertas: [] });
    abrir();
    expect(await screen.findByRole("alert")).toHaveTextContent("Error de conexión");
    expect(api.get).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText(/No tenés notificaciones/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
  });
  it("actualiza contador después de marcar una notificación", async () => {
    vi.mocked(api.get).mockResolvedValue({ sin_leer: 1, alertas: [alerta] });
    vi.mocked(api.patch).mockResolvedValue({ ok: true });
    abrir();
    await screen.findByText(alerta.titulo);
    vi.mocked(api.get).mockResolvedValue({ sin_leer: 0, alertas: [{ ...alerta, leida: true }] });
    fireEvent.click(screen.getByRole("button", { name: "Marcar como leída" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Notificaciones: 0 sin leer" })).toBeInTheDocument());
    expect(api.patch).toHaveBeenCalledWith("/inscripcion/alertas/a1/leida", undefined, "token-prueba");
  });
  it("rechaza respuestas incompatibles", async () => {
    vi.mocked(api.get).mockResolvedValue({ sin_leer: 0 });
    abrir();
    expect(await screen.findByRole("alert")).toHaveTextContent("formato inválido");
  });
});
