// ─────────────────────────────────────────────
//  NotificacionCard.tsx  (reemplaza al existente)
//  Agrega: badge de prioridad + acciones según tipo
// ─────────────────────────────────────────────

import { Check, X, Share2, CheckCheck, AlertTriangle, FileX, GraduationCap, ClipboardList } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import type { Notificacion, NotificacionTipo } from '../types/notificacion.types';

// ── Iconos y colores por tipo ─────────────────

const TIPO_CONFIG: Record<
  NotificacionTipo,
  { icon: React.ElementType; colorClass: string; label: string }
> = {
  BECA_SOLICITADA:        { icon: GraduationCap,   colorClass: 'text-blue-500 bg-blue-50',   label: 'Beca' },
  DOCUMENTO_FALTANTE:     { icon: FileX,            colorClass: 'text-amber-500 bg-amber-50', label: 'Doc. faltante' },
  ESTUDIANTE_EN_RIESGO:   { icon: AlertTriangle,    colorClass: 'text-red-500 bg-red-50',     label: 'Riesgo' },
  DOCENTE_SIN_ASISTENCIA: { icon: ClipboardList,    colorClass: 'text-orange-500 bg-orange-50', label: 'Asistencia' },
  NUEVA_INSCRIPCION:      { icon: Check,            colorClass: 'text-green-500 bg-green-50', label: 'Inscripción' },
  PERIODO_CERRADO:        { icon: X,                colorClass: 'text-gray-500 bg-gray-100',  label: 'Período' },
};

const PRIORIDAD_BADGE: Record<string, string> = {
  alta:  'bg-red-100 text-red-700',
  media: 'bg-amber-100 text-amber-700',
  baja:  'bg-gray-100 text-gray-500',
};

// ── Props ─────────────────────────────────────

interface NotificacionCardProps {
  notificacion: Notificacion;
  onAprobar:      (id: string) => void;
  onRechazar:     (id: string) => void;
  onDelegar:      (id: string) => void;
  onMarcarLeido:  (id: string) => void;
  // Acciones específicas por tipo (opcionales)
  onVerLegajo?:   (id: string) => void;  // DOCUMENTO_FALTANTE
  onVerAlumno?:   (id: string) => void;  // ESTUDIANTE_EN_RIESGO
  onNotificarDocente?: (id: string) => void; // DOCENTE_SIN_ASISTENCIA
}

// ── Acciones condicionales por tipo ──────────

function AccionesPorTipo({
  notificacion,
  onAprobar,
  onRechazar,
  onDelegar,
  onMarcarLeido,
  onVerLegajo,
  onVerAlumno,
  onNotificarDocente,
}: NotificacionCardProps) {
  const { id, tipo, read } = notificacion;

  switch (tipo) {
    // US-CORE-002: beca → aprobar / rechazar / delegar
    case 'BECA_SOLICITADA':
      return (
        <>
          <Button variant="primary" icon={Check} onClick={() => onAprobar(id)}>Aprobar beca</Button>
          <Button variant="danger"  icon={X}     onClick={() => onRechazar(id)}>Rechazar</Button>
          <Button variant="outline" icon={Share2} onClick={() => onDelegar(id)}>Delegar</Button>
          {!read && (
            <Button variant="ghost" icon={CheckCheck} onClick={() => onMarcarLeido(id)}>Marcar leído</Button>
          )}
        </>
      );

    // US-CORE-004: doc faltante → ver legajo / notificar al aspirante
    case 'DOCUMENTO_FALTANTE':
      return (
        <>
          {onVerLegajo && (
            <Button variant="primary" onClick={() => onVerLegajo(id)}>Ver legajo</Button>
          )}
          <Button variant="outline" icon={Share2} onClick={() => onDelegar(id)}>Notificar aspirante</Button>
          {!read && (
            <Button variant="ghost" icon={CheckCheck} onClick={() => onMarcarLeido(id)}>Marcar leído</Button>
          )}
        </>
      );

    // US-C-004: riesgo → ver alumno / delegar al coordinador
    case 'ESTUDIANTE_EN_RIESGO':
      return (
        <>
          {onVerAlumno && (
            <Button variant="primary" onClick={() => onVerAlumno(id)}>Ver alumno</Button>
          )}
          <Button variant="outline" icon={Share2} onClick={() => onDelegar(id)}>Delegar</Button>
          {!read && (
            <Button variant="ghost" icon={CheckCheck} onClick={() => onMarcarLeido(id)}>Marcar leído</Button>
          )}
        </>
      );

    // US-D-004: docente inactivo → notificar docente
    case 'DOCENTE_SIN_ASISTENCIA':
      return (
        <>
          {onNotificarDocente && (
            <Button variant="primary" onClick={() => onNotificarDocente(id)}>Notificar docente</Button>
          )}
          <Button variant="outline" icon={Share2} onClick={() => onDelegar(id)}>Delegar</Button>
          {!read && (
            <Button variant="ghost" icon={CheckCheck} onClick={() => onMarcarLeido(id)}>Marcar leído</Button>
          )}
        </>
      );

    // Tipos existentes: comportamiento original
    default:
      return (
        <>
          <Button variant="primary" icon={Check}     onClick={() => onAprobar(id)}>Aprobar</Button>
          <Button variant="danger"  icon={X}          onClick={() => onRechazar(id)}>Rechazar</Button>
          <Button variant="outline" icon={Share2}     onClick={() => onDelegar(id)}>Delegar</Button>
          {!read && (
            <Button variant="ghost" icon={CheckCheck} onClick={() => onMarcarLeido(id)}>Marcar leído</Button>
          )}
        </>
      );
  }
}

// ── Card principal ────────────────────────────

export function NotificacionCard(props: NotificacionCardProps) {
  const { notificacion } = props;
  const { tipo, title, description, time, read, prioridad } = notificacion;

  const config = TIPO_CONFIG[tipo] ?? TIPO_CONFIG['NUEVA_INSCRIPCION'];
  const IconoTipo = config.icon;

  return (
    <div
      className={`rounded-2xl border border-line bg-paper-surface p-4 shadow-card transition-colors ${
        !read ? 'ring-1 ring-brand-500/20' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Ícono de tipo */}
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.colorClass}`}>
          <IconoTipo size={15} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-ink">{title}</p>
            {/* Badge de prioridad — solo si es alta o la notif no está leída */}
            {(prioridad === 'alta' || !read) && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORIDAD_BADGE[prioridad]}`}>
                {prioridad === 'alta' ? 'Urgente' : config.label}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-ink-secondary">{description}</p>
          <p className="mt-1 text-xs text-ink-muted">{time}</p>
        </div>

        {/* Punto de no leído */}
        {!read && (
          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
        )}
      </div>

      {/* Acciones */}
      <div className="mt-4 flex flex-wrap gap-2">
        <AccionesPorTipo {...props} />
      </div>
    </div>
  );
}