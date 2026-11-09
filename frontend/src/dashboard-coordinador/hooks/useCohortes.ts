import { useQuery } from "@tanstack/react-query"; 
import { api } from "@/shared/api/client";
import type { Cohorte, EstadisticasCohorte, TipoCarrera } from "@/shared/types/types";

// Todos los cohortes
export function useCohortes() {
    return useQuery({
        queryKey: ["cohortes"],
        queryFn: () => api.get<Cohorte[]>(`/cohortes`)
    })
};

// Un solo cohorte con id
export function useCohorte(id: string) {
    return useQuery({
        queryKey: ["cohortes", id],
        queryFn: () => api.get<Cohorte>(`/cohortes/${id}`),
        enabled: Boolean(id)
    })
};

// Ultimas 3 cohortes para las estadisticas
export function useEstadisticasCohortes(tipoCarrera?: TipoCarrera) {
  return useQuery({
    queryKey: ["estadisticas-cohortes", tipoCarrera],
    queryFn: () => {
      const params = tipoCarrera ? `?tipo_carrera=${tipoCarrera}` : "";
      return api.get<EstadisticasCohorte[]>(`/estadisticas/cohortes${params}`);
    },
  });
}