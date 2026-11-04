import EstudiantesEnRiesgo from "../components/EstudiantesEnRiesgo";
import { useEstudiantesEnRiesgo } from "../hooks/useEstudiantesEnRiesgo";
import { useSemaforoTareaProgramada } from "../hooks/useSemaforoTareaProgramada";

export default function EstudiantesEnRiesgoPage() {
  const { estudiantes: estudiantesBase, isLoading, error } = useEstudiantesEnRiesgo();

  const {
    estudiantes,
    logs,
    ultimaEjecucion,
    ejecutando,
    ejecutarTareaProgramadaAhora,
    asignarVerdeManual,
  } = useSemaforoTareaProgramada(estudiantesBase);

  return (
    <EstudiantesEnRiesgo
      estudiantes={estudiantes}
      logs={logs}
      ultimaEjecucion={ultimaEjecucion}
      ejecutando={ejecutando}
      onEjecutarRecalculo={ejecutarTareaProgramadaAhora}
      onAsignarVerdeManual={asignarVerdeManual}
      isLoading={isLoading}
      error={error}
      nombreArchivoExport="estudiantes-en-riesgo"
      usuarioExportador="Ana González"
    />
  );
}
