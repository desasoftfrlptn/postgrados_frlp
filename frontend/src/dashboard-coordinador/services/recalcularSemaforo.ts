import type { EstudianteRiesgo, EstadoSemaforo } from "../hooks/useEstudiantesEnRiesgo";
import type { Notificacion } from "@/AlertasNotificaciones/types/notificacion.types";
import {
  REGLAS_POR_CARRERA,
  type LogCambioSemaforo,
  type TipoCarrera,
} from "../types/semaforo.types";

/**
 * Determina el tipo de carrera a partir del nombre de la carrera.
 */
export function obtenerTipoCarrera(carreraNombre: string): TipoCarrera {
  const nombreLower = carreraNombre.toLowerCase();
  if (nombreLower.includes('doctorado')) return 'DOCTORADO';
  if (nombreLower.includes('maestría') || nombreLower.includes('maestria')) return 'MAESTRIA';
  return 'ESPECIALIZACION';
}

export interface ResultadoRecalculo {
  estudiantesActualizados: EstudianteRiesgo[];
  logsCreados: LogCambioSemaforo[];
  notificacionesGeneradas: Notificacion[];
  fechaEjecucion: string;
}

/**
 * US-C-002: Recalcula automáticamente el semáforo para todos los estudiantes.
 * US-C-004: Genera notificaciones automáticas de alta prioridad cuando un alumno pasa a estado ROJO.
 */
export function ejecutarRecalculoSemaforoDiario(
  estudiantes: EstudianteRiesgo[]
): ResultadoRecalculo {
  const timestamp = new Date().toISOString();
  const logsCreados: LogCambioSemaforo[] = [];
  const notificacionesGeneradas: Notificacion[] = [];

  const estudiantesActualizados = estudiantes.map((estudiante) => {
    const tipoCarrera = obtenerTipoCarrera(estudiante.carrera);
    const reglas = REGLAS_POR_CARRERA[tipoCarrera];

    let estadoCalculado: EstadoSemaforo = 'verde';
    let motivo = 'Parámetros dentro de los rangos normales';

    // 1. Evaluar si es ROJO
    if (
      estudiante.diasSinAvance >= reglas.diasSinAvanceRojo ||
      estudiante.seminariosAdeudados >= reglas.seminariosAdeudadosRojo
    ) {
      estadoCalculado = 'rojo';
      motivo = `${estudiante.diasSinAvance} días sin avance (máx. ${reglas.diasSinAvanceRojo}) o ${estudiante.seminariosAdeudados} seminarios adeudados`;
    } 
    // 2. Evaluar si es AMARILLO
    else if (
      estudiante.diasSinAvance >= reglas.diasSinAvanceAmarillo ||
      estudiante.seminariosAdeudados >= reglas.seminariosAdeudadosAmarillo
    ) {
      estadoCalculado = 'amarillo';
      motivo = `${estudiante.diasSinAvance} días sin avance (máx. ${reglas.diasSinAvanceAmarillo}) o ${estudiante.seminariosAdeudados} seminarios adeudados`;
    }

    // 3. Aplicar BR-008: El VERDE solo puede asignarse manualmente
    let estadoFinal = estadoCalculado;
    if (estadoCalculado === 'verde' && estudiante.estado !== 'verde') {
      estadoFinal = 'amarillo';
      motivo = `BR-008: Cumple criterios pero requiere asignación manual para pasar a VERDE. Se asigna AMARILLO.`;
    }

    // 4. Si hubo cambio de estado, registrar en la auditoría / logs
    if (estadoFinal !== estudiante.estado) {
      const log: LogCambioSemaforo = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        estudianteId: estudiante.id,
        estudianteNombre: estudiante.nombre,
        estadoAnterior: estudiante.estado,
        estadoNuevo: estadoFinal,
        timestamp,
        motivo: `Recálculo automático: ${motivo}`,
        esManual: false,
      };

      logsCreados.push(log);

      // US-C-004: Notificación automática si pasa a estado ROJO
      if (estadoFinal === 'rojo') {
        const notificacionRiesgo: Notificacion = {
          id: `notif-riesgo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          tipo: 'ESTUDIANTE_EN_RIESGO',
          title: `Alerta de Riesgo Académico: ${estudiante.nombre}`,
          description: `${estudiante.carrera} • ${motivo}`,
          time: 'ahora',
          read: false,
          prioridad: 'alta',
          meta: {
            alumnoId: estudiante.id,
            alumnoNombre: estudiante.nombre,
            carrera: estudiante.carrera,
            motivoRiesgo: motivo,
            diasEnRojo: estudiante.diasSinAvance,
          },
        };

        notificacionesGeneradas.push(notificacionRiesgo);
      }
    }

    return {
      ...estudiante,
      estado: estadoFinal,
    };
  });

  return {
    estudiantesActualizados,
    logsCreados,
    notificacionesGeneradas,
    fechaEjecucion: timestamp,
  };
}
