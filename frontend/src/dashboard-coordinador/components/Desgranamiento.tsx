import { useState } from "react";
import { ArrowDownRight, Users, UserRoundX } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useDesgranamiento } from "../hooks/useCohortes";

const SEMESTRES = [1, 2, 3, 4, 5, 6];

const COLORES = ["#2563eb", "#8b5cf6", "#0f9f82"];

const tasaBaja = (bajas: number, inscriptos: number) =>
  inscriptos > 0 ? (bajas / inscriptos) * 100 : 0;

const formatoPorcentaje = (valor: number) =>
  `${valor.toLocaleString("es-AR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })}%`;

export function Desgranamiento() {
  const { data: cohortes = [], isLoading, isError, error } = useDesgranamiento();
  const [cohorteSeleccionada, setCohorteSeleccionada] = useState("");

  const cohorte =
    cohortes.find((item) => item.cohorte_id === cohorteSeleccionada) ??
    cohortes.find((item) => item.en_curso) ??
    cohortes[cohortes.length - 1];

  const datosGrafico = SEMESTRES.map((semestre, index) => ({
    semestre: `Semestre ${semestre}`,
    ...Object.fromEntries(
      cohortes.map((item) => [
        item.cohorte_id,
        item.bajas_por_semestre[index] === undefined
          ? null
          : tasaBaja(item.bajas_por_semestre[index], item.total_inscriptos),
      ]),
    ),
  }));

  if (isLoading) {
    return <p className="p-6 text-sm text-ink-secondary">Cargando datos de desgranamiento...</p>;
  }

  if (isError) {
    return (
      <p className="p-6 text-sm text-semaforo-rojo">
        No se pudieron cargar los datos: {error instanceof Error ? error.message : "Error desconocido"}
      </p>
    );
  }

  if (!cohortes.length || !cohorte) {
    return <p className="p-6 text-sm text-ink-secondary">No hay datos de desgranamiento disponibles.</p>;
  }

  const totalBajas = cohorte.bajas_por_semestre.reduce((total, bajas) => total + bajas, 0);
  const tasaTotal = tasaBaja(totalBajas, cohorte.total_inscriptos);
  const semestreConMasBajas = cohorte.bajas_por_semestre.reduce(
    (maximo, bajas, index, semestres) => (bajas > semestres[maximo] ? index : maximo),
    0,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Tasa de desgranamiento</h1>
        </div>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-secondary">
          Cohorte para el detalle
          <select
            aria-label="Cohorte para el detalle"
            value={cohorte.cohorte_id}
            onChange={(event) => setCohorteSeleccionada(event.target.value)}
            className="min-w-48 rounded-lg border border-line bg-paper-surface px-3 py-2.5 text-sm font-medium text-ink"
          >
            {cohortes.map((item) => (
              <option key={item.cohorte_id} value={item.cohorte_id}>
                {item.cohorte_nombre}{item.en_curso ? " · En curso" : ""}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section aria-label={`Resumen de ${cohorte.cohorte_nombre}`} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-line bg-paper-surface p-4">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-sm">Total inscriptos</span>
            <Users className="h-4 w-4 text-brand-600 dark:text-brand-300" />
          </div>
          <p className="mt-3 text-2xl font-bold text-ink">{cohorte.total_inscriptos}</p>
          <p className="mt-1 text-xs text-ink-muted">{cohorte.cohorte_nombre}</p>
        </article>
        <article className="rounded-xl border border-line bg-paper-surface p-4">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-sm">Estudiantes dados de baja</span>
            <UserRoundX className="h-4 w-4 text-semaforo-rojo" />
          </div>
          <p className="mt-3 text-2xl font-bold text-ink">{totalBajas}</p>
          <p className="mt-1 text-xs text-ink-muted">Acumulado registrado en la cohorte</p>
        </article>
        <article className="rounded-xl border border-line bg-paper-surface p-4">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-sm">Tasa de desgranamiento</span>
            <ArrowDownRight className="h-4 w-4 text-semaforo-rojo" />
          </div>
          <p className="mt-3 text-2xl font-bold text-semaforo-rojo">{formatoPorcentaje(tasaTotal)}</p>
        </article>
        <article className="rounded-xl border border-line bg-paper-surface p-4">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-sm">Semestre con más bajas</span>
            <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">PICO</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-ink">Semestre {semestreConMasBajas + 1}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {cohorte.bajas_por_semestre[semestreConMasBajas]} estudiantes dados de baja
          </p>
        </article>
      </section>

      <section className="rounded-xl border border-line bg-paper-surface p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-ink">Desgranamiento por semestre de cursada</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Bajas de cada semestre como porcentaje del total de inscriptos de la cohorte.
          </p>
        </div>
        <div className="h-72 w-full" role="img" aria-label="Gráfico de líneas con tasas de bajas por semestre para distintas cohortes">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={datosGrafico} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-line" />
              <XAxis dataKey="semestre" tick={{ fontSize: 12 }} tickMargin={8} />
              <YAxis
                allowDecimals
                domain={[0, "auto"]}
                tick={{ fontSize: 12 }}
                tickFormatter={(valor: number) => `${valor}%`}
                width={44}
              />
              <Tooltip
                formatter={(valor) =>
                  typeof valor === "number" ? [formatoPorcentaje(valor), "Tasa de bajas"] : [valor, "Tasa de bajas"]
                }
                labelStyle={{ color: "#172033", fontWeight: 600 }}
              />
              {cohortes.map((item, index) => (
                <Line
                  key={item.cohorte_id}
                  type="monotone"
                  dataKey={item.cohorte_id}
                  name={item.cohorte_nombre}
                  stroke={COLORES[index % COLORES.length]}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: COLORES[index % COLORES.length], strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4">
          {cohortes.map((item, index) => (
            <div key={item.cohorte_id} className="flex items-center gap-2 text-xs text-ink-secondary">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORES[index % COLORES.length] }} />
              {item.cohorte_nombre}{item.en_curso ? " (en curso)" : ""}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-paper-surface p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-ink">Detalle de {cohorte.cohorte_nombre}</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Distribución de las bajas registradas en cada semestre.
          </p>
        </div>
        <div className="space-y-4">
          {cohorte.bajas_por_semestre.map((bajas, index) => {
            const porcentaje = tasaBaja(bajas, cohorte.total_inscriptos);
            const anchoBarra = tasaTotal > 0 ? (porcentaje / tasaTotal) * 100 : 0;

            return (
              <div key={index} className="grid grid-cols-[5.5rem_1fr_5.5rem] items-center gap-3">
                <span className="text-sm text-ink-secondary">Semestre {index + 1}</span>
                <div
                  className="h-2.5 overflow-hidden rounded-full bg-paper-elevated"
                  role="progressbar"
                  aria-label={`Bajas del semestre ${index + 1}`}
                  aria-valuenow={bajas}
                  aria-valuemin={0}
                  aria-valuemax={totalBajas}
                >
                  <div
                    className="h-full rounded-full bg-brand-500 transition-[width]"
                    style={{ width: `${anchoBarra}%` }}
                  />
                </div>
                <span className="text-right text-sm font-medium text-ink">
                  {bajas} <span className="text-xs font-normal text-ink-muted">({formatoPorcentaje(porcentaje)})</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}