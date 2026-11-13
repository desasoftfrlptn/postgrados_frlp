//  El job del backend manda el email automático.
//  Este hook cubre el botón "Notificar docente"
//  que está en NotificacionCard.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { crearNotificacionDocenteInactivo } from "@/AlertasNotificaciones/services/notificacion.service";
import type { MetaDocenteSinAsistencia } from "@/AlertasNotificaciones/types/notificacion.types";

export function useNotificarDocente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meta: MetaDocenteSinAsistencia) => {
      // cuando el backend esté listo
      // await api.post(`/docentes/${meta.docenteId}/recordatorio`);

      // Mock: genera la notificación interna
      const notif = crearNotificacionDocenteInactivo(meta);
      console.log("[US-D-004] Notificación manual generada:", notif);
      return notif;
    },

    onSuccess: () => {
      // Refresca las notificaciones para que aparezca en el panel
      queryClient.invalidateQueries({ queryKey: ["notificaciones"] });
    },
  });
}