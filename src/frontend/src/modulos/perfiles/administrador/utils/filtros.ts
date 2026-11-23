import type { EstadoFiltro } from "../componentes/FiltroEstado";

export function coincideEstado(
  activo: boolean,
  filtro: EstadoFiltro
): boolean {
  return filtro === "todos" ||
    activo === (filtro === "activos");
}
