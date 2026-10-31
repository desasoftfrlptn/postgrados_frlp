import { useState, useEffect, useCallback } from "react";
import type { EstudianteRiesgo } from "./useEstudiantesEnRiesgo";
import type { LogCambioSemaforo } from "../types/semaforo.types";
import type { Notificacion } from "@/AlertasNotificaciones/types/notificacion.types";
import { ejecutarRecalculoSemaforoDiario } from "../services/recalcularSemaforo";

const STORAGE_KEY_ESTUDIANTES = "fenix_estudiantes_semaforo";
const STORAGE_KEY_LOGS = "fenix_semaforo_logs";
const STORAGE_KEY_ULTIMA_EJECUCION = "fenix_semaforo_ultima_ejecucion";

export function useSemaforoTareaProgramada(
  estudiantesIniciales: EstudianteRiesgo[],
  onNuevaNotificacion?: (notificaciones: Notificacion[]) => void
) {
  const [estudiantes, setEstudiantes] = useState<EstudianteRiesgo[]>(() => {
    const local = localStorage.getItem(STORAGE_KEY_ESTUDIANTES);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Error al parsear estudiantes de localStorage:", e);
      }
    }
    return estudiantesIniciales;
  });

  const [logs, setLogs] = useState<LogCambioSemaforo[]>(() => {
    const local = localStorage.getItem(STORAGE_KEY_LOGS);
    return local ? JSON.parse(local) : [];
  });

  const [ultimaEjecucion, setUltimaEjecucion] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_ULTIMA_EJECUCION);
  });

  const [ejecutando, setEjecutando] = useState(false);

  // Cuando llegan los datos mock iniciales (vía React Query), inicializar estudiantes si estaba vacío
  useEffect(() => {
    if (estudiantesIniciales.length > 0) {
      const local = localStorage.getItem(STORAGE_KEY_ESTUDIANTES);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEstudiantes(parsed);
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }
      // Si no había nada guardado en local, cargar datos mock iniciales
      setEstudiantes(estudiantesIniciales);
    }
  }, [estudiantesIniciales]);

  // Sincronizar cambios en localStorage
  useEffect(() => {
    if (estudiantes.length > 0) {
      localStorage.setItem(STORAGE_KEY_ESTUDIANTES, JSON.stringify(estudiantes));
    }
  }, [estudiantes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  }, [logs]);

  const ejecutarTareaProgramadaAhora = useCallback(() => {
    setEjecutando(true);

    try {
      const resultado = ejecutarRecalculoSemaforoDiario(estudiantes);
      setEstudiantes(resultado.estudiantesActualizados);
      setLogs((prev) => [...resultado.logsCreados, ...prev]);
      setUltimaEjecucion(resultado.fechaEjecucion);
      localStorage.setItem(STORAGE_KEY_ULTIMA_EJECUCION, resultado.fechaEjecucion);

      // US-C-004: Notificar alertas generadas
      if (resultado.notificacionesGeneradas.length > 0) {
        onNuevaNotificacion?.(resultado.notificacionesGeneradas);
      }
    } catch (error) {
      console.error("Error al ejecutar la tarea programada del semáforo:", error);
    } finally {
      setEjecutando(false);
    }
  }, [estudiantes, onNuevaNotificacion]);

  useEffect(() => {
    if (estudiantes.length === 0) return;

    const hoyStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const ultimaFechaStr = ultimaEjecucion ? ultimaEjecucion.split("T")[0] : null;

    if (ultimaFechaStr !== hoyStr) {
      ejecutarTareaProgramadaAhora();
    }
  }, [estudiantes, ultimaEjecucion, ejecutarTareaProgramadaAhora]);

  const asignarVerdeManual = useCallback(
    (estudianteId: string, motivo: string = "Asignado manualmente por coordinador") => {
      setEstudiantes((prev) =>
        prev.map((est) => {
          if (est.id !== estudianteId) return est;

          const nuevoLog: LogCambioSemaforo = {
            id: `log-manual-${Date.now()}`,
            estudianteId: est.id,
            estudianteNombre: est.nombre,
            estadoAnterior: est.estado,
            estadoNuevo: "verde",
            timestamp: new Date().toISOString(),
            motivo: `BR-008 (Manual): ${motivo}`,
            esManual: true,
          };

          setLogs((prevLogs) => [nuevoLog, ...prevLogs]);

          return {
            ...est,
            estado: "verde",
          };
        })
      );
    },
    []
  );

  return {
    estudiantes,
    logs,
    ultimaEjecucion,
    ejecutando,
    ejecutarTareaProgramadaAhora,
    asignarVerdeManual,
  };
}
