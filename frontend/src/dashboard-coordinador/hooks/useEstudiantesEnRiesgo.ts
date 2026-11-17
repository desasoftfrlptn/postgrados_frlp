import { useQuery } from "@tanstack/react-query";
import { riesgoApi, type EstudianteRiesgoApi } from "@/shared/api/endpoints";

export type EstadoSemaforo = "rojo" | "amarillo" | "verde";

export interface EstudianteRiesgo {
  id: string;
  nombre: string;
  carrera: string;
  fechaInscripcion: string | null;
  seminariosAdeudados: number | null;
  diasSinAvance: number | null;
  estado: EstadoSemaforo;
}

export function desdeApiRiesgo(e: EstudianteRiesgoApi): EstudianteRiesgo {
  return {
    id: e.id,
    nombre: `${e.apellido}, ${e.nombre}`,
    carrera: e.carrera_elegida,
    fechaInscripcion: e.fecha_inscripcion?.slice(0, 10) ?? null,
    seminariosAdeudados: null,
    diasSinAvance: null,
    estado: "rojo",
  };
}

export function useEstudiantesEnRiesgo() {
  const query = useQuery({
    queryKey: ["dashboard-coordinador", "estudiantes-en-riesgo"],
    queryFn: ({ signal }) => riesgoApi.listarTodos(signal),
    select: (data) => data.map(desdeApiRiesgo),
  });
  return {
    estudiantes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.isError ? query.error.message : null,
  };
}
