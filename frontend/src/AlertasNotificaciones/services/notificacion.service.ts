// ─────────────────────────────────────────────
//  notificacion.service.ts
//  Fábrica de notificaciones para las 4 US
//  US-CORE-002 | US-CORE-004 | US-C-004 | US-D-004
// ─────────────────────────────────────────────

import type {
  Notificacion,
  MetaBecaSolicitada,
  MetaDocumentoFaltante,
  MetaEstudianteEnRiesgo,
  MetaDocenteSinAsistencia,
} from '../types/notificacion.types';

// ── Helpers ───────────────────────────────────

function generarId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function tiempoRelativo(fecha: Date): string {
  const diff = Date.now() - fecha.getTime();
  const min  = Math.floor(diff / 60_000);
  const hs   = Math.floor(diff / 3_600_000);
  const dias = Math.floor(diff / 86_400_000);
  if (min < 1)   return 'Ahora';
  if (min < 60)  return `Hace ${min} min`;
  if (hs  < 24)  return `Hace ${hs} h`;
  if (dias === 1) return 'Ayer';
  return `Hace ${dias} días`;
}

// ── US-CORE-002: Solicitud de beca ────────────
// Se llama cuando el aspirante envía el formulario con "Solicito beca" marcado.

export function crearNotificacionBeca(
  meta: MetaBecaSolicitada,
  fecha = new Date(),
): Notificacion {
  return {
    id: generarId(),
    tipo: 'BECA_SOLICITADA',
    title: `Solicitud de beca — ${meta.aspiranteNombre}`,
    description: `Solicita beca del ${meta.porcentajeBeca}% para ${meta.carrera}, cohorte ${meta.cohorte}. Requiere aprobación del coordinador.`,
    time: tiempoRelativo(fecha),
    read: false,
    prioridad: 'media',
    meta,
  };
}

// ── US-CORE-004: Documentos faltantes ─────────
// Se llama al intentar enviar legajo a revisión con docs incompletos.

export function crearNotificacionDocFaltante(
  meta: MetaDocumentoFaltante,
  fecha = new Date(),
): Notificacion {
  const lista = meta.documentosFaltantes.join(', ');
  const vence = meta.diasRestantes !== null
    ? ` Vence en ${meta.diasRestantes} día${meta.diasRestantes === 1 ? '' : 's'}.`
    : '';

  return {
    id: generarId(),
    tipo: 'DOCUMENTO_FALTANTE',
    title: `Documento faltante — ${meta.alumnoNombre}`,
    description: `Falta cargar: ${lista}.${vence}`,
    time: tiempoRelativo(fecha),
    read: false,
    prioridad: meta.diasRestantes !== null && meta.diasRestantes <= 3 ? 'alta' : 'media',
    meta,
  };
}

// ── US-C-004: Estudiante en riesgo ROJO ───────
// Se llama desde el job diario cuando un alumno cambia a semáforo ROJO.

export function crearNotificacionRiesgo(
  meta: MetaEstudianteEnRiesgo,
  fecha = new Date(),
): Notificacion {
  return {
    id: generarId(),
    tipo: 'ESTUDIANTE_EN_RIESGO',
    title: `⚠ Estudiante en riesgo — ${meta.alumnoNombre}`,
    description: `${meta.carrera}. Motivo: ${meta.motivoRiesgo}. Lleva ${meta.diasEnRojo} día${meta.diasEnRojo === 1 ? '' : 's'} en rojo.`,
    time: tiempoRelativo(fecha),
    read: false,
    prioridad: 'alta',
    meta,
  };
}

// ── US-D-004: Docente sin asistencia >14 días ─
// Se llama desde el job diario cuando un docente no cargó en +14 días.

export function crearNotificacionDocenteInactivo(
  meta: MetaDocenteSinAsistencia,
  fecha = new Date(),
): Notificacion {
  return {
    id: generarId(),
    tipo: 'DOCENTE_SIN_ASISTENCIA',
    title: `Docente sin carga — ${meta.docenteNombre}`,
    description: `No registró asistencia en "${meta.seminario}" hace ${meta.diasSinCargar} días. ${meta.alumnosSinRegistro} alumnos sin registro.`,
    time: tiempoRelativo(fecha),
    read: false,
    prioridad: meta.diasSinCargar > 21 ? 'alta' : 'media',
    meta,
  };
}