import type { OpcionMenuPerfil } from "../../shared/componentes/BarraNavegacionPerfil";

export const menuEstudiante: OpcionMenuPerfil[] = [
  {
    texto: "Inicio",
    icono: "🏠",
    ruta: "/dashboard",
  },
  {
    texto: "Mi Perfil",
    icono: "👤",
    ruta: "/dashboard/perfil",
  },
  {
    texto: "Estado Académico",
    icono: "📊",
    ruta: "/dashboard/estado-academico",
  },
  {
    texto: "Trabajo Final / Tesis",
    icono: "📝",
    ruta: "/dashboard/trabajo-final",
  },
  {
    texto: "Tutorías",
    icono: "💬",
    ruta: "/dashboard/tutorias",
  },
  {
    texto: "Certificados",
    icono: "📜",
    ruta: "/dashboard/certificados",
  },
  {
    texto: "Asistencias",
    icono: "📋",
    ruta: "/dashboard/asistencias",
  },
];