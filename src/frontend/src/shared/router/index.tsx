import { createBrowserRouter } from "react-router-dom";

// DOCENTE
import DashboardDocentePage from "../../modulos/perfiles/docente/paginas/DashboardDocentePage";
import PanelAsistenciaPage from "../../modulos/perfiles/docente/paginas/PanelAsistenciaPage";
import MisSeminariosPage from "../../modulos/perfiles/docente/paginas/MisSeminariosPage";
import CalificacionesPage from "../../modulos/perfiles/docente/paginas/CalificacionesPage";
import EstudiantesPage from "../../modulos/perfiles/docente/paginas/EstudiantesPage";
import ReportesPage from "../../modulos/perfiles/docente/paginas/ReportesPage";
import PendientesPage from "../../modulos/perfiles/docente/paginas/PendientesPage";
import ProfesoresPage from "../../modulos/perfiles/docente/paginas/ProfesoresPage";

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
import EstadisticasPage from "../../modulos/perfiles/administrador/paginas/EstadisticasPage";
import ReportesAdminPage from "../../modulos/perfiles/administrador/paginas/ReportesPage";
import HomeAdministradorPage from "../../modulos/perfiles/administrador/paginas/HomeAdministradorPage";
import ConfiguracionGeneralPage from "../../modulos/perfiles/administrador/paginas/ConfiguracionGeneralPage";

// EQUIPO DE CONDUCCIÓN
import PanelConduccionPage from "../../modulos/perfiles/conduccion/paginas/PanelConduccionPage";
import ListadoAspirantesPage from "../../modulos/perfiles/conduccion/paginas/ListadoAspirantesPage";
import DetalleLegajoPage from "../../modulos/perfiles/conduccion/paginas/DetalleLegajoPage";
import PeriodosInscripcionPage from "../../modulos/perfiles/conduccion/paginas/PeriodosInscripcionPage";
import ExportacionesConduccionPage from "../../modulos/perfiles/conduccion/paginas/ExportacionesConduccionPage";
import PerfilesAcademicosConduccionPage from "../../modulos/perfiles/conduccion/paginas/PerfilesAcademicosConduccionPage";
import TutoriasConduccionPage from "../../modulos/perfiles/conduccion/paginas/TutoriasConduccionPage";
import TrabajosFinalesConduccionPage from "../../modulos/perfiles/conduccion/paginas/TrabajosFinalesConduccionPage";
import SeminariosConduccionPage from "../../modulos/perfiles/conduccion/paginas/SeminariosConduccionPage";
import AlertasConduccionPage from "../../modulos/perfiles/conduccion/paginas/AlertasConduccionPage";
import EstadisticasConduccionPage from "../../modulos/perfiles/conduccion/paginas/EstadisticasConduccionPage";

