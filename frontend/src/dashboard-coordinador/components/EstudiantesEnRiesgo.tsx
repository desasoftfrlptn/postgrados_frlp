import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, Clock, Download, Flame, RefreshCw } from "lucide-react";
import { Button } from "@/shared/components/Button";
import { Spinner } from "@/shared/components/Spinner";
import type { EstudianteRiesgo} from "../hooks/useEstudiantesEnRiesgo";
import type { LogCambioSemaforo } from "../types/semaforo.types";

/**
 * US-C-002 — Semáforo de riesgo académico
 * US-C-003 — Dashboard de estudiantes en riesgo
 * US-D-003 — Exportación de reporte a Excel
 */

interface EstudiantesEnRiesgoProps {
  estudiantes: EstudianteRiesgo[];
  logs?: LogCambioSemaforo[];
  /** Timestamp de la última ejecución del recálculo automático */
  ultimaEjecucion?: string | null;
  ejecutando?: boolean;
  onEjecutarRecalculo?: () => void;
  onAsignarVerdeManual?: (estudianteId: string, motivo?: string) => void;
  isLoading?: boolean;
  error?: string | null;
  nombreArchivoExport?: string;
  usuarioExportador?: string;
}

const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const formateadorFechaHora = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "medium",
});

function formatearFecha(iso: string): string {
  const fecha = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return iso;
  return formateadorFecha.format(fecha);
}

function formatearTimestamp(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return formateadorFechaHora.format(fecha);
}

function ordenarPorCriticidad(estudiantes: EstudianteRiesgo[]): EstudianteRiesgo[] {
  return [...estudiantes].sort((a, b) => {
    if (b.diasSinAvance !== a.diasSinAvance) {
      return b.diasSinAvance - a.diasSinAvance;
    }
    return b.seminariosAdeudados - a.seminariosAdeudados;
  });
}

