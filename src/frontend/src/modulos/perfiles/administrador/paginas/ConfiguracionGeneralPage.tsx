import { Navigate } from "react-router-dom";

// Ruta histórica: las funciones se gestionan desde Cohortes y Contenido público.
// Conservar la redirección evita romper marcadores o enlaces previamente compartidos.
export default function ConfiguracionGeneralPage() {
  return <Navigate to="/dashboard/administrador" replace />;
}
