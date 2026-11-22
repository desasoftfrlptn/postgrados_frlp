import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import RecuperarContrasenaPage from "../src/modulos/manejo-sesion/paginas/RecuperarContrasenaPage";
import { api } from "../src/shared/api/client";
vi.mock("../src/shared/api/client", () => ({ api: { post: vi.fn() } }));
vi.mock("../src/modulos/manejo-sesion/components/Captcha", () => ({ default: ({onVerify}: {onVerify: (token: string) => void}) => <button type="button" onClick={() => onVerify("captcha-prueba")}>Verificar CAPTCHA</button> }));
beforeEach(() => { vi.mocked(api.post).mockReset(); });
function abrir() {
  render(<MemoryRouter><RecuperarContrasenaPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText(/Correo Electrónico/), {target:{value:"prueba@example.com"}});
}
it("no envía la solicitud sin CAPTCHA", () => {
  abrir(); fireEvent.click(screen.getByRole("button", {name:"Recuperar"}));
  expect(api.post).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("CAPTCHA");
});
it("envía la solicitud real y muestra una respuesta genérica", async () => {
  vi.mocked(api.post).mockResolvedValue({}); abrir();
  fireEvent.click(screen.getByRole("button", {name:"Verificar CAPTCHA"}));
  fireEvent.click(screen.getByRole("button", {name:"Recuperar"}));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Si la cuenta está habilitada"));
  expect(api.post).toHaveBeenCalledWith("/autenticacion/recuperar-contrasena", {correo_electronico:"prueba@example.com", captcha:"captcha-prueba"});
});
it("informa un fallo de la API", async () => {
  vi.mocked(api.post).mockRejectedValue(new Error("Servicio no disponible")); abrir();
  fireEvent.click(screen.getByRole("button", {name:"Verificar CAPTCHA"}));
  fireEvent.click(screen.getByRole("button", {name:"Recuperar"}));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Servicio no disponible"));
});
