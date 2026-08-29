import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api/client";
import type { Documento } from "@/shared/types/types";

export function useDocumentos(id: string) {
    return useQuery({
        queryKey: ["documentos", id],
        queryFn: () => api.get<Documento[]>(`/legajos/${id}/documentos`),
    })
}