
import { createContext, useContext } from "react";

import type { Rol } from "../../shared/tipos";

// Datos del usuario autenticado.
export interface AuthState {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  dni: string;
  rol: Rol;
  token: string;
  debeCambiarContrasena: boolean;
}

// Operaciones disponibles para gestionar la sesión.
export interface AuthContextValue {
  user: AuthState | null;
  motivoCierre?: string;

  login: (
    email: string,
    password: string
  ) => Promise<AuthState>;

  logout: () => void;

  confirmarCambioContrasena: () => void;
}

export const AuthContext =
  createContext<AuthContextValue | null>(null);

// Permite acceder al contexto de autenticación.
export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext);

  if (!contexto) {
    throw new Error(
      "useAuth debe usarse dentro de AuthProvider"
    );
  }

  return contexto;
}
