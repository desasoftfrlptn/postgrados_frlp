import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Spinner } from "@/shared/components/Spinner";
import { useEstadisticasCohortes } from "../hooks/useCohortes";
import type { TipoCarrera } from "@/shared/types/types";
 
const FILTROS_CARRERA: { value: TipoCarrera | ""; label: string }[] = [
  { value: "", label: "Todas las carreras" },
  { value: "Especializacion", label: "Especialización" },
  { value: "Maestria", label: "Maestría" },
  { value: "Doctorado", label: "Doctorado" },
];
 
const TARJETAS: {
  key: "total_inscriptos" | "activos" | "graduados" | "en_riesgo" | "dados_de_baja";
  label: string;
  claseColor: string;
}[] = [
  { key: "total_inscriptos", label: "Total inscriptos", claseColor: "text-brand-700 dark:text-brand-300" },
  { key: "activos", label: "Activos", claseColor: "text-semaforo-verde" },
  { key: "graduados", label: "Graduados", claseColor: "text-brand-700 dark:text-brand-300" },
  { key: "en_riesgo", label: "En riesgo", claseColor: "text-semaforo-rojo" },
  { key: "dados_de_baja", label: "Dados de baja", claseColor: "text-ink-muted" },
];
 
export function Estadisticas() {
  const [tipoCarrera, setTipoCarrera] = useState<TipoCarrera | "">("");
 
  const { data: estadisticas, isLoading, isError, error } = useEstadisticasCohortes(
    tipoCarrera || undefined
  );
 
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Estadísticas de cohorte</h1>
 
        <select
          value={tipoCarrera}
          onChange={(e) => setTipoCarrera(e.target.value as TipoCarrera | "")}
          className="w-56"
        >
          {FILTROS_CARRERA.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
 
      {isLoading && (
        <div className="flex items-center gap-2 p-6 text-ink-secondary">
          <Spinner size="sm" /> Cargando estadísticas…
        </div>
      )}
 
      {isError && (
        <p role="alert" className="p-6 text-sm text-semaforo-rojo">
          No se pudieron cargar las estadísticas: {(error as Error).message}
        </p>
      )}
 
      {!isLoading && !isError && estadisticas && (
        <>
          {estadisticas.length === 0 ? (
            <p className="rounded-xl bg-paper-elevated p-6 text-center text-sm text-ink-secondary">
              No hay datos para este filtro.
            </p>
          ) : (
            <>
              {/* Métricas de la cohorte más reciente */}
              <div>
                <h2 className="mb-3 text-sm font-semibold text-ink">
                  {estadisticas[0].cohorte_nombre} (más reciente)
                </h2>
                <div className="grid grid-cols-5 gap-3">
                  {TARJETAS.map((t) => (
                    <div key={t.key} className="rounded-xl border border-line bg-paper-surface p-4">
                      <p className={`text-2xl font-bold ${t.claseColor}`}>{estadisticas[0][t.key]}</p>
                      <p className="text-xs text-ink-secondary">{t.label}</p>
                    </div>
                  ))}
                </div>
              </div>
 
              {/* Comparativo entre las últimas 3 cohortes */}
              <div className="rounded-xl border border-line bg-paper-surface p-5">
                <h2 className="mb-4 text-sm font-semibold text-ink">
                  Comparativo entre cohortes (últimas {estadisticas.length})
                </h2>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...estadisticas].reverse()}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-line" />
                      <XAxis dataKey="cohorte_nombre" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total_inscriptos" name="Inscriptos" fill="#2f62e0" />
                      <Bar dataKey="activos" name="Activos" fill="#16a34a" />
                      <Bar dataKey="graduados" name="Graduados" fill="#1b3b8f" />
                      <Bar dataKey="en_riesgo" name="En riesgo" fill="#dc2626" />
                      <Bar dataKey="dados_de_baja" name="Dados de baja" fill="#94a3b8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}