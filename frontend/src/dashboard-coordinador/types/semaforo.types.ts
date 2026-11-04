import type { EstadoSemaforo } from "../hooks/useEstudiantesEnRiesgo";

export type TipoCarrera = 'DOCTORADO' | 'MAESTRIA' | 'ESPECIALIZACION';

export interface LogCambioSemaforo {
  id: string;
  estudianteId: string;
  estudianteNombre: string;
  estadoAnterior: EstadoSemaforo;
  estadoNuevo: EstadoSemaforo;
  /** Timestamp ISO 8601 (ej. "2026-10-04T15:38:39.000Z") */
  timestamp: string;
  motivo: string;
  /** true si fue asignado manualmente por un coordinador (BR-008), false si fue automático */
  esManual: boolean;
}

export interface ReglasSemaforo {
  diasSinAvanceRojo: number;
  diasSinAvanceAmarillo: number;
  seminariosAdeudadosRojo: number;
  seminariosAdeudadosAmarillo: number;
}

/**
 * Reglas por tipo de carrera 
 */
export const REGLAS_POR_CARRERA: Record<TipoCarrera, ReglasSemaforo> = {
  DOCTORADO: {
    diasSinAvanceRojo: 90,
    diasSinAvanceAmarillo: 45,
    seminariosAdeudadosRojo: 3,
    seminariosAdeudadosAmarillo: 1,
  },
  MAESTRIA: {
    diasSinAvanceRojo: 60,
    diasSinAvanceAmarillo: 30,
    seminariosAdeudadosRojo: 3,
    seminariosAdeudadosAmarillo: 1,
  },
  ESPECIALIZACION: {
    diasSinAvanceRojo: 45,
    diasSinAvanceAmarillo: 20,
    seminariosAdeudadosRojo: 4,
    seminariosAdeudadosAmarillo: 2,
  },
};
