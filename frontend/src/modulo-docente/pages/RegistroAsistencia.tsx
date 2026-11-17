import { useState, useMemo } from "react";
import { TablaAsistencia } from "../components/TablaAsistencia";
import type { PorcentajeAsistencia } from "../../shared/types/types.ts";
import { calcularPorcentaje } from "../../shared/types/types.ts";
import {
  useAlumnosSeminario,
  useClasesSeminario,
  useCrearClase,
  useActualizarAsistencia,
} from "../hooks/useAsistencia";

// TODO: reemplazar por el seminario real seleccionado (contexto, ruta, o prop)
const SEMINARIO_ID = "seminario-demo";

export function RegistroAsistencia() {
  const [error, setError] = useState<string | null>(null);

  const { data: alumnos = [], isLoading: loadingAlumnos } = useAlumnosSeminario(SEMINARIO_ID);
  const { data: clases = [], isLoading: loadingClases } = useClasesSeminario(SEMINARIO_ID);
  const crearClaseMutation = useCrearClase(SEMINARIO_ID);
  const asistenciaMutation = useActualizarAsistencia(SEMINARIO_ID);

  const handleNuevaClase = () => {
    const hoy = new Date().toISOString().slice(0, 10);
    setError(null);
    crearClaseMutation.mutate(hoy, {
      onError: () => setError("No se pudo crear la clase. Intentá nuevamente."),
    });
  };

  const handleToggleAsistencia = (
    claseId: string,
    legajoId: string,
    presenteActual: boolean
  ) => {
    setError(null);
    asistenciaMutation.mutate(
      { claseId, legajoId, presente: !presenteActual },
      { onError: () => setError("No se pudo guardar el cambio. Intentá nuevamente.") }
    );
  };

  // Calcula el porcentaje de cada alumno en tiempo real:
  // (clases presente / total clases dictadas) * 100
  const porcentajes: PorcentajeAsistencia[] = useMemo(() => {
    const totalClases = clases.length;
    return alumnos.map((legajo) => {
      const clasesPresente = clases.filter((clase) =>
        clase.asistencias.some((a) => a.legajoId === legajo.id && a.presente)
      ).length;
      return {
        legajoId: legajo.id,
        clasesPresente,
        totalClases,
        porcentaje: calcularPorcentaje(clasesPresente, totalClases),
      };
    });
  }, [alumnos, clases]);

  if (loadingAlumnos || loadingClases) {
    return (
      <div className="px-5 py-10 text-center text-sm text-ink-muted">
        Cargando...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-5 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-ink">Registro de asistencia</h1>
        <button
          type="button"
          onClick={handleNuevaClase}
          disabled={crearClaseMutation.isPending}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
        >
          {crearClaseMutation.isPending ? "Creando..." : "+ Nueva clase"}
        </button>
      </div>

      {error && (
        <p className="text-sm font-medium text-semaforo-rojo">{error}</p>
      )}

      <TablaAsistencia
        alumnos={alumnos}
        clases={clases}
        porcentajes={porcentajes}
        onToggleAsistencia={handleToggleAsistencia}
        disabled={asistenciaMutation.isPending}
      />
    </div>
  );
}

export default RegistroAsistencia;