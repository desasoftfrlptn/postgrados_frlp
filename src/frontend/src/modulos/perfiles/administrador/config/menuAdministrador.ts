import type {
  OpcionMenuPerfil,
} from "../../shared/componentes/BarraNavegacionPerfil";


export const menuAdministrador:
  OpcionMenuPerfil[] = [
  {
    texto: "Inicio",
    icono: "🏠",
    ruta:
      "/dashboard/administrador",
  },
  {
    texto: "Mi Perfil",
    icono: "👤",
    ruta:
      "/dashboard/administrador/perfil",
  },
  {
    texto: "Usuarios",
    icono: "👥",
    ruta:
      "/dashboard/administrador/usuarios",
  },
  {
    texto: "Docentes",
    icono: "🧑",
    ruta:
      "/dashboard/administrador/docentes",
  },
  {
    texto: "Carreras",
    icono: "🎓",
    ruta:
      "/dashboard/administrador/carreras",
  },
  {
    texto: "Seminarios",
    icono: "📚",
    ruta:
      "/dashboard/administrador/seminarios",
  },
  {
    texto: "Cohortes",
    icono: "📅",
    ruta:
      "/dashboard/administrador/cohortes",
  },
  {
    texto:
      "Calendario Académico",
    icono: "🗓️",
    ruta:
      "/dashboard/administrador/calendario",
  },
  {
    texto: "Estadísticas",
    icono: "📊",
    ruta:
      "/dashboard/administrador/estadisticas",
  },
  {
    texto: "Reportes",
    icono: "📄",
    ruta:
      "/dashboard/administrador/reportes",
  },
  {
    texto:
      "Contenido público",
    icono: "🌐",
    ruta:
      "/dashboard/administrador/home",
  },
  {
    texto:
      "Configuración",
    icono: "⚙️",
    ruta:
      "/dashboard/administrador/configuracion",
  },
];