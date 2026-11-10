// Define el contexto de autenticación y el acceso a la sesión actual.

import {
  createContext,
  useContext,
} from "react";

import type {
  Rol,
} from "../../shared/tipos";


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


export interface AuthContextValue {
  user: AuthState | null;

  login: (
    email: string,
    password: string
  ) => Promise<AuthState>;

  logout: () => void;

  confirmarCambioContrasena: () => void;
}


export const AuthContext =
  createContext<AuthContextValue | null>(
    null
  );


export function useAuth() {
  const ctx =
    useContext(
      AuthContext
    );

  if (!ctx) {
    throw new Error(
      "useAuth debe usarse dentro de AuthProvider"
    );
  }

  return ctx;
}