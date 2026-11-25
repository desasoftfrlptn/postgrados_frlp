import { useQuery } from "@tanstack/react-query";
import { cohortesApi, type CohorteApi } from "@/shared/api/endpoints";
import type { Cohorte, TipoCarrera } from "@/shared/types/types";

export function desdeApiCohorte(cohorte: CohorteApi): Cohorte {
  return {
    id: cohorte.id, anio: cohorte.anio, nombre: cohorte.nombre,
    inscripcion_abierta: cohorte.abierta, fecha_inicio: cohorte.fecha_inicio,
  };
}

export function useCohortes() {
  return useQuery({
    queryKey: ["cohortes"],
    queryFn: cohortesApi.listar,
    select: (cohortes) => cohortes.map(desdeApiCohorte),
  });
}

export function useCohorte(id: string) {
  return useQuery({
    queryKey: ["cohortes", id],
    queryFn: () => cohortesApi.detalle(id),
    select: desdeApiCohorte,
    enabled: Boolean(id),
  });
}

export function useEstadisticasCohortes(tipoCarrera?: TipoCarrera) {
  return useQuery({
    queryKey: ["estadisticas-cohortes", tipoCarrera],
    queryFn: () => cohortesApi.estadisticas(tipoCarrera),
  });
}

export function useDesgranamiento() {
  return useQuery({
    queryKey: ["desgranamiento"],
    queryFn: cohortesApi.desgranamiento,
  });
}