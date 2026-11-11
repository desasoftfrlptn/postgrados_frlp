import { useState } from "react";
import { ArrowDownRight, GraduationCap, Users, UserRoundX } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const SEMESTRES = [1, 2, 3, 4, 5, 6];

const COHORTES = [
  {
    id: "2024",
    nombre: "Cohorte 2024",
    inscriptos: 84,
    bajasPorSemestre: [2, 4, 3, 5, 2, 1],
    color: "#2563eb",
    enCurso: false,
  },
  {
    id: "2025",
    nombre: "Cohorte 2025",
    inscriptos: 76,
    bajasPorSemestre: [3, 4, 5, 3, 2, 0],
    color: "#8b5cf6",
    enCurso: false,
  },
  {
    id: "2026",
    nombre: "Cohorte 2026",
    inscriptos: 68,
    bajasPorSemestre: [2, 3, 2, 1],
    color: "#0f9f82",
    enCurso: true,
  },
];

const tasaBaja = (bajas: number, inscriptos: number) =>
  inscriptos > 0 ? (bajas / inscriptos) * 100 : 0;

const formatoPorcentaje = (valor: number) =>
  `${valor.toLocaleString("es-AR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;

const DATOS_GRAFICO = SEMESTRES.map((semestre, index) => ({
  semestre: `Semestre ${semestre}`,
  ...Object.fromEntries(
    COHORTES.map((cohorte) => [
      cohorte.id,
      cohorte.bajasPorSemestre[index] === undefined
        ? null
        : tasaBaja(cohorte.bajasPorSemestre[index], cohorte.inscriptos),
    ]),
  ),
}));

export function Desgranamiento() {
  const [cohorteSeleccionada, setCohorteSeleccionada] = useState("2026");
  const cohorte = COHORTES.find((item) => item.id === cohorteSeleccionada) ?? COHORTES[0];
  const totalBajas = cohorte.bajasPorSemestre.reduce((total, bajas) => total + bajas, 0);
  const tasaTotal = tasaBaja(totalBajas, cohorte.inscriptos);
  const semestreConMasBajas = cohorte.bajasPorSemestre.reduce(
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
            value={cohorteSeleccionada}
            onChange={(event) => setCohorteSeleccionada(event.target.value)}
            className="min-w-48 rounded-lg border border-line bg-paper-surface px-3 py-2.5 text-sm font-medium text-ink"
          >
            {COHORTES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre}{item.enCurso ? " · En curso" : ""}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-brand-500/20 bg-brand-500/5 px-4 py-3 text-sm text-ink-secondary">
        <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-300" />
        <p>
          <span className="font-semibold text-ink">Datos demostrativos:</span> esta visualización usa
          ejemplos locales del frontend y todavía no está conectada a datos reales. La cohorte 2026
          está en curso; sus cifras son parciales hasta el semestre 4.
        </p>
      </div>

      <section aria-label={`Resumen de ${cohorte.nombre}`} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-line bg-paper-surface p-4">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-sm">Total inscriptos</span>
            <Users className="h-4 w-4 text-brand-600 dark:text-brand-300" />
          </div>
          <p className="mt-3 text-2xl font-bold text-ink">{cohorte.inscriptos}</p>
          <p className="mt-1 text-xs text-ink-muted">{cohorte.nombre}</p>
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
            {cohorte.bajasPorSemestre[semestreConMasBajas]} estudiantes dados de baja
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
        <div className="h-72 w-full" role="img" aria-label="Gráfico de líneas con tasas de bajas por semestre para tres cohortes">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={DATOS_GRAFICO} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
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
              {COHORTES.map((item) => (
                <Line
                  key={item.id}
                  type="monotone"
                  dataKey={item.id}
                  name={item.nombre}
                  stroke={item.color}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: item.color, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4">
          {COHORTES.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-xs text-ink-secondary">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.nombre}{item.enCurso ? " (en curso)" : ""}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-paper-surface p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-ink">Detalle de {cohorte.nombre}</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Distribución de las bajas registradas en cada semestre.
          </p>
        </div>
        <div className="space-y-4">
          {cohorte.bajasPorSemestre.map((bajas, index) => {
            const porcentaje = tasaBaja(bajas, cohorte.inscriptos);
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
