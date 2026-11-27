
import type { OpcionMenuPerfil } from "../../shared/componentes/BarraNavegacionPerfil";

// Navegación del Equipo de Conducción.
export const menuConduccion: OpcionMenuPerfil[] = [
  {
    texto: "Inicio",
    icono: "🏠",
    ruta: "/dashboard/conduccion",
  },
  {
    texto: "Aspirantes y legajos",
    icono: "👥",
    ruta: "/dashboard/conduccion/aspirantes",
  },
  {
    texto: "Períodos de inscripción",
    icono: "📅",
    ruta: "/dashboard/conduccion/periodos-inscripcion",
  },
  {
    texto: "Perfiles académicos",
    icono: "🎓",
    ruta: "/dashboard/conduccion/perfiles-academicos",
  },
  {
    texto: "Tutorías",
    icono: "📚",
    ruta: "/dashboard/conduccion/tutorias",
  },
  {
    texto: "Trabajo final y tesis",
    icono: "📝",
    ruta: "/dashboard/conduccion/trabajos-finales",
  },
  {
    texto: "Seminarios y notas",
    icono: "📖",
    ruta: "/dashboard/conduccion/seminarios",
  },
  {
    texto: "Estadísticas",
    icono: "📊",
    ruta: "/dashboard/conduccion/estadisticas",
  },
  {
    texto: "Mi perfil",
    icono: "👤",
    ruta: "/dashboard/perfil",
  },
];
