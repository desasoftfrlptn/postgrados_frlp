// Proveedor global de autenticación para manejar el usuario y su sesión.

import { useState } from "react";
import { api } from "../../shared/api/client";
import { AuthContext, type AuthState } from "./useAuth";
import type { Rol } from "../../shared/tipos";

interface LoginRespuestaAPI {
  id: string;
  nombre: string;
  apellido: string;
  correo_electronico: string;
  tipo_usuario: Rol;
  token: string;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthState | null>(null);

  const login = async (email: string, password: string) => {
    if (!email.trim() || !password.trim()) {
      throw new Error("El email y la contraseña son obligatorios");
    }

    const respuesta = await api.post<LoginRespuestaAPI>(
      "/autenticacion/login",
      {
        correo_electronico: email.trim(),
        contrasena: password,
      }
    );

    const usuario: AuthState = {
      id: respuesta.id,
      email: respuesta.correo_electronico,
      nombre: respuesta.nombre,
      apellido: respuesta.apellido,
      rol: respuesta.tipo_usuario,
      token: respuesta.token,
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