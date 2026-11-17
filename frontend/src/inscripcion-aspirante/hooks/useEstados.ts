import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accesosApi, documentosApi, periodosApi } from "@/shared/api/endpoints";
import type { ConsultaLegajoResponse, TipoDocumento } from "@/shared/types/types";

/**
 * Estado de inscripción del aspirante. Ya no recibe DNI/email: el aspirante entra con un enlace
 * SEGUIMIENTO (cookie) y GET /accesos/legajo devuelve su legajo. Requiere RequireAcceso.
 * Errores: 401 enlace vencido, 403 enlace de otro tipo, 429 demasiados intentos.
 */
export function useConsultaEstado() {
  return useQuery({
    queryKey: ["consulta-estado"],
    queryFn: async (): Promise<ConsultaLegajoResponse> => {
      const legajo = await accesosApi.legajo();
      const documentos = await documentosApi.listar(legajo.id, { auth: false });
      return {
        id: legajo.id,
        numero_legajo: legajo.numero_legajo,
        nombre: legajo.nombre,
        apellido: legajo.apellido,
        estado: legajo.estado,
        solicita_beca: legajo.solicita_beca,
        documentos,
      };
    },
    retry: false,
  });
}

// Refrescar el legajo tras una carga; no inferir cambios de estado ni revisión.
export function useAdjuntarDocumento(legajoId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, tipo }: { file: File; tipo: TipoDocumento }) => {
      if (!legajoId) throw new Error("Todavía no se cargó el legajo.");
      return documentosApi.subir(legajoId, file, tipo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consulta-estado"] });
      queryClient.invalidateQueries({ queryKey: ["documentos", legajoId] });
    },
  });
}

// Consulta el período de la cohorte autorizada por el enlace, no otra cohorte.
export function useEstadoInscripcionVigente(cohorteId?: string) {
  return useQuery({
    queryKey: ["periodo-vigente", cohorteId],
    queryFn: () => periodosApi.vigente(cohorteId),
    enabled: Boolean(cohorteId),
  });
}
