import { Check, X, Share2, CheckCheck } from 'lucide-react';
import { Button } from '@/shared/components/Button';

export interface Notificacion {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
}

interface NotificacionCardProps {
  notificacion: Notificacion;
  onAprobar: (id: string) => void;
  onRechazar: (id: string) => void;
  onDelegar: (id: string) => void;
  onMarcarLeido: (id: string) => void;
}

export function NotificacionCard({
  notificacion,
  onAprobar,
  onRechazar,
  onDelegar,
  onMarcarLeido,
}: NotificacionCardProps) {
  const { id, title, description, time, read } = notificacion;

  return (
    <div
      className={`rounded-2xl border border-line bg-paper-surface p-4 shadow-card transition-colors ${
        !read ? 'ring-1 ring-brand-500/20' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
            read ? 'bg-transparent' : 'bg-brand-500'
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">{title}</p>
          <p className="mt-0.5 text-sm text-ink-secondary">{description}</p>
          <p className="mt-1 text-xs text-ink-muted">{time}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" icon={Check} onClick={() => onAprobar(id)}>
          Aprobar
        </Button>
        <Button variant="danger" icon={X} onClick={() => onRechazar(id)}>
          Rechazar
        </Button>
        <Button variant="outline" icon={Share2} onClick={() => onDelegar(id)}>
          Delegar
        </Button>
        <Button variant="ghost" icon={CheckCheck} onClick={() => onMarcarLeido(id)}>
          Marcar como leído
        </Button>
      </div>
    </div>
  );
}