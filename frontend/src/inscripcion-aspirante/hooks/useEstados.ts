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
      // PENDIENTE (backend): GET /legajos/:id/documentos. Si más adelante /accesos/legajo ya
      // incluye los documentos, esta segunda llamada se elimina acá sin tocar el componente.
      const documentos = await documentosApi.listar(legajo.id);
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

// Subir un documento reabre el legajo en el backend (el estado cambia solo): por eso se refresca la consulta.
export function useAdjuntarDocumento(legajoId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, tipo }: { file: File; tipo: TipoDocumento }) => {
      if (!legajoId) throw new Error("Todavía no se cargó el legajo.");
      return documentosApi.subir(legajoId, file, tipo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consulta-estado"] });
    },
  });
}

// PENDIENTE (backend): GET /periodos/vigente
export function useEstadoInscripcionVigente() {
  return useQuery({
    queryKey: ["periodo-vigente"],
    queryFn: periodosApi.vigente,
  });
}
