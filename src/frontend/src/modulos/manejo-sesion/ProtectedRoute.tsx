
import { Navigate, Outlet } from "react-router-dom";
import type { ReactNode } from "react";

import { useAuth } from "./useAuth";
import type { Rol } from "../../shared/tipos";

interface ProtectedRouteProps {
  rolesPermitidos?: Rol[];
  children?: ReactNode;
}

const todosLosRoles: Rol[] = [
  "ADMIN",
  "ASPIRANTE",
  "ALUMNO",
  "COORDINADOR",
  "CPR",
  "DOCENTE",
];

export default function ProtectedRoute({
  rolesPermitidos = todosLosRoles,
  children,
}: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!rolesPermitidos.includes(user.rol)) {
    return (
      <Navigate
        to="/dashboard/acceso-denegado"
        replace
      />
    );
  }

  return children ?? <Outlet />;
}