async function exportarExcel(
  estudiantes: EstudianteRiesgo[],
  nombreArchivo: string,
  usuarioExportador: string
) {
  const XLSX = await import("xlsx");

  const filas = estudiantes.map((estudiante) => ({
    Nombre: estudiante.nombre,
    Carrera: estudiante.carrera,
    "Fecha de inscripción": formatearFecha(estudiante.fechaInscripcion),
    "Seminarios adeudados": estudiante.seminariosAdeudados,
    "Días sin avance": estudiante.diasSinAvance,
    "Estado Semáforo": estudiante.estado.toUpperCase(),
  }));

  const hoja = XLSX.utils.json_to_sheet(filas);
  hoja["!cols"] = [
    { wch: 30 },
    { wch: 30 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
  ];

  if (filas.length > 0) {
    hoja["!autofilter"] = {
      ref: `A1:F${filas.length + 1}`,
    };
  }

  const headers = ["A1", "B1", "C1", "D1", "E1", "F1"];
  headers.forEach((celda) => {
    if (hoja[celda]) {
      hoja[celda].s = { font: { bold: true } };
    }
  });

  const fechaGeneracion = new Date();
  const metadatos = [
    {
      Campo: "Fecha de generación",
      Valor: formateadorFechaHora.format(fechaGeneracion),
    },
    {
      Campo: "Filtro aplicado",
      Valor: "Seguimiento Semáforo Académico",
    },
    {
      Campo: "Cantidad de estudiantes exportados",
      Valor: estudiantes.length,
    },
    {
      Campo: "Usuario que exportó",
      Valor: usuarioExportador || "Usuario no identificado",
    },
  ];

  const hojaMetadatos = XLSX.utils.json_to_sheet(metadatos);
  hojaMetadatos["!cols"] = [{ wch: 35 }, { wch: 45 }];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Estudiantes en seguimiento");
  XLSX.utils.book_append_sheet(libro, hojaMetadatos, "Metadatos");

  const fechaArchivo = fechaGeneracion.toISOString().slice(0, 10);
  XLSX.writeFile(libro, `${nombreArchivo}-${fechaArchivo}.xlsx`);
}

export default function EstudiantesEnRiesgo({
  estudiantes,
  logs = [],
  ultimaEjecucion,
  ejecutando = false,
  onEjecutarRecalculo,
  onAsignarVerdeManual,
  isLoading = false,
  error = null,
  nombreArchivoExport = "estudiantes-en-riesgo",
  usuarioExportador = "Usuario actual",
}: EstudiantesEnRiesgoProps) {
  const [exportando, setExportando] = useState(false);
  const [errorExportacion, setErrorExportacion] = useState<string | null>(null);
  const [mostrarLogs, setMostrarLogs] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "rojo" | "amarillo">("todos");

  const estudiantesRojo = useMemo(
    () => estudiantes.filter((e) => e.estado === "rojo"),
    [estudiantes]
  );

  const estudiantesAmarillo = useMemo(
    () => estudiantes.filter((e) => e.estado === "amarillo"),
    [estudiantes]
  );

  const estudiantesFiltrados = useMemo(() => {
    let resultado = estudiantes.filter((e) => e.estado === "rojo" || e.estado === "amarillo");
    if (filtroEstado === "rojo") {
      resultado = estudiantesRojo;
    } else if (filtroEstado === "amarillo") {
      resultado = estudiantesAmarillo;
    }
    return ordenarPorCriticidad(resultado);
  }, [estudiantes, filtroEstado, estudiantesRojo, estudiantesAmarillo]);

  const handleExportar = async () => {
    if (estudiantesFiltrados.length === 0 || exportando) return;

    setExportando(true);
    setErrorExportacion(null);

    try {
      await exportarExcel(estudiantesFiltrados, nombreArchivoExport, usuarioExportador);
    } catch (error) {
      console.error("Error al exportar Excel:", error);
      setErrorExportacion(
        "No se pudo generar el archivo Excel. Verificá que la dependencia 'xlsx' esté instalada."
      );
    } finally {
      setExportando(false);
    }
  };

  const handleVerdeManual = (estudianteId: string, nombreEstudiante: string) => {
    const motivo = window.prompt(
      `Asignar estado VERDE a ${nombreEstudiante} (BR-008).\nIngrese el motivo o justificación:`,
      "Situación académica regularizada por el coordinador"
    );

    if (motivo !== null) {
      onAsignarVerdeManual?.(estudianteId, motivo);
    }
  };

  return (
    <section aria-labelledby="riesgo-titulo" className="flex h-full flex-col gap-5">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-semaforo-rojo-soft text-semaforo-rojo dark:bg-[color:var(--color-semaforo-rojo-soft-dark)]">
            <Flame className="h-5 w-5" aria-hidden="true" />
          </span>

          <div>
            <h1 id="riesgo-titulo" className="text-xl font-bold text-ink">
              Estudiantes en seguimiento y riesgo
            </h1>

            <p className="text-sm text-ink-secondary">
              Casos en semáforo rojo y amarillo, priorizados por días sin avance.
              {ultimaEjecucion && (
                <span className="ml-2 text-xs text-ink-muted">
                  • Última tarea programada: {formatearTimestamp(ultimaEjecucion)}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setFiltroEstado("todos")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              filtroEstado === "todos"
                ? "bg-brand-500 text-white"
                : "bg-paper-elevated text-ink-secondary hover:bg-paper-surface"
            }`}
          >
            Todos ({estudiantesRojo.length + estudiantesAmarillo.length})
          </button>

          <button
            onClick={() => setFiltroEstado("rojo")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              filtroEstado === "rojo"
                ? "bg-semaforo-rojo text-white"
                : "bg-semaforo-rojo-soft text-semaforo-rojo dark:bg-[color:var(--color-semaforo-rojo-soft-dark)]"
            }`}
          >
            {estudiantesRojo.length} en rojo
          </button>

          <button
            onClick={() => setFiltroEstado("amarillo")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              filtroEstado === "amarillo"
                ? "bg-amber-500 text-white"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            }`}
          >
            {estudiantesAmarillo.length} en amarillo
          </button>

          {onEjecutarRecalculo && (
            <Button
              variant="neutral"
              icon={RefreshCw}
              onClick={onEjecutarRecalculo}
              isLoading={ejecutando}
              title="Ejecutar la tarea programada diaria de recálculo del semáforo (US-C-002)"
            >
              Recalcular Semáforos (Cron)
            </Button>
          )}

          <Button
            variant="outline"
            icon={Clock}
            onClick={() => setMostrarLogs(!mostrarLogs)}
            title="Ver logs de auditoría de semáforos"
          >
            Historial de Cambios ({logs.length})
          </Button>

          <Button
            variant="outline"
            icon={Download}
            onClick={handleExportar}
            isLoading={exportando}
            disabled={isLoading || estudiantesFiltrados.length === 0 || exportando}
          >
            Exportar a Excel
          </Button>
        </div>
      </div>

      {/* Panel de Auditoría / Logs (US-C-002) */}
      {mostrarLogs && (
        <div className="rounded-xl border border-line bg-paper-surface p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Clock className="h-4 w-4 text-brand-500" />
              Auditoría y Logs de Cambios de Semáforo (Timestamp ISO 8601)
            </h2>
            <button
              onClick={() => setMostrarLogs(false)}
              className="text-xs text-ink-muted hover:text-ink"
            >
              Cerrar ✕
            </button>
          </div>

          {logs.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-muted">
              No hay registros de cambios de semáforo aún.
            </p>
          ) : (
            <div className="max-h-60 overflow-y-auto pr-1">
              <ul className="divide-y divide-line text-xs">
                {logs.map((log) => (
                  <li key={log.id} className="flex flex-col gap-1 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">
                        {log.estudianteNombre}
                      </span>
                      <span className="text-ink-muted">
                        {formatearTimestamp(log.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono uppercase ${
                          log.esManual
                            ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30"
                            : "bg-paper-elevated text-ink-secondary"
                        }`}
                      >
                        {log.esManual ? "BR-008 (Manual)" : "Cron Automático"}
                      </span>

                      <span className="text-ink-secondary">
                        Estado: <strong className="uppercase">{log.estadoAnterior}</strong> ➔{" "}
                        <strong className="uppercase text-brand-600 dark:text-brand-400">
                          {log.estadoNuevo}
                        </strong>
                      </span>
                    </div>

                    <p className="text-ink-muted italic">{log.motivo}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {errorExportacion && (
        <div
          role="alert"
          className="rounded-lg border border-semaforo-rojo bg-semaforo-rojo-soft px-4 py-3 text-sm text-semaforo-rojo"
        >
          {errorExportacion}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center gap-3 py-16 text-ink-secondary">
          <Spinner size="sm" />
          <span className="text-sm">Cargando estudiantes…</span>
        </div>
      ) : error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-line bg-paper-surface py-16 text-center">
          <AlertTriangle className="h-6 w-6 text-semaforo-rojo" aria-hidden="true" />
          <p className="text-sm font-medium text-ink">No se pudo cargar el listado</p>
          <p className="text-sm text-ink-secondary">{error}</p>
        </div>
      ) : estudiantesFiltrados.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-line bg-paper-surface py-16 text-center">
          <p className="text-sm font-medium text-ink">No hay estudiantes en este estado</p>
          <p className="text-sm text-ink-secondary">
            Ningún caso requiere intervención prioritaria con el filtro seleccionado.
          </p>
        </div>
      ) : (
        <div className="scroll-fade flex-1 overflow-x-auto rounded-xl border border-line bg-paper-surface">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-secondary">
                <th scope="col" className="px-4 py-3 font-medium">
                  Nombre
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Carrera
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Fecha de inscripción
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Seminarios adeudados
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Días sin avance
                </th>
                <th scope="col" className="px-4 py-3 text-center font-medium">
                  Acción BR-008
                </th>
              </tr>
            </thead>

            <tbody>
              {estudiantesFiltrados.map((estudiante, indice) => (
                <tr
                  key={estudiante.id}
                  className={[
                    "transition-colors hover:bg-paper-elevated",
                    indice !== estudiantesFiltrados.length - 1 ? "border-b border-line" : "",
                  ].join(" ")}
                >
                  <td className="px-4 py-3 font-medium text-ink">
                    {estudiante.nombre}
                  </td>

                  <td className="px-4 py-3 text-ink-secondary">
                    {estudiante.carrera}
                  </td>

                  <td className="px-4 py-3 text-ink-secondary">
                    {formatearFecha(estudiante.fechaInscripcion)}
                  </td>

                  <td className="px-4 py-3 text-right text-ink-secondary">
                    {estudiante.seminariosAdeudados}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex min-w-[3.5rem] justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        estudiante.estado === "rojo"
                          ? "bg-semaforo-rojo-soft text-semaforo-rojo dark:bg-[color:var(--color-semaforo-rojo-soft-dark)]"
                          : estudiante.estado === "amarillo"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      }`}
                    >
                      {estudiante.diasSinAvance} días ({estudiante.estado.toUpperCase()})
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    {onAsignarVerdeManual && (
                      <button
                        type="button"
                        onClick={() => handleVerdeManual(estudiante.id, estudiante.nombre)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300 dark:hover:bg-brand-900/60"
                        title="BR-008: Asignar estado VERDE manualmente como coordinador"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Asignar VERDE
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
