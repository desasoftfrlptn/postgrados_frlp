import { useQuery } from "@tanstack/react-query";
import { seminariosApi } from "@/shared/api/endpoints";

// La planilla identifica el seminario por nombre y contiene su nómina oficial.
export function useSeminario(id: string) {
  return useQuery({
    queryKey: ["seminarios", id, "estudiantes"],
    queryFn: ({ signal }) => seminariosApi.estudiantes(id, signal),
  });
}