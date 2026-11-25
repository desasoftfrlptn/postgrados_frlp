import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { seminariosApi, type CrearSeminarioRequest } from "@/shared/api/endpoints";

export function useSeminarios(nombre: string, page: number) {
  return useQuery({
    queryKey: ["seminarios", "listado", nombre, page],
    queryFn: ({ signal }) => seminariosApi.listar({ nombre, page, limit: 10 }, signal),
  });
}

export function useCrearSeminario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: CrearSeminarioRequest) => seminariosApi.crear(datos),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seminarios", "listado"] }),
  });
}

// La planilla identifica el seminario por nombre y contiene su nómina oficial.
export function useSeminario(id: string) {
  return useQuery({
    queryKey: ["seminarios", id, "estudiantes"],
    queryFn: ({ signal }) => seminariosApi.estudiantes(id, signal),
  });
}