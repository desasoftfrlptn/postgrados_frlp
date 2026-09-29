// Proveedor global de autenticación para manejar el usuario y su sesión.

import { useState } from "react";
import { AuthContext, type AuthState } from "./useAuth";
import type { Rol } from "../../shared/tipos";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthState | null>(null);

  const login = async (email: string, password: string) => {
    if (!email.trim() || !password.trim()) {
      throw new Error("El email y la contraseña son obligatorios");
    }

    // MODO DEMO PARA PRESENTACIÓN (Mock Login)
    // Evitamos depender del backend de Python que no compila en Windows por falta de C++ Build Tools
    let rolAsignado: Rol = "ESTUDIANTE";
    let nombreAsignado = "Juan";
    let apellidoAsignado = "Pérez";
    
    if (email.toLowerCase().includes("docente") || email.toLowerCase().includes("profe")) {
      rolAsignado = "DOCENTE";
      nombreAsignado = "Margarita";
      apellidoAsignado = "Gómez";
    } else if (email.toLowerCase().includes("admin") || email.toLowerCase().includes("coordinador")) {
      rolAsignado = "COORDINADOR";
      nombreAsignado = "Carlos";
      apellidoAsignado = "López";
    }

    const usuario: AuthState = {
      id: "mock-123",
      email,
      nombre: nombreAsignado,
      apellido: apellidoAsignado,
      rol: rolAsignado,
      token: "mock-jwt-token",
    };

    setUser(usuario);
    return usuario;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}