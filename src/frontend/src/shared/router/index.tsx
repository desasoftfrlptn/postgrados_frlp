// Define las rutas públicas y privadas de la aplicación.

import { createBrowserRouter } from "react-router-dom";

import DashboardDocentePage from "../../modulos/perfiles/docente/paginas/DashboardDocentePage";
import PanelAsistenciaPage from "../../modulos/perfiles/docente/paginas/PanelAsistenciaPage";
import MisSeminariosPage from "../../modulos/perfiles/docente/paginas/MisSeminariosPage";
import CalificacionesPage from "../../modulos/perfiles/docente/paginas/CalificacionesPage";
import EstudiantesPage from "../../modulos/perfiles/docente/paginas/EstudiantesPage";
import ReportesPage from "../../modulos/perfiles/docente/paginas/ReportesPage";
import PendientesPage from "../../modulos/perfiles/docente/paginas/PendientesPage";
import ProfesoresPage from "../../modulos/perfiles/docente/paginas/ProfesoresPage"; // <-- Importamos la última página

import DashboardEstudiantePage from "../../modulos/perfiles/estudiante/paginas/DashboardEstudiantePage";
import EstadoAcademicoPage from "../../modulos/perfiles/estudiante/paginas/EstadoAcademicoPage";
import TrabajoFinalPage from "../../modulos/perfiles/estudiante/paginas/TrabajoFinalPage";
import TutoriasPage from "../../modulos/perfiles/estudiante/paginas/TutoriasPage";
import CertificadosPage from "../../modulos/perfiles/estudiante/paginas/CertificadosPage";
import AsistenciasEstudiantePage from "../../modulos/perfiles/estudiante/paginas/AsistenciasEstudiantePage";
import DashboardRolGeneralPage from "../../modulos/perfiles/shared/paginas/DashboardRolGeneralPage";

import DashboardLayout from "../../modulos/perfiles/shared/disposiciones/DashboardLayout";
import MiPerfilPage from "../../modulos/perfiles/shared/paginas/MiPerfilPage";

import PaginaFAQ from "../../modulos/preguntas-frecuentes/paginas/paginaFAQ";
import LoginPage from "../../modulos/manejo-sesion/paginas/LoginPage";
import RecuperarContrasenaPage from "../../modulos/manejo-sesion/paginas/RecuperarContrasenaPage";
import ProtectedRoute from "../../modulos/manejo-sesion/ProtectedRoute";

import HomePage from "../../modulos/home/paginas/HomePage";
import FormularioInscripcion from "../../modulos/inscripcion/paginas/FormularioInscripcion";
import PaginaNoticias from "../../modulos/noticias/paginas/paginaNoticias";
import PaginaCarreras from "../../modulos/carreras/paginas/PaginaCarreras";
import PaginaContacto from "../../modulos/contacto/paginas/PaginaContacto";
import PaginaCalendario from "../../modulos/calendario/paginas/PaginaCalendario";

import PublicLayout from "../disposiciones/PublicLayout";
import PaginaNoEncontrada from "../paginas/PaginaNoEncontrada";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "recuperar-contrasena",
        element: <RecuperarContrasenaPage />,
      },
      {
        path: "carreras",
        element: <PaginaCarreras />,
      },
      {
        path: "inscripcion",
        element: <FormularioInscripcion />,
      },
      {
        path: "noticias",
        element: <PaginaNoticias />,
      },
      {
        path: "contacto",
        element: <PaginaContacto />,
      },
      {
        path: "calendario",
        element: <PaginaCalendario />,
      },
      {
        path: "faq",
        element: <PaginaFAQ />,
      },
      {
        path: "*",
        element: <PaginaNoEncontrada />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            path: "dashboard",
            element: <DashboardEstudiantePage />,
          },
          {
            path: "dashboard/general",
            element: <DashboardRolGeneralPage />,
          },
          {
            path: "dashboard/perfil",
            element: <MiPerfilPage />,
          },
          {
            path: "dashboard/estado-academico",
            element: <EstadoAcademicoPage />,
          },
          {
            path: "dashboard/trabajo-final",
            element: <TrabajoFinalPage />,
          },
          {
            path: "dashboard/tutorias",
            element: <TutoriasPage />,
          },
          {
            path: "dashboard/certificados",
            element: <CertificadosPage />,
          },
          {
            path: "dashboard/asistencias",
            element: <AsistenciasEstudiantePage />,
          },

          {
            path: "dashboard/docente",
            element: <DashboardDocentePage />,
          },
          {
            path: "dashboard/docente/perfil",
            element: <MiPerfilPage />,
          },
          {
            path: "dashboard/docente/seminarios",
            element: <MisSeminariosPage />,
          },
          {
            path: "dashboard/docente/estudiantes",
            element: <EstudiantesPage />,
          },
          {
            path: "dashboard/docente/asistencia",
            element: <PanelAsistenciaPage />,
          },
          {
            path: "dashboard/docente/calificaciones",
            element: <CalificacionesPage />,
          },
          {
            path: "dashboard/docente/reportes",
            element: <ReportesPage />,
          },
          {
            path: "dashboard/docente/pendientes",
            element: <PendientesPage />,
          },
          {
            path: "dashboard/docente/profesores", // <-- Conectamos la última ruta
            element: <ProfesoresPage />,
          },
        ],
      },
    ],
  },
]);