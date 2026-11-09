import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api/client";
import type { Seminario, FiltrosSeminario, SeminariosPaginados } from "@/shared/types/types";

function buildQueryString(filtros: FiltrosSeminario): string {
  const params = new URLSearchParams();
  if (filtros.nombre) params.set("nombre", filtros.nombre);
  if (filtros.docente) params.set("docente", filtros.docente);
  if (filtros.es_obligatorio !== undefined) params.set("es_obligatorio", String(filtros.es_obligatorio));
  if (filtros.horas_catedra) params.set("horas_catedra", filtros.horas_catedra);
  params.set("page", String(filtros.page ?? 1));
  params.set("limit", String(filtros.limit ?? 10));
  return params.toString();
}

export function useSeminarios(filtros: FiltrosSeminario = {}) {
  return useQuery({
    queryKey: ["seminarios", filtros],
    queryFn: () => api.get<SeminariosPaginados>(`/seminarios?${buildQueryString(filtros)}`),
    placeholderData: keepPreviousData,
  });
}

export function useSeminario(id: string) {
  return useQuery({
    queryKey: ["seminarios", id],
    queryFn: () => api.get<Seminario>(`/seminarios/${id}`),
    enabled: Boolean(id),
  });
}