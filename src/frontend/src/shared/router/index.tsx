import type { ComponentType } from "react";
import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "../../modulos/manejo-sesion/ProtectedRoute";
import DashboardLayout from "../../modulos/perfiles/shared/disposiciones/DashboardLayout";
import PublicLayout from "../disposiciones/PublicLayout";
// React Router carga cada página cuando se visita su ruta.
// Los layouts y los controles de acceso se mantienen disponibles desde el inicio.
function cargarPagina(
  importar: () => Promise<{ default: ComponentType }>,
) {
  return async () => ({ Component: (await importar()).default });
}
const rolesEstudiante = ["ALUMNO"] as const;
export const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      {
        index: true,
        lazy: cargarPagina(() => import("../../modulos/home/paginas/HomePage")),
      },
      {
        path: "login",
        lazy: cargarPagina(() => import("../../modulos/manejo-sesion/paginas/LoginPage")),
      },
      {
        path: "recuperar-contrasena",
        lazy: cargarPagina(() => import("../../modulos/manejo-sesion/paginas/RecuperarContrasenaPage")),
      },
      {
        path: "carreras",
        lazy: cargarPagina(() => import("../../modulos/carreras/paginas/PaginaCarreras")),
      },
      {
        path: "inscripcion",
        lazy: cargarPagina(() => import("../../modulos/inscripcion/paginas/FormularioInscripcion")),
      },
      {
        path: "noticias",
        lazy: cargarPagina(() => import("../../modulos/noticias/paginas/paginaNoticias")),
      },
      {
        path: "contacto",
        lazy: cargarPagina(() => import("../../modulos/contacto/paginas/PaginaContacto")),
      },
      {
        path: "calendario",
        lazy: cargarPagina(() => import("../../modulos/calendario/paginas/PaginaCalendario")),
      },
      {
        path: "faq",
        lazy: cargarPagina(() => import("../../modulos/preguntas-frecuentes/paginas/paginaFAQ")),
      },
      {
        path: "estado-inscripcion",
        lazy: cargarPagina(() => import("../../modulos/inscripcion/paginas/EstadoInscripcionPage")),
      },
      {
        path: "*",
        lazy: cargarPagina(() => import("../paginas/PaginaNoEncontrada")),
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "cambiar-contrasena-inicial",
        lazy: cargarPagina(() => import("../../modulos/manejo-sesion/paginas/CambiarContrasenaInicialPage")),
      },
      {
        element: <DashboardLayout />,
        children: [
          {
            element: <ProtectedRoute rolesPermitidos={["CPR"]} />,
            children: [
              { path: "dashboard/general", lazy: cargarPagina(() => import("../../modulos/perfiles/cpr/paginas/DashboardCPRPage")) },
              { path: "dashboard/cpr/tesis", lazy: cargarPagina(() => import("../../modulos/perfiles/cpr/paginas/GestionTesisPage")) },
            ],
          },
          {
            path: "dashboard/alertas",
            lazy: cargarPagina(() => import("../../modulos/perfiles/shared/paginas/AlertasPage")),
          },
          {
            path: "dashboard/acceso-denegado",
            lazy: cargarPagina(() => import("../../modulos/manejo-sesion/paginas/AccesoDenegadoPage")),
          },
          {
            path: "dashboard/perfil",
            lazy: cargarPagina(() => import("../../modulos/perfiles/shared/paginas/MiPerfilPage")),
          },
          {
            element: <ProtectedRoute rolesPermitidos={[...rolesEstudiante]} />,
            children: [
              {
                path: "dashboard",
                lazy: cargarPagina(() => import("../../modulos/perfiles/estudiante/paginas/DashboardEstudiantePage")),
              },
              {
                path: "dashboard/estado-academico",
                lazy: cargarPagina(() => import("../../modulos/perfiles/estudiante/paginas/EstadoAcademicoPage")),
              },
              {
                path: "dashboard/trabajo-final",
                lazy: cargarPagina(() => import("../../modulos/perfiles/estudiante/paginas/TrabajoFinalPage")),
              },
              {
                path: "dashboard/tutorias",
                lazy: cargarPagina(() => import("../../modulos/perfiles/estudiante/paginas/TutoriasPage")),
              },
              {
                path: "dashboard/asistencias",
                lazy: cargarPagina(() => import("../../modulos/perfiles/estudiante/paginas/AsistenciasEstudiantePage")),
              },
            ],
          },
          {
            element: <ProtectedRoute rolesPermitidos={["DOCENTE"]} />,
            children: [
              {
                path: "dashboard/docente",
                lazy: cargarPagina(() => import("../../modulos/perfiles/docente/paginas/DashboardDocentePage")),
              },
              {
                path: "dashboard/docente/perfil",
                lazy: cargarPagina(() => import("../../modulos/perfiles/shared/paginas/MiPerfilPage")),
              },
              {
                path: "dashboard/docente/seminarios",
                lazy: cargarPagina(() => import("../../modulos/perfiles/docente/paginas/MisSeminariosPage")),
              },
              {
                path: "dashboard/docente/estudiantes",
                lazy: cargarPagina(() => import("../../modulos/perfiles/docente/paginas/EstudiantesPage")),
              },
              {
                path: "dashboard/docente/asistencia",
                lazy: cargarPagina(() => import("../../modulos/perfiles/docente/paginas/PanelAsistenciaPage")),
              },
              {
                path: "dashboard/docente/calificaciones",
                lazy: cargarPagina(() => import("../../modulos/perfiles/docente/paginas/CalificacionesPage")),
              },
              {
                path: "dashboard/docente/reportes",
                lazy: cargarPagina(() => import("../../modulos/perfiles/docente/paginas/ReportesPage")),
              },
              {
                path: "dashboard/docente/pendientes",
                lazy: cargarPagina(() => import("../../modulos/perfiles/docente/paginas/PendientesPage")),
              },
              {
                path: "dashboard/docente/profesores",
                lazy: cargarPagina(() => import("../../modulos/perfiles/docente/paginas/ProfesoresPage")),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute rolesPermitidos={["COORDINADOR"]} />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            path: "dashboard/conduccion",
            lazy: cargarPagina(() => import("../../modulos/perfiles/conduccion/paginas/PanelConduccionPage")),
          },
          {
            path: "dashboard/conduccion/aspirantes",
            lazy: cargarPagina(() => import("../../modulos/perfiles/conduccion/paginas/ListadoAspirantesPage")),
          },
          {
            path: "dashboard/conduccion/legajos/:id",
            lazy: cargarPagina(() => import("../../modulos/perfiles/conduccion/paginas/DetalleLegajoPage")),
          },
          {
            path: "dashboard/conduccion/periodos-inscripcion",
            lazy: cargarPagina(() => import("../../modulos/perfiles/conduccion/paginas/PeriodosInscripcionPage")),
          },
          {
            path: "dashboard/conduccion/exportaciones",
            lazy: cargarPagina(() => import("../../modulos/perfiles/conduccion/paginas/ExportacionesConduccionPage")),
          },
          {
            path: "dashboard/conduccion/perfiles-academicos",
            lazy: cargarPagina(() => import("../../modulos/perfiles/conduccion/paginas/PerfilesAcademicosConduccionPage")),
          },
          {
            path: "dashboard/conduccion/tutorias",
            lazy: cargarPagina(() => import("../../modulos/perfiles/conduccion/paginas/TutoriasConduccionPage")),
          },
          {
            path: "dashboard/conduccion/trabajos-finales",
            lazy: cargarPagina(() => import("../../modulos/perfiles/conduccion/paginas/TrabajosFinalesConduccionPage")),
          },
          {
            path: "dashboard/conduccion/seminarios",
            lazy: cargarPagina(() => import("../../modulos/perfiles/conduccion/paginas/SeminariosConduccionPage")),
          },
          {
            path: "dashboard/conduccion/alertas",
            lazy: cargarPagina(() => import("../../modulos/perfiles/conduccion/paginas/AlertasConduccionPage")),
          },
          {
            path: "dashboard/conduccion/estadisticas",
            lazy: cargarPagina(() => import("../../modulos/perfiles/conduccion/paginas/EstadisticasConduccionPage")),
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute rolesPermitidos={["ADMIN"]} />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            path: "dashboard/administrador",
            lazy: cargarPagina(() => import("../../modulos/perfiles/administrador/paginas/DashboardAdministradorPage")),
          },
          {
            path: "dashboard/administrador/perfil",
            lazy: cargarPagina(() => import("../../modulos/perfiles/shared/paginas/MiPerfilPage")),
          },
          {
            path: "dashboard/administrador/usuarios",
            lazy: cargarPagina(() => import("../../modulos/perfiles/administrador/paginas/UsuariosPage")),
          },
          {
            path: "dashboard/administrador/docentes",
            lazy: cargarPagina(() => import("../../modulos/perfiles/administrador/paginas/DocentesPage")),
          },
          {
            path: "dashboard/administrador/carreras",
            lazy: cargarPagina(() => import("../../modulos/perfiles/administrador/paginas/CarrerasPage")),
          },
          {
            path: "dashboard/administrador/seminarios",
            lazy: cargarPagina(() => import("../../modulos/perfiles/administrador/paginas/SeminariosPage")),
          },
          {
            path: "dashboard/administrador/cohortes",
            lazy: cargarPagina(() => import("../../modulos/perfiles/administrador/paginas/CohortesPage")),
          },
          {
            path: "dashboard/administrador/estadisticas",
            lazy: cargarPagina(() => import("../../modulos/perfiles/administrador/paginas/EstadisticasPage")),
          },
          {
            path: "dashboard/administrador/reportes",
            lazy: cargarPagina(() => import("../../modulos/perfiles/administrador/paginas/ReportesPage")),
          },
          {
            path: "dashboard/administrador/home",
            lazy: cargarPagina(() => import("../../modulos/perfiles/administrador/paginas/HomeAdministradorPage")),
          },
          {
            path: "dashboard/administrador/configuracion",
            lazy: cargarPagina(() => import("../../modulos/perfiles/administrador/paginas/ConfiguracionGeneralPage")),
          },
        ],
      },
    ],
  },
]);
