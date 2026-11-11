import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { legajosApi } from "@/shared/api/endpoints";
import { saveBlob } from "@/shared/api/files";
import {
  fromApiLegajo,
  fromApiPagina,
  toLegajoFiltros,
  toListarLegajosParams,
  type FiltrosLegajoCompat,
} from "@/shared/api/mappers";

// Listado paginado (GET /legajos). Solo coordinador.
// Acepta los FiltrosLegajo de siempre (incluido `solo_con_beca`) y además `dni` y `apellido`.
export function useLegajos(filtros: FiltrosLegajoCompat = {}) {
  return useQuery({
    queryKey: ["legajos", filtros],
    queryFn: async () => fromApiPagina(await legajosApi.listar(toListarLegajosParams(filtros))),
    placeholderData: keepPreviousData,
  });
}

// Detalle de un legajo puntual (GET /legajos/:id)
export function useLegajo(id: string) {
  return useQuery({
    queryKey: ["legajos", id],
    queryFn: async () => fromApiLegajo(await legajosApi.detalle(id)),
    enabled: Boolean(id),
  });
}

// NUEVO: legajos del usuario logueado (estudiante), uno por carrera.
// PENDIENTE (backend): GET /legajos/mios (ver legajosApi.mios).
export function useMisLegajos() {
  return useQuery({
    queryKey: ["legajos", "mios"],
    queryFn: async () => (await legajosApi.mios()).map(fromApiLegajo),
  });
}

// NUEVO: exporta a Excel los legajos que coinciden con los filtros (GET /legajos/exportar).
// El backend exporta hasta 500 legajos con los mismos filtros del listado (sin paginar).
// Uso: exportar.mutate({ filtros, nombreArchivo: "inscriptos-2026.xlsx" })
export function useExportarLegajos() {
  return useMutation({
    mutationFn: async ({
      filtros = {},
      nombreArchivo,
    }: { filtros?: FiltrosLegajoCompat; nombreArchivo?: string } = {}) => {
      const { blob, filename } = await legajosApi.exportar(toLegajoFiltros(filtros));
      saveBlob(blob, nombreArchivo ?? filename ?? "legajos.xlsx");
    },
  });
}
