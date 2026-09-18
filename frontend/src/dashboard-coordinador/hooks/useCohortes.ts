import { useQuery } from "@tanstack/react-query"; 
import { api } from "@/shared/api/client";
import type { Cohorte } from "@/shared/types/types";

// Todos los cohortes
export function useCohortes() {
    return useQuery({
        queryKey: ["cohortes"],
        queryFn: () => api.get<Cohorte[]>(`/cohortes`)
    })
};

// Un solo cohorte con id
export function useCohorte(id: string) {
    return useQuery({
        queryKey: ["cohortes", id],
        queryFn: () => api.get<Cohorte>(`/cohortes/${id}`),
        enabled: Boolean(id)
    })
};