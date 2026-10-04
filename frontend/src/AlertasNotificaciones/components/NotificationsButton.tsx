import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';

export interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
}

interface NotificationsButtonProps {
  notifications: Notification[];
}

export function NotificationsButton({ notifications }: NotificationsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="relative flex items-center gap-2 rounded-full border border-line bg-paper-surface px-3 py-1.5 text-sm font-medium text-ink-secondary transition-colors hover:bg-paper-elevated"
      >
        <Bell size={16} />
        Notificaciones
        {unreadCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-semaforo-rojo px-1 text-xs font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 overflow-hidden rounded-2xl border border-line bg-paper-surface shadow-card">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Notificaciones</h2>
          </div>

          <div className="scroll-fade max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-ink-muted">
                No tenés notificaciones nuevas.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 text-sm transition-colors hover:bg-paper-elevated/60 ${
                      !n.read ? 'bg-brand-50 dark:bg-sidebar-active/40' : ''
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        n.read ? 'bg-transparent' : 'bg-brand-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{n.title}</p>
                      <p className="mt-0.5 text-ink-secondary">{n.description}</p>
                      <p className="mt-1 text-xs text-ink-muted">{n.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}