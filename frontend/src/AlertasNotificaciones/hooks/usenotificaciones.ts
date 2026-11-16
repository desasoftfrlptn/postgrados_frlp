// ─────────────────────────────────────────────
//  useNotificaciones.ts
//  Hook listo para conectar al backend.
//  Por ahora devuelve el mock; cuando el backend
//  esté, solo hay que descomentar el fetch.
// ─────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import type { Notificacion } from '../types/notificacion.types';

interface UseNotificacionesReturn {
  notificaciones: Notificacion[];
  loading: boolean;
  marcarLeido:  (id: string) => void;
  marcarTodosLeidos: () => void;
  eliminar:     (id: string) => void;
  refetch:      () => void;
}

export function useNotificaciones(
  usuarioId: string,
  mock?: Notificacion[],  // pasar mock mientras no hay backend
): UseNotificacionesReturn {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>(mock ?? []);
  const [loading, setLoading] = useState(false);

  const fetchNotificaciones = useCallback(async () => {
    if (mock) return; // si hay mock, no hace fetch
    setLoading(true);
    try {
      // ── Descomentar cuando el backend esté listo ──
      // const res = await fetch(`/api/notificaciones?usuarioId=${usuarioId}`);
      // const data: Notificacion[] = await res.json();
      // setNotificaciones(data);
    } catch (err) {
      console.error('Error cargando notificaciones:', err);
    } finally {
      setLoading(false);
    }
  }, [usuarioId, mock]);

  useEffect(() => {
    fetchNotificaciones();
  }, [fetchNotificaciones]);

  const marcarLeido = useCallback((id: string) => {
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    // TODO: PATCH /api/notificaciones/:id/leer
  }, []);

  const marcarTodosLeidos = useCallback(() => {
    setNotificaciones(prev => prev.map(n => ({ ...n, read: true })));
    // TODO: PATCH /api/notificaciones/leer-todas
  }, []);

  const eliminar = useCallback((id: string) => {
    setNotificaciones(prev => prev.filter(n => n.id !== id));
    // TODO: DELETE /api/notificaciones/:id
  }, []);

  return {
    notificaciones,
    loading,
    marcarLeido,
    marcarTodosLeidos,
    eliminar,
    refetch: fetchNotificaciones,
  };
}