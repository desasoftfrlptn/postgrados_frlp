import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import ActivarCuentaPage from "../src/modulos/manejo-sesion/paginas/ActivarCuentaPage";
import { api, ApiError } from "../src/shared/api/client";
vi.mock("../src/shared/api/client", async importOriginal => {
  const original = await importOriginal<typeof import("../src/shared/api/client")>();
  return { ...original, api: { post: vi.fn() } };
});
beforeEach(() => { vi.mocked(api.post).mockReset(); });
function abrir(ruta = "/restablecer-contrasena#token=prueba") {
  render(<MemoryRouter initialEntries={[ruta]}><ActivarCuentaPage /></MemoryRouter>);
}
it("no presenta formulario para un enlace consumido", async () => {
  vi.mocked(api.post).mockRejectedValue(new ApiError("Enlace usado", 400));
  abrir();
  expect(screen.queryByLabelText("Nueva contraseña")).not.toBeInTheDocument();
  expect(await screen.findByRole("alert")).toHaveTextContent("ya fue utilizado");
  expect(screen.getByRole("link", { name: "Solicitar un nuevo enlace" })).toHaveAttribute("href", "/recuperar-contrasena");
});
it("valida el enlace antes de restablecer y muestra el botón de ingreso", async () => {
  vi.mocked(api.post).mockResolvedValue({});
  abrir();
  fireEvent.change(await screen.findByLabelText("Nueva contraseña"), {target: {value: "clave-nueva"}});
  fireEvent.change(screen.getByLabelText("Repetir contraseña"), {target: {value: "clave-nueva"}});
  fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }));
  await waitFor(() => expect(screen.getByRole("link", { name: "Ir a iniciar sesión" })).toHaveAttribute("href", "/login"));
  expect(api.post).toHaveBeenNthCalledWith(1, "/autenticacion/validar-enlace-acceso", {token: "prueba", recuperacion: true});
  expect(api.post).toHaveBeenNthCalledWith(2, "/autenticacion/restablecer-contrasena", {token: "prueba", contrasena_nueva: "clave-nueva", repetir_contrasena: "clave-nueva"});
});
it("permite reintentar si falla la conexión", async () => {
  vi.mocked(api.post).mockRejectedValueOnce(new Error("Sin conexión")).mockResolvedValueOnce({});
  abrir("/activar-cuenta#token=prueba");
  fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));
  expect(await screen.findByLabelText("Nueva contraseña")).toBeInTheDocument();
});
it("no consulta si falta el enlace", () => {
  abrir("/activar-cuenta");
  expect(screen.getByRole("alert")).toHaveTextContent("no es válido");
  expect(api.post).not.toHaveBeenCalled();
});
