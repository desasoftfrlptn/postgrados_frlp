import { createContext, useContext, useState, type ReactNode } from "react";

export type UserRole = "estudiante" | "docente" | "conduccion";

interface AuthContextType {
  role: UserRole | null;
  login: (role: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(
    () => sessionStorage.getItem("mockup_role") as UserRole | null
  );

  const login = (r: UserRole) => {
    setRole(r);
    sessionStorage.setItem("mockup_role", r);
  };

  const logout = () => {
    setRole(null);
    sessionStorage.removeItem("mockup_role");
  };

  return (
    <AuthContext.Provider value={{ role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