// AUTENTICACIÓN
import LoginPage from "../../modulos/manejo-sesion/paginas/LoginPage";
import RecuperarContrasenaPage from "../../modulos/manejo-sesion/paginas/RecuperarContrasenaPage";
import CambiarContrasenaInicialPage from "../../modulos/manejo-sesion/paginas/CambiarContrasenaInicialPage";
import ProtectedRoute from "../../modulos/manejo-sesion/ProtectedRoute";
import AccesoDenegadoPage from "../../modulos/manejo-sesion/paginas/AccesoDenegadoPage";

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
        path: "estado-inscripcion",
        element: <EstadoInscripcionPage />,
      },
      {
        path: "*",
        element: <PaginaNoEncontrada />,
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
            element: <ProtectedRoute rolesPermitidos={["ASPIRANTE", "ALUMNO"]}><DashboardEstudiantePage /></ProtectedRoute>,
          },
          {
            path: "dashboard/general",
            element: <DashboardRolGeneralPage />,
          },
          {
            path: "dashboard/acceso-denegado",
            element: <AccesoDenegadoPage />,
          },
          {
            path: "dashboard/perfil",
            element: <MiPerfilPage />,
          },
          {
            path: "dashboard/estado-academico",
            element: <ProtectedRoute rolesPermitidos={["ASPIRANTE", "ALUMNO"]}><EstadoAcademicoPage /></ProtectedRoute>,
          },
          {
            path: "dashboard/trabajo-final",
            element: <ProtectedRoute rolesPermitidos={["ASPIRANTE", "ALUMNO"]}><TrabajoFinalPage /></ProtectedRoute>,
          },
          {
            path: "dashboard/tutorias",
            element: <ProtectedRoute rolesPermitidos={["ASPIRANTE", "ALUMNO"]}><TutoriasPage /></ProtectedRoute>,
          },
          {
            path: "dashboard/certificados",
            element: <ProtectedRoute rolesPermitidos={["ASPIRANTE", "ALUMNO"]}><CertificadosPage /></ProtectedRoute>,
          },
          {
            path: "dashboard/asistencias",
            element: <ProtectedRoute rolesPermitidos={["ASPIRANTE", "ALUMNO"]}><AsistenciasEstudiantePage /></ProtectedRoute>,
          },

          // DOCENTE
          {
            path: "dashboard/docente",
            element: <ProtectedRoute rolesPermitidos={["DOCENTE"]}><DashboardDocentePage /></ProtectedRoute>,
          },
          {
            path: "dashboard/docente/perfil",
            element: <MiPerfilPage />,
          },
          {
            path: "dashboard/docente/seminarios",
            element: <ProtectedRoute rolesPermitidos={["DOCENTE"]}><MisSeminariosPage /></ProtectedRoute>,
          },
          {
            path: "dashboard/docente/estudiantes",
            element: <ProtectedRoute rolesPermitidos={["DOCENTE"]}><EstudiantesPage /></ProtectedRoute>,
          },
          {
            path: "dashboard/docente/asistencia",
            element: <ProtectedRoute rolesPermitidos={["DOCENTE"]}><PanelAsistenciaPage /></ProtectedRoute>,
          },
          {
            path: "dashboard/docente/calificaciones",
            element: <ProtectedRoute rolesPermitidos={["DOCENTE"]}><CalificacionesPage /></ProtectedRoute>,
          },
          {
            path: "dashboard/docente/reportes",
            element: <ProtectedRoute rolesPermitidos={["DOCENTE"]}><ReportesPage /></ProtectedRoute>,
          },
          {
            path: "dashboard/docente/pendientes",
            element: <ProtectedRoute rolesPermitidos={["DOCENTE"]}><PendientesPage /></ProtectedRoute>,
          },
          {
            path: "dashboard/docente/profesores",
            element: <ProtectedRoute rolesPermitidos={["DOCENTE"]}><ProfesoresPage /></ProtectedRoute>,
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
          {
            path: "dashboard/conduccion/periodos-inscripcion",
            element: <PeriodosInscripcionPage />,
          },
          {
            path: "dashboard/conduccion/exportaciones",
            element: <ExportacionesConduccionPage />,
          },
          {
            path: "dashboard/conduccion/perfiles-academicos",
            element: <PerfilesAcademicosConduccionPage />,
          },
          {
            path: "dashboard/conduccion/tutorias",
            element: <TutoriasConduccionPage />,
          },
          {
            path: "dashboard/conduccion/trabajos-finales",
            element: <TrabajosFinalesConduccionPage />,
          },
          {
            path: "dashboard/conduccion/seminarios",
            element: <SeminariosConduccionPage />,
          },
          {
            path: "dashboard/conduccion/alertas",
            element: <AlertasConduccionPage />,
          },
          {
            path: "dashboard/conduccion/estadisticas",
            element: <EstadisticasConduccionPage />,
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
            path: "dashboard/administrador/estadisticas",
            element: <EstadisticasPage />,
          },
          {
            path: "dashboard/administrador/reportes",
            element: <ReportesAdminPage />,
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

