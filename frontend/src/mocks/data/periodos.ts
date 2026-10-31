/**
 * src/mocks/data/periodos.ts
 *
 * fecha_abre / fecha_cierra son strings "YYYY-MM-DD" (fecha simple, sin
 * hora) — coincide con lo que devuelve un <input type="date"> nativo,
 * así el formulario del modal no necesita conversión.
 */

import type { PeriodoInscripcion } from "@/shared/types/types";
import { estaAbierto } from "@/shared/hooks/usePeriodos";

const COHORTE_2026 = "c1a2b3c4-0001-0000-0000-000000000003";

export const periodosFixture: PeriodoInscripcion[] = [
  {
    id: "periodo-001",
    cohorte_id: COHORTE_2026,
    fecha_abre: "2026-09-20",
    fecha_cierra: "2026-10-31",
  },
];

export const periodosState: PeriodoInscripcion[] = [...periodosFixture];

export function getPeriodosPorCohorte(cohorteId: string): PeriodoInscripcion[] {
  return periodosState
    .filter((p) => p.cohorte_id === cohorteId)
    .sort((a, b) => b.fecha_abre.localeCompare(a.fecha_abre)); // más reciente primero
}

export function crearPeriodo(
  cohorteId: string,
  datos: { fecha_abre: string; fecha_cierra: string | null }
): PeriodoInscripcion {
  const nuevo: PeriodoInscripcion = {
    id: `periodo-${Date.now()}`,
    cohorte_id: cohorteId,
    fecha_abre: datos.fecha_abre,
    fecha_cierra: datos.fecha_cierra,
  };
  periodosState.push(nuevo);
  return nuevo;
}

export function actualizarPeriodo(
  id: string,
  cambios: Partial<PeriodoInscripcion>
): PeriodoInscripcion | null {
  const index = periodosState.findIndex((p) => p.id === id);
  if (index === -1) return null;
  periodosState[index] = { ...periodosState[index], ...cambios };
  return periodosState[index];
}

export interface PeriodoVigente {
  abierto: boolean;
  periodo: PeriodoInscripcion | null;
  cohorte_id: string | null;
}
 
/**
 * Busca, entre TODOS los períodos de TODAS las cohortes, el que está
 * abierto ahora mismo. Si no hay ninguno abierto, devuelve igual el más
 * reciente (por fecha_abre) para poder mostrar "cerró el DD/MM" en vez
 * de un mensaje genérico sin fecha.
 */
export function getPeriodoVigente(): PeriodoVigente {
  const abiertoAhora = periodosState.find(estaAbierto);
  if (abiertoAhora) {
    return { abierto: true, periodo: abiertoAhora, cohorte_id: abiertoAhora.cohorte_id };
  }
 
  const masReciente = [...periodosState].sort((a, b) => b.fecha_abre.localeCompare(a.fecha_abre))[0];
  return {
    abierto: false,
    periodo: masReciente ?? null,
    cohorte_id: masReciente?.cohorte_id ?? null,
  };
}
 