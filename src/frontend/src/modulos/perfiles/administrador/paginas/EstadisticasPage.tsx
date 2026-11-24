import { Navigate } from "react-router-dom";

// Conserva los enlaces anteriores sin duplicar la pantalla de reportes.
export default function EstadisticasPage() {
  return <Navigate to="/dashboard/administrador/reportes" replace />;
}
