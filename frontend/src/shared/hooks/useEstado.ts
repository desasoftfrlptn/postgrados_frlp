// Ubicación original: "@/shared/hooks/useEstado" (no estaba en lo adjuntado: se escribió a partir
// de cómo lo usa ConsultarEstado → mutateAsync({ id, estado }). Compararlo con el existente.)
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { legajosApi } from "@/shared/api/endpoints";
import { fromApiLegajo } from "@/shared/api/mappers";
import type { EstadoLegajo } from "@/shared/types/types";

interface ActualizarEstadoPayload {
  id: string;
  estado: EstadoLegajo;
  comentario?: string;
}

// PATCH /legajos/:id/estado. Requiere sesión (Bearer): un aspirante sin cuenta recibe 401.
// Si la transición activa al estudiante, la respuesta trae `url_activacion` (sin enviarse por mail todavía).
export function useActualizarEstado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, estado, comentario }: ActualizarEstadoPayload) => {
      const { url_activacion, ...legajo } = await legajosApi.cambiarEstado(id, {
        estado,
        comentario: comentario ?? null,
      });
      return { ...fromApiLegajo(legajo), url_activacion };
    },
    onSuccess: () => {
      // Cubre el listado, el detalle (["legajos", id]) y los datos derivados
      queryClient.invalidateQueries({ queryKey: ["legajos"] });
      queryClient.invalidateQueries({ queryKey: ["consulta-estado"] });
      queryClient.invalidateQueries({ queryKey: ["estadisticas-cohortes"] });
    },
  });
}
