import EstudiantesEnRiesgo from "../components/EstudiantesEnRiesgo";
import { useEstudiantesEnRiesgo } from "../hooks/useEstudiantesEnRiesgo";
import { useAuth } from "@/shared/auth/authContext";

export default function EstudiantesEnRiesgoPage() {
  const { estudiantes, isLoading, error } = useEstudiantesEnRiesgo();
  const { user } = useAuth();
  // La API devuelve el semáforo almacenado. No recalcular ni sustituir por localStorage.
  return (
    <EstudiantesEnRiesgo
      estudiantes={estudiantes}
      isLoading={isLoading}
      error={error}
      nombreArchivoExport="estudiantes-en-riesgo"
      usuarioExportador={user?.nombre ?? "No disponible"}
    />
  );
}
