import { createBrowserRouter } from "react-router-dom";

// DOCENTE
import DashboardDocentePage from "../../modulos/perfiles/docente/paginas/DashboardDocentePage";
import PanelAsistenciaPage from "../../modulos/perfiles/docente/paginas/PanelAsistenciaPage";
import MisSeminariosPage from "../../modulos/perfiles/docente/paginas/MisSeminariosPage";
import CalificacionesPage from "../../modulos/perfiles/docente/paginas/CalificacionesPage";
import EstudiantesPage from "../../modulos/perfiles/docente/paginas/EstudiantesPage";
import ReportesPage from "../../modulos/perfiles/docente/paginas/ReportesPage";
import PendientesPage from "../../modulos/perfiles/docente/paginas/PendientesPage";
import ProfesoresPage from "../../modulos/perfiles/docente/paginas/ProfesoresPage"; // <-- Importamos la última página

// ESTUDIANTE
import DashboardEstudiantePage from "../../modulos/perfiles/estudiante/paginas/DashboardEstudiantePage";
import EstadoAcademicoPage from "../../modulos/perfiles/estudiante/paginas/EstadoAcademicoPage";
import TrabajoFinalPage from "../../modulos/perfiles/estudiante/paginas/TrabajoFinalPage";
import TutoriasPage from "../../modulos/perfiles/estudiante/paginas/TutoriasPage";
import CertificadosPage from "../../modulos/perfiles/estudiante/paginas/CertificadosPage";
import AsistenciasEstudiantePage from "../../modulos/perfiles/estudiante/paginas/AsistenciasEstudiantePage";

// COMPARTIDO
import DashboardRolGeneralPage from "../../modulos/perfiles/shared/paginas/DashboardRolGeneralPage";
import DashboardLayout from "../../modulos/perfiles/shared/disposiciones/DashboardLayout";
import MiPerfilPage from "../../modulos/perfiles/shared/paginas/MiPerfilPage";

// ADMINISTRADOR
import DashboardAdministradorPage from "../../modulos/perfiles/administrador/paginas/DashboardAdministradorPage";
import UsuariosPage from "../../modulos/perfiles/administrador/paginas/UsuariosPage";
import DocentesPage from "../../modulos/perfiles/administrador/paginas/DocentesPage";
import CarrerasPage from "../../modulos/perfiles/administrador/paginas/CarrerasPage";
import SeminariosPage from "../../modulos/perfiles/administrador/paginas/SeminariosPage";
import CohortesPage from "../../modulos/perfiles/administrador/paginas/CohortesPage";
import CalendarioAcademicoPage from "../../modulos/perfiles/administrador/paginas/CalendarioAcademicoPage";
import EstadisticasPage from "../../modulos/perfiles/administrador/paginas/EstadisticasPage";
import ReportesAdminPage from "../../modulos/perfiles/administrador/paginas/ReportesPage";
import HomeAdministradorPage from "../../modulos/perfiles/administrador/paginas/HomeAdministradorPage";
import ConfiguracionGeneralPage from "../../modulos/perfiles/administrador/paginas/ConfiguracionGeneralPage";

// EQUIPO DE CONDUCCIÓN
import PanelConduccionPage from "../../modulos/perfiles/conduccion/paginas/PanelConduccionPage";
import ListadoAspirantesPage from "../../modulos/perfiles/conduccion/paginas/ListadoAspirantesPage";
import DetalleLegajoPage from "../../modulos/perfiles/conduccion/paginas/DetalleLegajoPage";

// AUTENTICACIÓN
import LoginPage from "../../modulos/manejo-sesion/paginas/LoginPage";
import RecuperarContrasenaPage from "../../modulos/manejo-sesion/paginas/RecuperarContrasenaPage";
import CambiarContrasenaInicialPage from "../../modulos/manejo-sesion/paginas/CambiarContrasenaInicialPage";
import ProtectedRoute from "../../modulos/manejo-sesion/ProtectedRoute";

// PÁGINAS PÚBLICAS
import PaginaFAQ from "../../modulos/preguntas-frecuentes/paginas/paginaFAQ";
import HomePage from "../../modulos/home/paginas/HomePage";
import FormularioInscripcion from "../../modulos/inscripcion/paginas/FormularioInscripcion";
import PaginaNoticias from "../../modulos/noticias/paginas/paginaNoticias";
import PaginaCarreras from "../../modulos/carreras/paginas/PaginaCarreras";
import PaginaContacto from "../../modulos/contacto/paginas/PaginaContacto";
import PaginaCalendario from "../../modulos/calendario/paginas/PaginaCalendario";
import EstadoInscripcionPage from "../../modulos/inscripcion/paginas/EstadoInscripcionPage";

import PublicLayout from "../disposiciones/PublicLayout";
import PaginaNoEncontrada from "../paginas/PaginaNoEncontrada";

export const router = createBrowserRouter([
  // RUTAS PÚBLICAS
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
      {
  path: "estado-inscripcion",
  element: <EstadoInscripcionPage />,
      },
    ],
  },

  // CAMBIO OBLIGATORIO DE CONTRASEÑA
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "cambiar-contrasena-inicial",
        element: <CambiarContrasenaInicialPage />,
      },
    ],
  },

  // RUTAS PRIVADAS GENERALES
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

          // DOCENTE
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

  // RUTAS EXCLUSIVAS DEL EQUIPO DE CONDUCCIÓN
  {
    element: (
      <ProtectedRoute rolesPermitidos={["COORDINADOR"]} />
    ),
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            path: "dashboard/conduccion",
            element: <PanelConduccionPage />,
          },
          {
            path: "dashboard/conduccion/aspirantes",
            element: <ListadoAspirantesPage />,
          },
          {
            path: "dashboard/conduccion/legajos/:id",
            element: <DetalleLegajoPage />,
          },
        ],
      },
    ],
  },

  // RUTAS EXCLUSIVAS DEL ADMINISTRADOR
  {
    element: (
      <ProtectedRoute rolesPermitidos={["ADMIN"]} />
    ),
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            path: "dashboard/administrador",
            element: <DashboardAdministradorPage />,
          },
          {
            path: "dashboard/administrador/perfil",
            element: <MiPerfilPage />,
          },
          {
            path: "dashboard/administrador/usuarios",
            element: <UsuariosPage />,
          },
          {
            path: "dashboard/administrador/docentes",
            element: <DocentesPage />,
          },
          {
            path: "dashboard/administrador/carreras",
            element: <CarrerasPage />,
          },
          {
            path: "dashboard/administrador/seminarios",
            element: <SeminariosPage />,
          },
          {
            path: "dashboard/administrador/cohortes",
            element: <CohortesPage />,
          },
          {
            path: "dashboard/administrador/calendario",
            element: <CalendarioAcademicoPage />,
          },
          {
            path: "dashboard/administrador/estadisticas",
            element: <EstadisticasPage />,
          },
          {
            path: "dashboard/administrador/reportes",
            element:  <ReportesAdminPage />,
          },
          {
            path: "dashboard/administrador/home",
            element: <HomeAdministradorPage />,
          },
          {
            path: "dashboard/administrador/configuracion",
            element: <ConfiguracionGeneralPage />,
          },
        ],
      },
    ],
  },


]);
