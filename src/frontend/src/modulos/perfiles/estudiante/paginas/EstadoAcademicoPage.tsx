import { Navigate, useSearchParams } from "react-router-dom";
import SeminariosEstudiante from "../componentes/SeminariosEstudiante";

export default function EstadoAcademicoPage() {
  const [parametros] = useSearchParams();
  if (parametros.get("vista") === "seminarios") {
    return <Navigate to="/dashboard/seminarios" replace />;
  }
  return <SeminariosEstudiante gestion={false} />;
}
