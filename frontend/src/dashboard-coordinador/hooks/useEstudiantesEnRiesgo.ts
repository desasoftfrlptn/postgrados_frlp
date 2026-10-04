import { useQuery } from "@tanstack/react-query";

/**
 * US-C-003 — Dashboard de estudiantes en riesgo
 *
 * Hook de datos para el listado de estudiantes en riesgo académico.
 * Por ahora devuelve datos mock (no hay endpoint real todavía).
 * Cuando exista, reemplazar `fetchEstudiantesMock` por una llamada
 * real usando el cliente de `@/shared/api`, por ejemplo:
 *
 *   import { api } from "@/shared/api/client";
 *   const fetchEstudiantes = () =>
 *     api.get<EstudianteRiesgo[]>("/coordinador/estudiantes").then((r) => r.data);
 *
 * y usarla en el queryFn de abajo. El resto del componente no cambia:
 * el filtro por estado "rojo" y el orden por criticidad quedan en
 * EstudiantesEnRiesgo.tsx, no acá, para que este hook siga sirviendo
 * si más adelante se necesita el listado completo (no solo rojo) en
 * otra pantalla.
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
// Mock — reemplazar por el fetch real cuando exista el endpoint
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
    seminariosAdeudados: 2,
    diasSinAvance: 61,
    estado: "rojo",
  },
  {
    id: "3",
    nombre: "Federico Suárez",
    carrera: "Especialización en Ingeniería en Sistemas",
    fechaInscripcion: "2023-11-20",
    seminariosAdeudados: 3,
    diasSinAvance: 45,
    estado: "rojo",
  },
  {
    id: "4",
    nombre: "Lucía Fernández",
    carrera: "Doctorado en Ingeniería",
    fechaInscripcion: "2024-04-05",
    seminariosAdeudados: 1,
    diasSinAvance: 12,
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
  // Simula latencia de red para que el estado de carga sea visible.
  return new Promise((resolve) => setTimeout(() => resolve(ESTUDIANTES_MOCK), 400));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

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
