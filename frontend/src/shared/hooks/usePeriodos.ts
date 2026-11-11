import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { periodosApi } from "@/shared/api/endpoints";
import type { PeriodoInscripcion } from "@/shared/types/types";

// PENDIENTE (backend): /cohortes/:id/periodos y /periodos/:id todavía no tienen router.

/**
 * Fecha de hoy en hora LOCAL (YYYY-MM-DD). toISOString() da la fecha UTC: en Argentina (UTC-3),
 * desde las 21 h ya sería "mañana", y un período se cerraría o figuraría abierto un día corrido.
 */
export function hoyLocal(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

export function usePeriodosInscripcion(cohorteId: string) {
  return useQuery({
    queryKey: ["periodos", cohorteId],
    queryFn: () => periodosApi.listar(cohorteId),
    enabled: Boolean(cohorteId),
  });
}

// Abrir o cerrar un período cambia el "período vigente" que ve el aspirante y el estado de la cohorte.
function useRefrescarPeriodos(cohorteId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["periodos", cohorteId] });
    queryClient.invalidateQueries({ queryKey: ["periodo-vigente"] });
    queryClient.invalidateQueries({ queryKey: ["cohortes"] });
  };
}

export function useCrearPeriodo(cohorteId: string) {
  const refrescar = useRefrescarPeriodos(cohorteId);

  return useMutation({
    mutationFn: (datos: { fecha_abre: string; fecha_cierra: string | null }) =>
      periodosApi.crear(cohorteId, datos),
    onSuccess: refrescar,
  });
}

export function useCerrarPeriodo(cohorteId: string) {
  const refrescar = useRefrescarPeriodos(cohorteId);

  return useMutation({
    mutationFn: (periodoId: string) =>
      periodosApi.actualizar(periodoId, { fecha_cierra: hoyLocal() }),
    onSuccess: refrescar,
  });
}

export function formatFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

export function estaAbierto(periodo: PeriodoInscripcion): boolean {
  const hoy = hoyLocal();
  const despuesDeAbrir = periodo.fecha_abre <= hoy;
  const antesDeCerrar = periodo.fecha_cierra === null || periodo.fecha_cierra >= hoy;
  return despuesDeAbrir && antesDeCerrar;
}
