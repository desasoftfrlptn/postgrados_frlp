import { useQuery } from "@tanstack/react-query";

/**
 * US-C-003 — Dashboard de estudiantes en riesgo
 *
 * Hook de datos para el listado de estudiantes en riesgo académico.
 */

export type EstadoSemaforo = "rojo" | "amarillo" | "verde";

export interface EstudianteRiesgo {
  id: string;
  nombre: string;
  carrera: string;
  /** ISO 8601, ej. "2024-03-15" */
  fechaInscripcion: string;
  seminariosAdeudados: number;
  diasSinAvance: number;
  estado: EstadoSemaforo;
}

// ---------------------------------------------------------------------------
// Mock con estudiantes en estado ROJO, AMARILLO y VERDE para simulación completa
// ---------------------------------------------------------------------------

const ESTUDIANTES_MOCK: EstudianteRiesgo[] = [
  {
    id: "1",
    nombre: "Marcos Ibáñez",
    carrera: "Especialización en Ingeniería en Sistemas",
    fechaInscripcion: "2023-08-10",
    seminariosAdeudados: 4,
    diasSinAvance: 96,
    estado: "rojo",
  },
  {
    id: "2",
    nombre: "Rocío Paredes",
    carrera: "Maestría en Gestión Industrial",
    fechaInscripcion: "2024-02-01",
    seminariosAdeudados: 3,
    diasSinAvance: 61,
    estado: "rojo",
  },
  {
    id: "3",
    nombre: "Federico Suárez",
    carrera: "Especialización en Ingeniería en Sistemas",
    fechaInscripcion: "2023-11-20",
    seminariosAdeudados: 2,
    diasSinAvance: 25,
    estado: "amarillo",
  },
  {
    id: "4",
    nombre: "Lucía Fernández",
    carrera: "Doctorado en Ingeniería",
    fechaInscripcion: "2024-04-05",
    seminariosAdeudados: 1,
    diasSinAvance: 50,
    estado: "amarillo",
  },
  {
    id: "5",
    nombre: "Nicolás Torres",
    carrera: "Maestría en Gestión Industrial",
    fechaInscripcion: "2023-06-15",
    seminariosAdeudados: 0,
    diasSinAvance: 3,
    estado: "verde",
  },
];

function fetchEstudiantesMock(): Promise<EstudianteRiesgo[]> {
  return new Promise((resolve) => setTimeout(() => resolve(ESTUDIANTES_MOCK), 200));
}

export function useEstudiantesEnRiesgo() {
  const query = useQuery({
    queryKey: ["dashboard-coordinador", "estudiantes"],
    queryFn: fetchEstudiantesMock,
  });

  return {
    estudiantes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.isError ? "No se pudo conectar con el servidor" : null,
  };
}
