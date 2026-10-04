import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./dashboard-coordinador/pages/Dashboard";
import LoginScreen from "./Login/pages/Login";
import WelcomeScreen from "./Login/pages/WelcomeScreen";
import { ConsultarEstado } from "./inscripcion-aspirante/pages/ConsultarEstado";
import NotFound from "./shared/pages/NotFound";
import InscripcionWizard from "./inscripcion-aspirante/pages/InscripcionWizard";
import { UserContext } from "./shared/context/UserContext.ts";

import type { User } from "./shared/types/types.ts";

export default function App() {
  // User de ejemplo
  const currentUser: User = {
    nombre: "Ana González",
    rol: "cpr",
    email: "ana@ejemplo.com",
    password_hash: "",
    password_plano: "",
    activo: true,
  };
  return (
    <UserContext.Provider value={currentUser}>
      <BrowserRouter>
        <Routes>
          <Route path="/">
            <Route index element={<LoginScreen />} />
            <Route path="panel" element={<Dashboard path="/panel" />} />
            <Route
              path="inscriptos"
              element={<Dashboard path="/inscriptos" />}
            />
            <Route path="inscriptos/:id" element={<Dashboard path="/:id" />} />
            <Route path="welcome" element={<WelcomeScreen />} />
            <Route path="consultar" element={<ConsultarEstado />} />
            <Route path="inscripcion" element={<InscripcionWizard />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </UserContext.Provider>
  );
}
