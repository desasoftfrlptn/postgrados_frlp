import type { OpcionMenuPerfil } from "../../shared/componentes/BarraNavegacionPerfil";

export const menuCPR: OpcionMenuPerfil[] = [
    {
        texto: "Inicio",
        icono: "🏠",
        ruta: "/dashboard/general"
    },
    {
        texto: "Estudiantes",
        icono: "🎓",
        ruta: "/dashboard/cpr/estudiantes"
    },
    {
        texto: "Docentes",
        icono: "👥",
        ruta: "/dashboard/cpr/docentes"
    },
    {
        texto: "Gestión de trabajos prácticos",
        icono: "📋",
        ruta: "/dashboard/cpr/trabajos-practicos"
    },
    {
        texto: "Gestión de tutorías",
        icono: "💬",
        ruta: "/dashboard/cpr/tutorias"
    },
    {
        texto: "Gestión de tesis",
        icono: "📝",
        ruta: "/dashboard/cpr/tesis"
    },
    {
        texto: "Mi perfil",
        icono: "👤",
        ruta: "/dashboard/perfil"
    },
];