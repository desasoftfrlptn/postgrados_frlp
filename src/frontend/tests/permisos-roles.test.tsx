import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProtectedRoute from "../src/modulos/manejo-sesion/ProtectedRoute";
import { obtenerRutaInicioPorRol } from "../src/modulos/manejo-sesion/rutasPorRol";
import { useAuth } from "../src/modulos/manejo-sesion/useAuth";
import type { Rol } from "../src/shared/tipos";

vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({
  useAuth: vi.fn(),
}));

type Usuario = NonNullable<ReturnType<typeof useAuth>["user"]>;

function usuarioConRol(rol: Rol, debeCambiarContrasena = false): Usuario {
  return {
    id: "1",
    nombre: "Ana",
    apellido: "Prueba",
    email: "ana@example.com",
    dni: "12345678",
    rol,
    token: "token-prueba",
    debeCambiarContrasena,
  };
}

function mostrarRuta(usuario: Usuario | null, ruta: string) {
  vi.mocked(useAuth).mockReturnValue({ user: usuario } as ReturnType<typeof useAuth>);
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/" element={<div>Inicio público</div>} />
        <Route path="/login" element={<div>Login</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/cambiar-contrasena-inicial" element={<div>Cambiar contraseña</div>} />
          <Route path="/dashboard/acceso-denegado" element={<div>Acceso denegado</div>} />
          <Route element={<ProtectedRoute rolesPermitidos={["ALUMNO"]} />}>
            <Route path="/dashboard" element={<div>Panel estudiante</div>} />
          </Route>
          <Route element={<ProtectedRoute rolesPermitidos={["DOCENTE"]} />}>
            <Route path="/dashboard/docente" element={<div>Panel docente</div>} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("permisos de roles y primer ingreso", () => {
  beforeEach(() => vi.clearAllMocks());

  it("impide al ASPIRANTE entrar en una ruta privada", () => {
    mostrarRuta(usuarioConRol("ASPIRANTE"), "/dashboard");
    expect(screen.getByText("Inicio público")).toBeInTheDocument();
  });

  it("permite al ALUMNO entrar en su panel", () => {
    mostrarRuta(usuarioConRol("ALUMNO"), "/dashboard");
    expect(screen.getByText("Panel estudiante")).toBeInTheDocument();
  });

  it("rechaza un DOCENTE que intenta abrir el panel ALUMNO", () => {
    mostrarRuta(usuarioConRol("DOCENTE"), "/dashboard");
    expect(screen.getByText("Acceso denegado")).toBeInTheDocument();
  });

  it("obliga a cambiar contraseña antes de entrar al panel", () => {
    mostrarRuta(usuarioConRol("ALUMNO", true), "/dashboard");
    expect(screen.getByText("Cambiar contraseña")).toBeInTheDocument();
  });

  it("no deja ingresar al formulario inicial si ya cambió la contraseña", () => {
    mostrarRuta(usuarioConRol("ALUMNO", false), "/cambiar-contrasena-inicial");
    expect(screen.getByText("Panel estudiante")).toBeInTheDocument();
  });

  it("preserva la ruta inicial correcta de cada rol", () => {
    expect(obtenerRutaInicioPorRol("ADMIN")).toBe("/dashboard/administrador");
    expect(obtenerRutaInicioPorRol("ALUMNO")).toBe("/dashboard");
    expect(obtenerRutaInicioPorRol("ASPIRANTE")).toBe("/");
    expect(obtenerRutaInicioPorRol("DOCENTE")).toBe("/dashboard/docente");
    expect(obtenerRutaInicioPorRol("COORDINADOR")).toBe("/dashboard/conduccion");
    expect(obtenerRutaInicioPorRol("CPR")).toBe("/dashboard/general");
  });
});
