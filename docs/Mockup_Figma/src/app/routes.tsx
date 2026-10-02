import { createBrowserRouter, Navigate } from "react-router";
import { Root } from "./components/Root";
import { LoginPage } from "./components/LoginPage";
import { PublicInscripcion } from "./components/PublicInscripcion";
import { StudentPortal } from "./components/StudentPortal";
import { DocentePortal } from "./components/DocentePortal";
import { ConduccionPortal } from "./components/ConduccionPortal";
import { MiAvance } from "./components/student/MiAvance";
import { Inscripcion } from "./components/student/Inscripcion";
import { EstadoTramite } from "./components/student/EstadoTramite";
import { MisCursos } from "./components/docente/MisCursos";
import { PlanillaDocente } from "./components/docente/PlanillaDocente";
import { Dashboard } from "./components/conduccion/Dashboard";
import { BuscadorEstudiantes } from "./components/conduccion/BuscadorEstudiantes";
import { GestionTesis } from "./components/conduccion/GestionTesis";
import { GestionInscripciones } from "./components/conduccion/GestionInscripciones";
import { ComingSoon } from "./components/ComingSoon";
import { NotFound } from "./components/NotFound";

function NotificacionesPage()  { return <ComingSoon title="Notificaciones" />; }
function RecibosPage()          { return <ComingSoon title="Recibos de Sueldo" />; }
function ReportesPage()         { return <ComingSoon title="Reportes y Exportación" />; }
function AlertasPage()          { return <ComingSoon title="Alertas y Vencimientos" />; }
function ConfiguracionPage()    { return <ComingSoon title="Configuración" />; }

function StudentIndex()    { return <Navigate to="avance"     replace />; }
function DocenteIndex()    { return <Navigate to="cursos"     replace />; }
function ConduccionIndex() { return <Navigate to="dashboard"  replace />; }

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: LoginPage },
      { path: "inscripcion", Component: PublicInscripcion },

      {
        path: "estudiante",
        Component: StudentPortal,
        children: [
          { index: true,         Component: StudentIndex },
          { path: "avance",      Component: MiAvance },
          { path: "tramite",     Component: EstadoTramite },
          { path: "inscripcion", Component: Inscripcion },
        ],
      },

      {
        path: "docente",
        Component: DocentePortal,
        children: [
          { index: true,          Component: DocenteIndex },
          { path: "cursos",       Component: MisCursos },
          { path: "planilla",     Component: PlanillaDocente },
          { path: "notificaciones", Component: NotificacionesPage },
          { path: "recibos",      Component: RecibosPage },
        ],
      },

      {
        path: "conduccion",
        Component: ConduccionPortal,
        children: [
          { index: true,              Component: ConduccionIndex },
          { path: "dashboard",        Component: Dashboard },
          { path: "inscripciones",    Component: GestionInscripciones },
          { path: "buscador",         Component: BuscadorEstudiantes },
          { path: "reportes",         Component: ReportesPage },
          { path: "tesis",            Component: GestionTesis },
          { path: "alertas",          Component: AlertasPage },
          { path: "configuracion",    Component: ConfiguracionPage },
        ],
      },

      { path: "*", Component: NotFound },
    ],
  },
]);
