import type { OpcionMenuPerfil } from "../../shared/componentes/BarraNavegacionPerfil";

export const menuCPR: OpcionMenuPerfil[] = [
  { texto: "Inicio", icono: "🏠", ruta: "/dashboard/general" },
  { texto: "Gestión de tesis", icono: "📝", ruta: "/dashboard/cpr/tesis" },
  { texto: "Estudiantes", icono: "🎓", ruta: "/dashboard/cpr/estudiantes" },
  { texto: "Docentes", icono: "👥", ruta: "/dashboard/cpr/docentes" },
  { texto: "Mi perfil", icono: "👤", ruta: "/dashboard/perfil" },
];
