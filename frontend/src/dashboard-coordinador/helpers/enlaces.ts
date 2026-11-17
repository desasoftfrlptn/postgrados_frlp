import type { CrearEnlaceRequest, TipoEnlace } from "@/shared/api/endpoints";

interface DatosEnlace {
  tipo: TipoEnlace;
  cohorteId: string;
  periodoId: string;
  legajoId: string;
  duracionDias: number;
  usosMaximos: number | null;
}

export function prepararEnlace(datos: DatosEnlace): CrearEnlaceRequest {
  const { tipo, cohorteId, periodoId, legajoId, duracionDias, usosMaximos } = datos;
  if (!Number.isInteger(duracionDias) || duracionDias < 1 || duracionDias > 90) {
    throw new Error("La vigencia debe ser de entre 1 y 90 días.");
  }
  if (usosMaximos !== null && (!Number.isInteger(usosMaximos) || usosMaximos < 1 || usosMaximos > 10000)) {
    throw new Error("El límite de usos debe ser de entre 1 y 10000, o dejarse vacío.");
  }
  const opciones = { tipo, duracion_dias: duracionDias, usos_maximos: usosMaximos };
  if (tipo === "INSCRIPCION") {
    if (!cohorteId) throw new Error("Seleccioná una cohorte.");
    return { ...opciones, cohorte_id: cohorteId, periodo_id: periodoId || null };
  }
  if (!legajoId) throw new Error("Seleccioná el legajo al que dará acceso el enlace.");
  return { ...opciones, legajo_id: legajoId };
}
