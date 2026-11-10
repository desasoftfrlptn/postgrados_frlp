import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { EstadoLegajo, Legajo } from "../types/types";
import { api } from "../api/client";

// Patch del estado de un legajo (PATCH /api/v1/legajos/:id)
interface propsPatch {
  id: string,
  estado: EstadoLegajo,
}
export function useActualizarEstado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, estado }: propsPatch) =>
      api.patch<Legajo>(`/legajos/${id}/estado`, { estado }),

    onSuccess: (legajoActualizado, { id }) => {
      queryClient.setQueryData(["legajos", id], legajoActualizado);

      queryClient.invalidateQueries({
        queryKey: ["legajos"],
        exact: false,
        predicate: (query) => typeof query.queryKey[1] === "object",
      });
    },
  });
}