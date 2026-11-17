// Navegación mediante Route

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import CoordinadorLayout from './layouts/CoordinadorLayout';
import RequireRole from './auth/RequireRole';
import InscripcionAspirante from './pages/InscripcionAspirante';
import Login from './pages/Login';
import AuthLanding from './pages/AuthLanding';
import PanelConduccion from './pages/PanelConduccion';
import GestionDocente from './pages/GestionDocente';
import GestionLegajos from './pages/GestionLegajos';
import SeguimientoGraduacion from './pages/SeguimientoGraduacion';
import TrabajosFinalesCPR from './pages/TrabajosFinalesCPR';

const NotFound = () => <div className="p-10 text-xl text-red-500 text-center mt-10">404 - Página no encontrada</div>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          {/* Vistas Públicas */}
          <Route path="/" element={<Navigate to="/inscripcion" replace />} />
          <Route path="/inscripcion" element={<InscripcionAspirante />} />
          <Route path="/login" element={<Login />} />
          <Route element={<RequireRole roles={['COORDINADOR', 'CPR', 'ADMIN']} />}>
            <Route path="/acceso" element={<AuthLanding />} />
          </Route>
          <Route element={<RequireRole roles={['COORDINADOR']} />}>
            <Route path="/coordinador" element={<CoordinadorLayout />}>
              <Route index element={<Navigate to="legajos" replace />} />
              <Route path="legajos" element={<GestionLegajos />} />
              <Route path="panel" element={<PanelConduccion />} />
              <Route path="gestion-docente" element={<GestionDocente />} />
              <Route path="graduacion" element={<SeguimientoGraduacion />} />
            </Route>
          </Route>
          <Route element={<RequireRole roles={['CPR']} />}>
            <Route path="/cpr/trabajos-finales" element={<TrabajosFinalesCPR />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;