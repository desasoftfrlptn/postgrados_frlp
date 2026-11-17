
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
    texto: "Mi perfil",
    icono: "👤",
    ruta: "/dashboard/perfil",
  },
];
