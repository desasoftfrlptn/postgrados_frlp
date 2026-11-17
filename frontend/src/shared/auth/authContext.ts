import { createContext, useContext } from "react";
import type { Usuario } from "@/shared/api/endpoints";

export const ME_KEY = ["auth", "me"] as const;

export type AuthStatus = "loading" | "authenticated" | "anonymous" | "error";

export interface AuthContextValue {
  status: AuthStatus;
  user: Usuario | null;
  /**
   * Inicia sesión y devuelve el usuario (útil para redirigir según rol). Lanza ApiError.
   * `recordarme`: true guarda la sesión en localStorage; false, solo hasta cerrar la pestaña.
   */
  login: (email: string, password: string, options?: { recordarme?: boolean }) => Promise<Usuario>;
  logout: () => Promise<void>;
  /** Reintenta cargar el usuario cuando status === "error" (red caída, 5xx). */
  reloadUser: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
