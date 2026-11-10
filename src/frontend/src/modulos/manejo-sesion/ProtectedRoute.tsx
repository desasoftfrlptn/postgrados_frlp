// Protege las rutas privadas y puede restringir el acceso según el rol.

import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "./useAuth";
import type { Rol } from "../../shared/tipos";

interface ProtectedRouteProps {
  rolesPermitidos?: Rol[];
}

const todosLosRoles: Rol[] = [
  "ASPIRANTE",
  "DOCENTE",
  "COORDINADOR",
  "CPR",
  "ADMIN",
];

export default function ProtectedRoute({
  rolesPermitidos = todosLosRoles,
}: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!rolesPermitidos.includes(user.rol)) {
    return <Navigate to="/dashboard/general" replace />;
  }

  return <Outlet />;
}