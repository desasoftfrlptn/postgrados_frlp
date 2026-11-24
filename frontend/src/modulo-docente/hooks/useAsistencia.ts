import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { seminariosApi, type AsistenciaUpdate } from "@/shared/api/endpoints";

export function useClasesSeminario(id: string) {
  return useQuery({
    queryKey: ["seminarios", id, "clases"],
    queryFn: ({ signal }) => seminariosApi.clases(id, signal),
  });
}

export function useCrearClase(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fecha: string) => seminariosApi.crearClase(id, fecha),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seminarios", id] }),
  });
}

export function useConfirmarClase(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claseId, dictada }: { claseId: string; dictada: boolean }) =>
      seminariosApi.confirmarClase(id, claseId, dictada),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seminarios", id] }),
  });
}

export function useActualizarAsistencia(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: AsistenciaUpdate) => seminariosApi.actualizarAsistencia(id, datos),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seminarios", id] }),
  });
}