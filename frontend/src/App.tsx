import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginScreen from "./Login/pages/Login";
import WelcomeScreen from "./Login/pages/WelcomeScreen";
import { ConsultarEstado } from "./inscripcion-aspirante/pages/ConsultarEstado";
import NotFound from "./shared/pages/NotFound";
import InscripcionWizard from './inscripcion-aspirante/pages/InscripcionWizard';
import RegistroAsistencia from './modulo-docente/pages/RegistroAsistencia';
import InscripcionWizard from "./inscripcion-aspirante/pages/InscripcionWizard";
import { UserContext } from "./shared/context/UserContext";
import type { User } from "./shared/types/types";
import Dashboard from "./dashboard-coordinador/pages/Dashboard";

export default function App() {
  const currentUser: User = {
    nombre: "Ana González",
    rol: "coordinador",
    email: "ana@ejemplo.com",
    password_hash: "",
    password_plano: "",
    activo: true,
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/">
          <Route index element={<Dashboard />}/>
          <Route path="login" element={<LoginScreen />}/>
          <Route path="welcome" element={<WelcomeScreen />}/>
          <Route path="inscripcion" element={<InscripcionWizard />}/>
          <Route path="*" element={<NotFound />}/>
          <Route path="asistencia" element={<RegistroAsistencia />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
    <UserContext.Provider value={currentUser}>
      <BrowserRouter>
        <Routes>
          <Route path="/">
            <Route index element={<LoginScreen />} />

            <Route
              path="panel"
              element={<Dashboard path="/panel" />}
            />

            <Route
              path="estadisticas"
              element={<Dashboard path="/estadisticas" />}
            />

            <Route
              path="inscriptos"
              element={<Dashboard path="/inscriptos" />}
            />

            <Route
              path="inscriptos/nuevo"
              element={<Dashboard path="/inscriptos/nuevo" />}
            />

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

            <Route
              path="welcome"
              element={<WelcomeScreen />}
            />

            <Route
              path="consultar"
              element={<ConsultarEstado />}
            />

            <Route
              path="inscripcion"
              element={<InscripcionWizard />}
            />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </UserContext.Provider>
  );
}