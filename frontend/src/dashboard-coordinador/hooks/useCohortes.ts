import { useQuery } from "@tanstack/react-query";
import { cohortesApi } from "@/shared/api/endpoints";
import type { TipoCarrera } from "@/shared/types/types";

// PENDIENTE (backend): /cohortes y /estadisticas/cohortes todavía no tienen router.

// Todos los cohortes
export function useCohortes() {
  return useQuery({
    queryKey: ["cohortes"],
    queryFn: cohortesApi.listar,
  });
}

// Un solo cohorte con id
export function useCohorte(id: string) {
  return useQuery({
    queryKey: ["cohortes", id],
    queryFn: () => cohortesApi.detalle(id),
    enabled: Boolean(id),
  });
}

// Ultimas 3 cohortes para las estadisticas
export function useEstadisticasCohortes(tipoCarrera?: TipoCarrera) {
  return useQuery({
    queryKey: ["estadisticas-cohortes", tipoCarrera],
    queryFn: () => cohortesApi.estadisticas(tipoCarrera),
  });
}
