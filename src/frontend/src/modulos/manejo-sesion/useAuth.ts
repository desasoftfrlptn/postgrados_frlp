// Define el contexto de autenticación y el hook para acceder a la sesión del usuario.

import { createContext, useContext } from "react";
import type { Rol } from "../../shared/tipos";

export interface AuthState {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: Rol;
  token: string;
}

export interface AuthContextValue {
  user: AuthState | null;
  login: (email: string, password: string) => Promise<AuthState>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return ctx;
}

