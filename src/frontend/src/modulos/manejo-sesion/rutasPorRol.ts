import type { Rol } from "../../shared/tipos";

export const rutasInicioPorRol: Record<Rol, string> = {
  ADMIN: "/dashboard/administrador",
  ASPIRANTE: "/",
  ALUMNO: "/dashboard",
  COORDINADOR: "/dashboard/conduccion",
  CPR: "/dashboard/general",
  DOCENTE: "/dashboard/docente",
};

export function obtenerRutaInicioPorRol(rol: Rol): string {
  return rutasInicioPorRol[rol];
}
