import { useQuery } from "@tanstack/react-query";
import { seminariosApi } from "@/shared/api/endpoints";

export function useSeminarios(nombre: string, page: number) {
  return useQuery({
    queryKey: ["seminarios", "listado", nombre, page],
    queryFn: ({ signal }) => seminariosApi.listar({ nombre, page, limit: 10 }, signal),
  });
}

// La planilla identifica el seminario por nombre y contiene su nómina oficial.
export function useSeminario(id: string) {
  return useQuery({
    queryKey: ["seminarios", id, "estudiantes"],
    queryFn: ({ signal }) => seminariosApi.estudiantes(id, signal),
  });
}