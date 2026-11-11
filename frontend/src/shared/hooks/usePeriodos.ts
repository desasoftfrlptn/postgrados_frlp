import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; 
import { api } from "@/shared/api/client";
import type { PeriodoInscripcion } from "@/shared/types/types";

export function usePeriodosInscripcion(cohorteId: string) {
  return useQuery({
    queryKey: ["periodos", cohorteId],
    queryFn: () => api.get<PeriodoInscripcion[]>(`/cohortes/${cohorteId}/periodos`),
    enabled: Boolean(cohorteId),
  });
}
 
export function useCrearPeriodo(cohorteId: string) {
  const queryClient = useQueryClient();
 
  return useMutation({
    mutationFn: (datos: { fecha_abre: string; fecha_cierra: string | null }) =>
      api.post<PeriodoInscripcion>(`/cohortes/${cohorteId}/periodos`, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodos", cohorteId] });
    },
  });
}
 
export function useCerrarPeriodo(cohorteId: string) {
  const queryClient = useQueryClient();
 
  return useMutation({
    mutationFn: (periodoId: string) =>
      api.patch<PeriodoInscripcion>(`/periodos/${periodoId}`, {
        fecha_cierra: new Date().toISOString().slice(0, 10), // hoy, formato YYYY-MM-DD
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodos", cohorteId] });
    },
  });
}

export function formatFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

export function estaAbierto(periodo: PeriodoInscripcion): boolean {
  const hoy = new Date().toISOString().slice(0, 10);
  const despuesDeAbrir = periodo.fecha_abre <= hoy;
  const antesDeCerrar = periodo.fecha_cierra === null || periodo.fecha_cierra >= hoy;
  return despuesDeAbrir && antesDeCerrar;
}