import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/shared/api/client";
import type { CrearTrabajoFinalRequest, TrabajoFinal } from "@/shared/types/types";

export function useTrabajoFinal(legajoId: string) {
  return useQuery({
    queryKey: ["trabajo-final", legajoId],
    queryFn: () => api.get<TrabajoFinal | null>(`/legajos/${legajoId}/trabajo-final`),
    enabled: Boolean(legajoId),
  });
}
 
export function useCrearTrabajoFinal(legajoId: string) {
  const queryClient = useQueryClient();
 
  return useMutation({
    mutationFn: (datos: CrearTrabajoFinalRequest) =>
      api.post<TrabajoFinal>(`/legajos/${legajoId}/trabajo-final`, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trabajo-final", legajoId] });
    },
  });
}
 
// Re-exporta ApiError acá para poder chequear error.statusCode === 403 sin importar directamente de client.ts
export { ApiError };
 