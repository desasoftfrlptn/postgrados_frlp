import { useState } from 'react';
import { NotificacionCard } from '../components/NotificacionCard';
import type { Notificacion, MetaDocenteSinAsistencia } from '../types/notificacion.types';

interface AlertaProps {
  notificaciones:  Notificacion[];
  onMarcarLeido:   (id: string) => void;
  onActualizar:    (fn: (prev: Notificacion[]) => Notificacion[]) => void;
}

export default function Alerta({ notificaciones, onMarcarLeido, onActualizar }: AlertaProps) {
  const [toast, setToast] = useState<string | null>(null);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const eliminar = (id: string) =>
    onActualizar(prev => prev.filter(n => n.id !== id));

  const handleDelegar = (id: string) => {
    onMarcarLeido(id);
    mostrarToast('Notificación delegada');
  };

  const handleAprobarBeca = (id: string) => {
    onMarcarLeido(id);
    mostrarToast('✓ Beca aprobada correctamente');
    // TODO: PATCH /api/becas/:id { estado: 'aprobada' }
  };

  const handleRechazar = (id: string) => {
    eliminar(id);
    mostrarToast('Solicitud rechazada');
    // TODO: PATCH /api/becas/:id { estado: 'rechazada' }
  };

  const handleVerLegajo = (id: string) => {
    const notif = notificaciones.find(n => n.id === id);
    if (!notif) return;
    onMarcarLeido(id);
    mostrarToast('Abriendo legajo…');
    // TODO: router.push(`/legajos/${meta.legajoId}`)
  };

  const handleVerAlumno = (id: string) => {
    onMarcarLeido(id);
    mostrarToast('Abriendo legajo del alumno…');
    // TODO: router.push(`/alumnos/${meta.alumnoId}`)
  };

  const handleNotificarDocente = (id: string) => {
    const notif = notificaciones.find(n => n.id === id);
    if (!notif) return;
    const meta = notif.meta as MetaDocenteSinAsistencia;
    onMarcarLeido(id);
    mostrarToast(`✓ Recordatorio enviado a ${meta.docenteNombre}`);
    // TODO: POST /api/docentes/:id/recordatorio
  };

  const sinLeer = notificaciones.filter(n => !n.read).length;

  return (
    <div className="relative">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-paper shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Notificaciones</h1>
          {sinLeer > 0 && (
            <p className="mt-0.5 text-sm text-ink-secondary">{sinLeer} sin leer</p>
          )}
        </div>
      </div>

      {notificaciones.length === 0 ? (
        <div className="rounded-2xl border border-line bg-paper-surface p-10 text-center text-ink-muted">
          No hay notificaciones
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notificaciones.map(n => (
            <NotificacionCard
              key={n.id}
              notificacion={n}
              onAprobar={handleAprobarBeca}
              onRechazar={handleRechazar}
              onDelegar={handleDelegar}
              onMarcarLeido={onMarcarLeido}
              onVerLegajo={handleVerLegajo}
              onVerAlumno={handleVerAlumno}
              onNotificarDocente={handleNotificarDocente}
            />
          ))}
        </div>
      )}
    </div>
  );
}