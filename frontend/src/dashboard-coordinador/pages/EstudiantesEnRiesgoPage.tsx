import EstudiantesEnRiesgo from "../components/EstudiantesEnRiesgo";
import { useEstudiantesEnRiesgo } from "../hooks/useEstudiantesEnRiesgo";

export default function EstudiantesEnRiesgoPage() {
  const {
    estudiantes,
    isLoading,
    error,
  } = useEstudiantesEnRiesgo();

  return (
    <EstudiantesEnRiesgo
      estudiantes={estudiantes}
      isLoading={isLoading}
      error={error}
      nombreArchivoExport="estudiantes-en-riesgo"
      usuarioExportador="Ana González"
    />
  );
}