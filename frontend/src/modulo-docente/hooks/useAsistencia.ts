import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Legajo, Clase } from "../../shared/types/types.ts";

const base = (seminarioId: string) => `/api/v1/seminarios/${seminarioId}`;

export function useAlumnosSeminario(seminarioId: string) {
  return useQuery({
    queryKey: ["seminarios", seminarioId, "alumnos"],
    queryFn: async (): Promise<Legajo[]> => {
      const res = await fetch(`${base(seminarioId)}/alumnos`);
      if (!res.ok) throw new Error("No se pudieron cargar los alumnos.");
      return res.json();
    },
  });
}

export function useClasesSeminario(seminarioId: string) {
  return useQuery({
    queryKey: ["seminarios", seminarioId, "clases"],
    queryFn: async (): Promise<Clase[]> => {
      const res = await fetch(`${base(seminarioId)}/clases`);
      if (!res.ok) throw new Error("No se pudieron cargar las clases.");
      return res.json();
    },
  });
}

export function useCrearClase(seminarioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fecha: string): Promise<Clase> => {
      const res = await fetch(`${base(seminarioId)}/clases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha }),
      });
      if (!res.ok) throw new Error("No se pudo crear la clase.");
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["seminarios", seminarioId, "clases"] }),
  });
}

export function useActualizarAsistencia(seminarioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      claseId: string;
      legajoId: string;
      presente: boolean;
    }): Promise<Clase> => {
      const res = await fetch(`${base(seminarioId)}/asistencias`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("No se pudo guardar la asistencia.");
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["seminarios", seminarioId, "clases"] }),
  });
}