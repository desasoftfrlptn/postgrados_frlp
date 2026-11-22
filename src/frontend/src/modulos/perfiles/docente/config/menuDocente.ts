
import type { OpcionMenuPerfil } from "../../shared/componentes/BarraNavegacionPerfil";

// Navegación del perfil Docente.
export const menuDocente: OpcionMenuPerfil[] = [
  {
    texto: "Inicio",
    icono: "🏠",
    ruta: "/dashboard/docente",
  },
  {
    texto: "Mis seminarios",
    icono: "📚",
    ruta: "/dashboard/docente/seminarios",
  },
  {
    texto: "Estudiantes",
    icono: "👥",
    ruta: "/dashboard/docente/estudiantes",
  },
  {
    texto: "Asistencias",
    icono: "📅",
    ruta: "/dashboard/docente/asistencia",
  },
  {
    texto: "Calificaciones",
    icono: "📝",
    ruta: "/dashboard/docente/calificaciones",
  },
  {
    texto: "Pendientes",
    icono: "⏳",
    ruta: "/dashboard/docente/pendientes",
  },
  {
    texto: "Colegas",
    icono: "👨‍🏫",
    ruta: "/dashboard/docente/profesores",
  },
  {
    texto: "Tutorías",
    icono: "📋",
    ruta: "/dashboard/docente/tutorias",
  },
  {
    texto: "Reportes",
    icono: "📊",
    ruta: "/dashboard/docente/reportes",
  },
  {
    texto: "Mi perfil",
    icono: "👤",
    ruta: "/dashboard/docente/perfil",
  },
];
