import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api/client";
import type { ConsultaLegajoResponse, TipoDocumento } from "@/shared/types/types";
 
interface ConsultaParams {
  dni: string;
  email: string;
}
 
export function useConsultaEstado(params: ConsultaParams, habilitado: boolean) {
  return useQuery({
    queryKey: ["consulta-estado", params],
    queryFn: () =>
      api.get<ConsultaLegajoResponse>(
        `/legajos/consulta?dni=${encodeURIComponent(params.dni)}&email=${encodeURIComponent(params.email)}`,
        { auth: false }
      ),
    enabled: habilitado,
    retry: false, // si el DNI/email no matchean, no tiene sentido reintentar
  });
}
 
export function useAdjuntarDocumento(legajoId: string | undefined) {
  const queryClient = useQueryClient();
 
  return useMutation({
    mutationFn: ({ file, tipo }: { file: File; tipo: TipoDocumento }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tipo", tipo);
      return api.post(`/legajos/${legajoId}/documentos`, formData, { auth: false });
    },
    onSuccess: () => {
      // Refresca la consulta para que el documento recién subido aparezca
      queryClient.invalidateQueries({ queryKey: ["consulta-estado"] });
    },
  });
}

interface PeriodoVigente {
  abierto: boolean;
  periodo: { fecha_abre: string; fecha_cierra: string | null } | null;
  cohorte_id: string | null;
}
 
export function useEstadoInscripcionVigente() {
  return useQuery({
    queryKey: ["periodo-vigente"],
    queryFn: () => api.get<PeriodoVigente>("/periodos/vigente", { auth: false }),
  });
}