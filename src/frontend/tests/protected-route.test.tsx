import { render, screen } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
} from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import ProtectedRoute from "../src/modulos/manejo-sesion/ProtectedRoute";
import {
  AuthContext,
  type AuthState,
} from "../src/modulos/manejo-sesion/useAuth";

function usuarioConRol(rol: AuthState["rol"]): AuthState {
  return {
    id: "usuario-1",
    nombre: "Ana",
    apellido: "Perez",
    dni: "12345678",
    email: "ana@example.com",
    rol,
    token: "token-prueba",
    debeCambiarContrasena: false,
  };
}

function mostrarRuta(user: AuthState | null) {
  render(
    <AuthContext.Provider
      value={{
        user,
        login: vi.fn(async () => usuarioConRol("ADMIN")),
        logout: vi.fn(),
        confirmarCambioContrasena: vi.fn(),
      }}
    >
      <MemoryRouter initialEntries={["/privado"]}>
        <Routes>
          <Route path="/login" element={<p>Inicio de sesión</p>} />
          <Route
            path="/dashboard/general"
            element={<p>Panel general</p>}
          />

          <Route
            element={<ProtectedRoute rolesPermitidos={["ADMIN"]} />}
          >
            <Route
              path="/privado"
              element={<p>Contenido privado</p>}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("ProtectedRoute", () => {
  it("envía al login si no hay sesión", () => {
    mostrarRuta(null);

    expect(screen.getByText("Inicio de sesión")).toBeInTheDocument();
    expect(screen.queryByText("Contenido privado")).not.toBeInTheDocument();
  });

  it.each([
    "ASPIRANTE",
    "DOCENTE",
    "COORDINADOR",
    "CPR",
  ] as const)("rechaza el rol %s", (rol) => {
    mostrarRuta(usuarioConRol(rol));

    expect(screen.getByText("Panel general")).toBeInTheDocument();
    expect(screen.queryByText("Contenido privado")).not.toBeInTheDocument();
  });

  it("permite el rol autorizado", () => {
    mostrarRuta(usuarioConRol("ADMIN"));

    expect(screen.getByText("Contenido privado")).toBeInTheDocument();
  });
});