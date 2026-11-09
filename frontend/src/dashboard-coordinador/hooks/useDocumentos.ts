import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api/client";
import type { DocumentoConEstado } from "@/shared/types/types";

export function useDocumentos(id: string) {
    return useQuery({
        queryKey: ["documentos", id],
        queryFn: () => api.get<DocumentoConEstado[]>(`/legajos/${id}/documentos`),
    })
}

interface ObservarDocumentoPayload {
  legajoId: string;
  docId: string;
  accion: "OBSERVAR" | "MARCAR_FALTANTE";
  motivo: string;
}

export function useObservarDocumento() {
  const queryClient = useQueryClient();
 
  return useMutation({
    mutationFn: ({ legajoId, docId, accion, motivo }: ObservarDocumentoPayload) =>
      api.patch(`/legajos/${legajoId}/documentos/${docId}`, { accion, motivo }),
    onSuccess: (_data, variables) => {
      // Refresca la lista de documentos de ESE legajo puntual.
      queryClient.invalidateQueries({ queryKey: ["documentos", variables.legajoId] });
    },
  });
}