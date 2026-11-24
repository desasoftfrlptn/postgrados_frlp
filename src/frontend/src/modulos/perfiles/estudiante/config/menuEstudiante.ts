
import type { OpcionMenuPerfil } from "../../shared/componentes/BarraNavegacionPerfil";

// Navegación del perfil Estudiante.
export const menuEstudiante: OpcionMenuPerfil[] = [
  {
    texto: "Inicio",
    icono: "🏠",
    ruta: "/dashboard",
  },
  {
    texto: "Estado académico",
    icono: "📊",
    ruta: "/dashboard/estado-academico",
  },
  {
    texto: "Seminarios",
    icono: "📖",
    ruta: "/dashboard/estado-academico?vista=seminarios",
  },
  {
    texto: "Trabajo final / Tesis",
    icono: "📝",
    ruta: "/dashboard/trabajo-final",
  },
  {
    texto: "Tutorías",
    icono: "💬",
    ruta: "/dashboard/tutorias",
  },
  {
    texto: "Asistencias",
    icono: "📋",
    ruta: "/dashboard/asistencias",
  },
  {
    texto: "Mi perfil",
    icono: "👤",
    ruta: "/dashboard/perfil",
  },
];
