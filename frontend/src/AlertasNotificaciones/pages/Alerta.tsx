import { useState } from 'react';
import { Sidebar } from '@/shared/components/Sidebar';
import { menuItems } from '@/shared/menuConfig';
import type { User } from '@/shared/types/types';
import { NotificationsButton } from '../../shared/components/NotificationsButton';
import { NotificacionCard, type Notificacion } from '../components/NotificacionCard';

const currentUser: User = {
  id: 'u1',
  nombre: 'Ana González',
  rol: 'coordinador',
  email: 'ana@ejemplo.com',
};

const mockNotificaciones: Notificacion[] = [
  {
    id: '1',
    title: 'Nueva inscripción — Juan Pérez',
    description: 'Solicita inscripción a Maestría en Tecnología Informática, cohorte 2025.',
    time: 'Hace 10 min',
    read: false,
  },
  {
    id: '2',
    title: 'Documento faltante — María López',
    description: 'Falta cargar el DNI en el legajo. Vence en 3 días.',
    time: 'Hace 2 h',
    read: false,
  },
  {
    id: '3',
    title: 'Solicitud de beca — Carlos Ruiz',
    description: 'Pide beca del 50% para Especialización en Ciberseguridad.',
    time: 'Hace 5 h',
    read: false,
  },
  {
    id: '4',
    title: 'Período de inscripción cerrado',
    description: 'Se cerró automáticamente el período de inscripción 2025.',
    time: 'Ayer',
    read: true,
  },
];

export default function Alerta() {
  const [currentPath, setCurrentPath] = useState('/notificaciones');
  const [notificaciones, setNotificaciones] = useState(mockNotificaciones);

  const handleAprobar = (id: string) => console.log('Aprobar', id);
  const handleRechazar = (id: string) => console.log('Rechazar', id);
  const handleDelegar = (id: string) => console.log('Delegar', id);
  const handleMarcarLeido = (id: string) => {
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <div className="flex h-screen w-full bg-paper text-ink">
      <Sidebar
        user={currentUser}
        items={menuItems}
        currentPath={currentPath}
        onNavigate={setCurrentPath}
      />

      <main className="scroll-fade flex-1 overflow-y-auto px-8 py-6 transition-colors">
        <div className="mb-6 flex items-center justify-between">
          <h1>Notificaciones</h1>
          <NotificationsButton notifications={notificaciones} />
        </div>

        <div className="flex flex-col gap-3">
          {notificaciones.map((n) => (
            <NotificacionCard
              key={n.id}
              notificacion={n}
              onAprobar={handleAprobar}
              onRechazar={handleRechazar}
              onDelegar={handleDelegar}
              onMarcarLeido={handleMarcarLeido}
            />
          ))}
        </div>
      </main>
    </div>
  );
}