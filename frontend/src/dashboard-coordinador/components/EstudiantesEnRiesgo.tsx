import { useMemo, useState } from "react";
import { AlertTriangle, Download, Flame } from "lucide-react";
import { Button } from "@/shared/components/Button";
import { Spinner } from "@/shared/components/Spinner";
import type { EstudianteRiesgo } from "../hooks/useEstudiantesEnRiesgo";

interface EstudiantesEnRiesgoProps {
  estudiantes: EstudianteRiesgo[];
  isLoading?: boolean;
  error?: string | null;
  nombreArchivoExport?: string;
  usuarioExportador?: string;
}

const TAMANIO_PAGINA = 20;
const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit", month: "2-digit", year: "numeric",
});
const formateadorFechaHora = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short", timeStyle: "medium",
});

function formatearFecha(iso: string | null): string {
  if (!iso) return "No disponible";
  const fecha = new Date(`${iso}T00:00:00`);
  return Number.isNaN(fecha.getTime()) ? "No disponible" : formateadorFecha.format(fecha);
}

export async function exportarExcel(
  estudiantes: EstudianteRiesgo[],
  nombreArchivo: string,
  usuarioExportador: string
) {
  const XLSX = await import("xlsx-js-style");

  const filas = estudiantes.map((estudiante) => ({
    Nombre: estudiante.nombre,
    Carrera: estudiante.carrera,
    "Fecha de inscripción": formatearFecha(estudiante.fechaInscripcion),
    "Seminarios adeudados": estudiante.seminariosAdeudados ?? "No disponible",
    "Días sin avance": estudiante.diasSinAvance ?? "No disponible",
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
      Valor: "Semáforo ROJO; todas las páginas de la API",
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
  estudiantes, isLoading = false, error = null,
  nombreArchivoExport = "estudiantes-en-riesgo", usuarioExportador = "No disponible",
}: EstudiantesEnRiesgoProps) {
  const [paginaSolicitada, setPagina] = useState(1);
  const [exportando, setExportando] = useState(false);
  const [errorExportacion, setErrorExportacion] = useState<string | null>(null);
  // No existe una métrica de criticidad en la respuesta. Ordenar por apellido y nombre.
  const ordenados = useMemo(() => [...estudiantes].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }) || a.id.localeCompare(b.id)
  ), [estudiantes]);
  const paginas = Math.max(1, Math.ceil(ordenados.length / TAMANIO_PAGINA));
  const pagina = Math.min(paginaSolicitada, paginas);
  const visibles = ordenados.slice((pagina - 1) * TAMANIO_PAGINA, pagina * TAMANIO_PAGINA);

  async function handleExportar() {
    if (isLoading || error || ordenados.length === 0 || exportando) return;
    setExportando(true);
    setErrorExportacion(null);
    try {
      // Incluye todas las páginas, no solamente las 20 filas visibles.
      await exportarExcel(ordenados, nombreArchivoExport, usuarioExportador);
    } catch {
      setErrorExportacion("No se pudo generar el archivo Excel. Probá de nuevo.");
    } finally {
      setExportando(false);
    }
  }

  return (
    <section aria-labelledby="riesgo-titulo" className="flex h-full flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Flame className="mt-1 h-6 w-6 text-semaforo-rojo" aria-hidden="true" />
          <div>
            <h1 id="riesgo-titulo" className="text-xl font-bold text-ink">Estudiantes en riesgo</h1>
            <p className="text-sm text-ink-secondary">
              Semáforos ROJO registrados, ordenados por apellido y nombre.
            </p>
            <p className="text-xs text-ink-muted">
              Seminarios adeudados y días sin avance: no disponibles.
            </p>
          </div>
        </div>
        <Button variant="outline" icon={Download} onClick={handleExportar}
          isLoading={exportando} disabled={isLoading || Boolean(error) || !ordenados.length || exportando}>
          Exportar todos a Excel
        </Button>
      </div>
      {errorExportacion && <p role="alert" className="text-sm text-semaforo-rojo">{errorExportacion}</p>}
      {isLoading ? (
        <div className="flex items-center justify-center gap-3 py-16"><Spinner size="sm" /> Cargando estudiantes…</div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-line p-6 text-semaforo-rojo">
          <AlertTriangle className="mb-2 h-6 w-6" /> No se pudo cargar el listado: {error}
        </div>
      ) : ordenados.length === 0 ? (
        <p className="rounded-xl border border-line p-6 text-ink-secondary">No hay estudiantes con semáforo ROJO.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-line bg-paper-surface">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line text-ink-secondary">
                <tr>
                  {["Apellido y nombre", "Carrera", "Fecha de inscripción", "Seminarios adeudados", "Días sin avance", "Semáforo"].map((titulo) => (
                    <th key={titulo} scope="col" className="px-4 py-3 font-medium">{titulo}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibles.map((estudiante) => (
                  <tr key={estudiante.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">{estudiante.nombre}</td>
                    <td className="px-4 py-3 text-ink-secondary">{estudiante.carrera}</td>
                    <td className="px-4 py-3 text-ink-secondary">{formatearFecha(estudiante.fechaInscripcion)}</td>
                    <td className="px-4 py-3 text-ink-secondary">{estudiante.seminariosAdeudados ?? "No disponible"}</td>
                    <td className="px-4 py-3 text-ink-secondary">{estudiante.diasSinAvance ?? "No disponible"}</td>
                    <td className="px-4 py-3 font-semibold text-semaforo-rojo">ROJO</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav aria-label="Paginación de estudiantes en riesgo" className="flex items-center justify-between gap-3">
            <Button variant="outline" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>Anterior</Button>
            <p aria-live="polite" className="text-sm text-ink-secondary">
              Página {pagina} de {paginas} · {ordenados.length} estudiantes
            </p>
            <Button variant="outline" disabled={pagina === paginas} onClick={() => setPagina(pagina + 1)}>Siguiente</Button>
          </nav>
        </>
      )}
    </section>
  );
}
