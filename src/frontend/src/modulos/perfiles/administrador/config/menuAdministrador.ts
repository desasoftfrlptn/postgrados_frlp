
import type { OpcionMenuPerfil } from "../../shared/componentes/BarraNavegacionPerfil";

// Navegación del perfil Administrador.
export const menuAdministrador: OpcionMenuPerfil[] = [
  {
    texto: "Inicio",
    icono: "🏠",
    ruta: "/dashboard/administrador",
  },
  {
    texto: "Usuarios",
    icono: "👥",
    ruta: "/dashboard/administrador/usuarios",
  },
  {
    texto: "Docentes",
    icono: "🧑",
    ruta: "/dashboard/administrador/docentes",
  },
  {
    texto: "Carreras",
    icono: "🎓",
    ruta: "/dashboard/administrador/carreras",
  },
  {
    texto: "Seminarios",
    icono: "📚",
    ruta: "/dashboard/administrador/seminarios",
  },
  {
    texto: "Cohortes",
    icono: "📅",
    ruta: "/dashboard/administrador/cohortes",
  },
  {
    texto: "Estadísticas",
    icono: "📊",
    ruta: "/dashboard/administrador/estadisticas",
  },
  {
    texto: "Reportes",
    icono: "📄",
    ruta: "/dashboard/administrador/reportes",
  },
  {
    texto: "Contenido público",
    icono: "🌐",
    ruta: "/dashboard/administrador/home",
  },
  {
    texto: "Configuración",
    icono: "⚙️",
    ruta: "/dashboard/administrador/configuracion",
  },
  {
    texto: "Mi perfil",
    icono: "👤",
    ruta: "/dashboard/administrador/perfil",
  },
];
