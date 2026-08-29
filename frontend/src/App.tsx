import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from './dashboard-coordinador/pages/Dashboard';
import LoginScreen from "./Login/pages/Login";
import WelcomeScreen from "./Login/pages/WelcomeScreen";
import NotFound from "./shared/pages/NotFound";
import InscripcionWizard from './inscripcion-aspirante/pages/InscripcionWizard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/">
          <Route index element={<Dashboard />}/>
          <Route path="login" element={<LoginScreen />}/>
          <Route path="welcome" element={<WelcomeScreen />}/>
          <Route path="inscripcion" element={<InscripcionWizard />}/>
          <Route path="*" element={<NotFound />}/>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}