import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { seminariosApi } from "@/shared/api/endpoints";
import { fromApiPaginaSeminarios } from "@/shared/api/mappers";
import type { FiltrosSeminario } from "@/shared/types/types";

// PENDIENTE (backend): /seminarios todavía no tiene router (solo el modelo ORM).
export function useSeminarios(filtros: FiltrosSeminario = {}) {
  return useQuery({
    queryKey: ["seminarios", filtros],
    queryFn: async () => fromApiPaginaSeminarios(await seminariosApi.listar(filtros)),
    placeholderData: keepPreviousData,
  });
}

export function useSeminario(id: string) {
  return useQuery({
    queryKey: ["seminarios", id],
    queryFn: () => seminariosApi.detalle(id),
    enabled: Boolean(id),
  });
}
