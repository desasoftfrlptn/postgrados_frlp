// Opciones de navegación disponibles para el equipo de conducción.

import type { OpcionMenuPerfil } from "../../shared/componentes/BarraNavegacionPerfil";

export const menuConduccion: OpcionMenuPerfil[] = [
  {
    texto: "Inicio",
    icono: "🏠",
    ruta: "/dashboard/conduccion",
  },
  {
    texto: "Listado de aspirantes",
    icono: "👥",
    ruta: "/dashboard/conduccion/aspirantes",
  },
  {
    texto: "Períodos de inscripción",
    icono: "📅",
    ruta: "/dashboard/conduccion/periodos-inscripcion",
  },
  {
    texto: "Mi perfil",
    icono: "👤",
    ruta: "/dashboard/perfil",
  },
];
