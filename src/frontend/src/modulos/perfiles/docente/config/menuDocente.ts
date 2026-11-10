// Configuración de las opciones del menú lateral para el perfil del Docente.

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
    texto: "Reportes",
    icono: "📊",
    ruta: "/dashboard/docente/reportes",
  },
  {
    texto: "Pendientes",
    icono: "⏳",
    ruta: "/dashboard/docente/pendientes",
  }, // <-- Esta es la coma importante que une Pendientes con Colegas
  {
    texto: "Colegas",
    icono: "👨‍🏫",
    ruta: "/dashboard/docente/profesores",
  }
];