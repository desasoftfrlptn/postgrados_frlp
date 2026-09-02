import { useState } from "react";
import { AuthContext, type AuthState } from "./useAuth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthState | null>(null);

  const login = async (email: string, password: string) => {
    if (!email.trim() || !password.trim()) {
      throw new Error("El email y la contrasena son obligatorios");
    }
    // TODO: implementar llamada real a POST /api/v1/auth/login
    // aca se obtiene el token si los datos son correctos o un error sino
    setUser({ email, rol: "COORDINADOR", token: "" });
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
