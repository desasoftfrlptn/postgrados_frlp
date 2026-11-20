
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProtectedRoute from "../src/modulos/manejo-sesion/ProtectedRoute";
import AccesoDenegadoPage from "../src/modulos/manejo-sesion/paginas/AccesoDenegadoPage";
import { useAuth } from "../src/modulos/manejo-sesion/useAuth";
import type { Rol } from "../src/shared/tipos";

vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({
  useAuth: vi.fn(),
}));

type Usuario = NonNullable<ReturnType<typeof useAuth>["user"]>;

function usuarioConRol(rol: Rol): Usuario {
  return {
    nombre: "Usuario",
    apellido: "Prueba",
    rol,
  } as Usuario;
}

function mostrarRuta(
  usuario: Usuario | null,
  rolesPermitidos?: Rol[],
) {
  vi.mocked(useAuth).mockReturnValue({
    user: usuario,
  } as ReturnType<typeof useAuth>);

  return render(
    <MemoryRouter initialEntries={["/dashboard/administrador"]}>
      <Routes>
        <Route
          path="/login"
          element={<div>Inicio de sesión</div>}
        />

        <Route
          path="/dashboard/acceso-denegado"
          element={<AccesoDenegadoPage />}
        />

        <Route
          path="/dashboard/administrador"
          element={
            <ProtectedRoute rolesPermitidos={rolesPermitidos}>
              <div>Contenido privado</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("envía al login si no hay sesión", () => {
    mostrarRuta(null, ["ADMIN"]);

    expect(
      screen.getByText("Inicio de sesión"),
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Contenido privado"),
    ).not.toBeInTheDocument();
  });

  it.each<Rol>([
    "ASPIRANTE",
    "ALUMNO",
    "DOCENTE",
    "COORDINADOR",
    "CPR",
  ])("rechaza el rol %s", (rol) => {
    mostrarRuta(usuarioConRol(rol), ["ADMIN"]);

    expect(
      screen.getByRole("heading", {
        name: "Acceso denegado",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "No tenés permisos para acceder a esta sección.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Contenido privado"),
    ).not.toBeInTheDocument();
  });

  it("permite el rol autorizado", () => {
    mostrarRuta(usuarioConRol("ADMIN"), ["ADMIN"]);

    expect(
      screen.getByText("Contenido privado"),
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Acceso denegado"),
    ).not.toBeInTheDocument();
  });

  it("permite ALUMNO en una ruta privada general", () => {
    mostrarRuta(usuarioConRol("ALUMNO"));

    expect(
      screen.getByText("Contenido privado"),
    ).toBeInTheDocument();
  });

  it("ofrece volver al panel correspondiente", () => {
    mostrarRuta(usuarioConRol("DOCENTE"), ["ADMIN"]);

    expect(
      screen.getByRole("link", {
        name: "Volver a mi panel",
      }),
    ).toHaveAttribute("href", "/dashboard/docente");
  });
});
