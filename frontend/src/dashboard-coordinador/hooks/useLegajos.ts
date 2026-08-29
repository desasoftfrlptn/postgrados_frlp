import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api/client";
import type { FiltrosLegajo, Legajo, LegajosPaginados } from "@/shared/types/types";

function buildQueryString(filtros: FiltrosLegajo): string {
  const params = new URLSearchParams();
  if (filtros.estado) params.set("estado", filtros.estado);
  if (filtros.cohorte_id) params.set("cohorte_id", filtros.cohorte_id);
  if (filtros.tipo_carrera) params.set("tipo_carrera", filtros.tipo_carrera);
  if (filtros.solo_con_beca) params.set("solo_con_beca", "true");
  params.set("page", String(filtros.page ?? 1));
  params.set("limit", String(filtros.limit ?? 10));
  return params.toString();
}

export function useLegajos(filtros: FiltrosLegajo = {}) {
  return useQuery({
    queryKey: ["legajos", filtros],
    queryFn: () => api.get<LegajosPaginados>(`/legajos?${buildQueryString(filtros)}`),
    placeholderData: keepPreviousData,
  });
}

// Para el detalle de un legajo puntual (GET /api/v1/legajos/:id)
export function useLegajo(id: string) {
  return useQuery({
    queryKey: ["legajos", id],
    queryFn: () => api.get<Legajo>(`/legajos/${id}`),
    enabled: Boolean(id),
  });
}