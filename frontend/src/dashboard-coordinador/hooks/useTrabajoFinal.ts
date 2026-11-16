import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/api/client";
import { trabajoFinalApi } from "@/shared/api/endpoints";
import type { CrearTrabajoFinalRequest } from "@/shared/types/types";

// PENDIENTE (backend): /legajos/:id/trabajo-final todavía no tiene router.
// Devuelve null (no un error) cuando el legajo aún no tiene trabajo final.
export function useTrabajoFinal(legajoId: string) {
  return useQuery({
    queryKey: ["trabajo-final", legajoId],
    queryFn: () => trabajoFinalApi.obtener(legajoId),
    enabled: Boolean(legajoId),
  });
}

export function useCrearTrabajoFinal(legajoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (datos: CrearTrabajoFinalRequest) => trabajoFinalApi.crear(legajoId, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trabajo-final", legajoId] });
    },
  });
}

// Se mantiene la re-exportación por compatibilidad; los componentes nuevos usan isApiError de client.ts
// (error.isForbidden, error.isNotFound, ...).
export { ApiError };
