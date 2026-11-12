import type { OpcionMenuPerfil } from "../../shared/componentes/BarraNavegacionPerfil";

export const menuDocente: OpcionMenuPerfil[] = [
  {
    texto: "Inicio",
    icono: "🏠",
    ruta: "/dashboard/docente",
  },
  {
    texto: "Mi Perfil",
    icono: "👤",
    ruta: "/dashboard/docente/perfil",
  },
  {
    texto: "Mis Seminarios",
    icono: "📚",
    ruta: "/dashboard/docente/seminarios",
  },
  {
    texto: "Asistencias",
    icono: "📋",
    ruta: "/dashboard/docente/asistencia",
  },
  {
    texto: "Calificaciones",
    icono: "📝",
    ruta: "/dashboard/docente/calificaciones",
  },
];