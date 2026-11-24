
import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import { useAuth } from "./useAuth";
import { obtenerRutaInicioPorRol } from "./rutasPorRol";
import type { Rol } from "../../shared/tipos";

interface ProtectedRouteProps {
  rolesPermitidos?: Rol[];
  children?: ReactNode;
}

const rolesPrivados: Rol[] = [
  "ADMIN",
  "ALUMNO",
  "COORDINADOR",
  "CPR",
  "DOCENTE",
];

const rutaCambioInicial = "/cambiar-contrasena-inicial";

export default function ProtectedRoute({
  rolesPermitidos = rolesPrivados,
  children,
}: ProtectedRouteProps) {
  const { user } = useAuth();
  const { pathname } = useLocation();

  // Requiere una sesión activa.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // El aspirante utiliza exclusivamente el sitio público.
  if (user.rol === "ASPIRANTE") {
    return <Navigate to="/" replace />;
  }

  // Exige completar el cambio obligatorio de contraseña.
  if (
    user.debeCambiarContrasena &&
    pathname !== rutaCambioInicial
  ) {
    return <Navigate to={rutaCambioInicial} replace />;
  }

  // Evita regresar al cambio inicial una vez completado.
  if (
    !user.debeCambiarContrasena &&
    pathname === rutaCambioInicial
  ) {
    return (
      <Navigate
        to={obtenerRutaInicioPorRol(user.rol)}
        replace
      />
    );
  }

  // Verifica los permisos del usuario.
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
