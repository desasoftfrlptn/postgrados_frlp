import { createContext, useContext } from "react";
import type { Rol } from "../types";

export interface AuthState {
  email: string;
  rol: Rol;
  token: string;
}

export interface AuthContextValue {
  user: AuthState | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
