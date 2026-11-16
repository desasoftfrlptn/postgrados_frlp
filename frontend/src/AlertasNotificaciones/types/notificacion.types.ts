// ─────────────────────────────────────────────
//  Tipos de notificación — Fénix Posgrado
//  Cubre: US-CORE-002, US-CORE-004, US-C-004, US-D-004
// ─────────────────────────────────────────────

export type NotificacionTipo =
  | 'BECA_SOLICITADA'          // US-CORE-002: aspirante marcó que pide beca
  | 'DOCUMENTO_FALTANTE'       // US-CORE-004: legajo con docs incompletos
  | 'ESTUDIANTE_EN_RIESGO'     // US-C-004:   alumno cambió a semáforo ROJO
  | 'DOCENTE_SIN_ASISTENCIA'   // US-D-004:   docente +14 días sin cargar
  | 'NUEVA_INSCRIPCION'        // existente
  | 'PERIODO_CERRADO';         // existente

export type NotificacionPrioridad = 'alta' | 'media' | 'baja';

// ── Metadata específica por tipo ──────────────

export interface MetaBecaSolicitada {
  aspiranteId: string;
  aspiranteNombre: string;
  carrera: string;
  porcentajeBeca: 30 | 100;
  cohorte: string;
}

export interface MetaDocumentoFaltante {
  legajoId: string;
  alumnoNombre: string;
  documentosFaltantes: string[];   // ej: ['DNI', 'Analítico']
  diasRestantes: number | null;    // null = sin vencimiento definido
}

export interface MetaEstudianteEnRiesgo {
  alumnoId: string;
  alumnoNombre: string;
  carrera: string;
  motivoRiesgo: string;            // ej: 'Sin avance en tesis hace 60 días'
  diasEnRojo: number;
}

export interface MetaDocenteSinAsistencia {
  docenteId: string;
  docenteNombre: string;
  seminario: string;
  diasSinCargar: number;
  alumnosSinRegistro: number;
}

export type NotificacionMeta =
  | MetaBecaSolicitada
  | MetaDocumentoFaltante
  | MetaEstudianteEnRiesgo
  | MetaDocenteSinAsistencia
  | Record<string, unknown>;   // para tipos existentes sin metadata tipada

// ── Tipo principal ────────────────────────────

export interface Notificacion {
  id: string;
  tipo: NotificacionTipo;
  title: string;
  description: string;
  time: string;                    // string formateado: 'Hace 10 min', 'Ayer'…
  read: boolean;
  prioridad: NotificacionPrioridad;
  meta: NotificacionMeta;
  // acciones disponibles: se derivan del tipo en NotificacionCard
}