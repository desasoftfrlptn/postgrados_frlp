import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginScreen from "./Login/pages/Login";
import WelcomeScreen from "./Login/pages/WelcomeScreen";
import { ConsultarEstado } from "./inscripcion-aspirante/pages/ConsultarEstado";
import NotFound from "./shared/pages/NotFound";
import RegistroAsistencia from './modulo-docente/pages/RegistroAsistencia';
import InscripcionWizard from "./inscripcion-aspirante/pages/InscripcionWizard";
import Dashboard from "./dashboard-coordinador/pages/Dashboard";
import { ActivarCuenta } from "./inscripcion-aspirante/pages/ActivarCuenta";
import { MiLegajo } from "./estudiante/pages/MiLegajo";

import { RequireAcceso, RequireAuth } from "./shared/auth/RequireAuth";
import type { Rol } from "./shared/types/types";

// Roles por sección. roleHome (types.ts) manda a coordinador, docente, cpr y admin a /panel, así que
// todos entran al dashboard; las pantallas que el backend limita a "coordinador" (listar/exportar
// legajos y crear enlaces con require_role) se restringen aparte. Idealmente estos roles se
// mantienen en sintonía con los `roles` de cada MenuItem del Sidebar.
const ROLES_PERSONAL: readonly Rol[] = ["coordinador", "docente", "cpr", "admin"];
const ROLES_COORDINACION: readonly Rol[] = ["coordinador"];
const ROLES_DOCENTE: readonly Rol[] = ["docente"];
const ROLES_ESTUDIANTE: readonly Rol[] = ["estudiante"];

export default function App() {

  return (
      <BrowserRouter>
        <Routes>
          <Route path="/">
            {/* ── Públicas ── */}
            <Route index element={<LoginScreen />} />
            <Route path="login" element={<LoginScreen />} />
            <Route path="activar-cuenta" element={<ActivarCuenta />} />

            {/* ── Pantalla welcome para estudiantes ── */}
            <Route element={<RequireAuth roles={ROLES_ESTUDIANTE} />}>
              <Route path="welcome" element={<WelcomeScreen />} />
            </Route>

            {/* ── Estudiante: consulta su propio legajo ── */}
            <Route element={<RequireAuth roles={ROLES_ESTUDIANTE} />}>
              <Route path="mi-legajo" element={<MiLegajo />} />
            </Route>

            {/* ── Personal (coordinador, docente, cpr, admin) ── */}
            <Route element={<RequireAuth roles={ROLES_PERSONAL} />}>
              <Route
                path="panel"
                element={<Dashboard path="/panel" />}
              />

              <Route
                path="estadisticas"
                element={<Dashboard path="/estadisticas" />}
              />

              {/* El detalle lo necesita también el CPR (carga del trabajo final) */}
              <Route
                path="inscriptos/:id"
                element={<Dashboard path="/:id" />}
              />

              <Route
                path="seminarios"
                element={<Dashboard path="/seminarios" />}
              />

              <Route
                path="notificaciones"
                element={<Dashboard path="/notificaciones" />}
              />

              <Route
                path="riesgo"
                element={<Dashboard path="/riesgo" />}
              />
            </Route>

            {/* ── Solo coordinación: el backend limita listar/exportar legajos a este rol ── */}
            <Route element={<RequireAuth roles={ROLES_COORDINACION} />}>
              <Route
                path="inscriptos"
                element={<Dashboard path="/inscriptos" />}
              />

              <Route
                path="inscriptos/nuevo"
                element={<Dashboard path="/inscriptos/nuevo" />}
              />
            </Route>

            {/* ── Docente ── */}
            <Route element={<RequireAuth roles={ROLES_DOCENTE} />}>
              <Route path="asistencia" element={<RegistroAsistencia />} />
            </Route>

            {/* ── Aspirantes (enlace temporal con cookie, sin login) ── */}
            <Route element={<RequireAcceso tipo="SEGUIMIENTO" />}>
              <Route path="consultar" element={<ConsultarEstado />} />
            </Route>

            <Route element={<RequireAcceso tipo="INSCRIPCION" />}>
              <Route path="inscripcion" element={<InscripcionWizard />} />
            </Route>

            {/* /no-autorizado y /acceso-invalido (destinos de los guards) caen acá hasta que existan */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
  );
}
