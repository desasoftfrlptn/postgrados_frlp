import { useMemo, useState } from "react";
import { AlertTriangle, Download, Flame } from "lucide-react";
import { Button } from "@/shared/components/Button";
import { Spinner } from "@/shared/components/Spinner";
import type { EstudianteRiesgo } from "../hooks/useEstudiantesEnRiesgo";

/**
 * US-C-003 — Dashboard de estudiantes en riesgo
 *
 * Muestra los estudiantes en estado ROJO del semáforo académico,
 * ordenados por criticidad y permite exportarlos a Excel.
 *
 * US-D-003 — Exportación de reporte a Excel
 *
 * El Excel generado incluye:
 * - Headers en negrita
 * - Filtros automáticos
 * - Columnas ajustadas
 * - Hoja de datos
 * - Hoja adicional de metadatos
 */

interface EstudiantesEnRiesgoProps {
  /** Listado completo de estudiantes. El componente filtra y ordena. */
  estudiantes: EstudianteRiesgo[];

  isLoading?: boolean;

  error?: string | null;

  /** Nombre de archivo sin extensión. */
  nombreArchivoExport?: string;

  /** Usuario que realiza la exportación. */
  usuarioExportador?: string;
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const formateadorFechaHora = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatearFecha(iso: string): string {
  const fecha = new Date(`${iso}T00:00:00`);

  if (Number.isNaN(fecha.getTime())) {
    return iso;
  }

  return formateadorFecha.format(fecha);
}

function ordenarPorCriticidad(
  estudiantes: EstudianteRiesgo[]
): EstudianteRiesgo[] {
  return [...estudiantes].sort((a, b) => {
    // Primer criterio: más días sin avance.
    if (b.diasSinAvance !== a.diasSinAvance) {
      return b.diasSinAvance - a.diasSinAvance;
    }

    // Segundo criterio: más seminarios adeudados.
    return b.seminariosAdeudados - a.seminariosAdeudados;
  });
}

// ---------------------------------------------------------------------------
// Exportación Excel — US-D-003
// ---------------------------------------------------------------------------

async function exportarExcel(
  estudiantes: EstudianteRiesgo[],
  nombreArchivo: string,
  usuarioExportador: string
) {
  /*
   * Importación diferida de SheetJS.
   *
   * Requiere:
   * npm install xlsx
   */
  const XLSX = await import("xlsx");

  // -------------------------------------------------------------------------
  // Hoja principal
  // -------------------------------------------------------------------------

  const filas = estudiantes.map((estudiante) => ({
    Nombre: estudiante.nombre,
    Carrera: estudiante.carrera,
    "Fecha de inscripción": formatearFecha(
      estudiante.fechaInscripcion
    ),
    "Seminarios adeudados": estudiante.seminariosAdeudados,
    "Días sin avance": estudiante.diasSinAvance,
  }));

  const hoja = XLSX.utils.json_to_sheet(filas);

  // Ancho de columnas.
  hoja["!cols"] = [
    { wch: 30 },
    { wch: 30 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
  ];

  // Autofiltro.
  if (filas.length > 0) {
    hoja["!autofilter"] = {
      ref: `A1:E${filas.length + 1}`,
    };
  }

  // Headers en negrita.
  const headers = [
    "A1",
    "B1",
    "C1",
    "D1",
    "E1",
  ];

  headers.forEach((celda) => {
    if (hoja[celda]) {
      hoja[celda].s = {
        font: {
          bold: true,
        },
      };
    }
  });

  // -------------------------------------------------------------------------
  // Hoja de metadatos
  // -------------------------------------------------------------------------

  const fechaGeneracion = new Date();

  const metadatos = [
    {
      Campo: "Fecha de generación",
      Valor: formateadorFechaHora.format(fechaGeneracion),
    },
    {
      Campo: "Filtro aplicado",
      Valor: "Estado: ROJO",
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

  hojaMetadatos["!cols"] = [
    { wch: 35 },
    { wch: 45 },
  ];

  // Headers de metadatos en negrita.
  ["A1", "B1"].forEach((celda) => {
    if (hojaMetadatos[celda]) {
      hojaMetadatos[celda].s = {
        font: {
          bold: true,
        },
      };
    }
  });

  // -------------------------------------------------------------------------
  // Libro
  // -------------------------------------------------------------------------

  const libro = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    libro,
    hoja,
    "Estudiantes en riesgo"
  );

  XLSX.utils.book_append_sheet(
    libro,
    hojaMetadatos,
    "Metadatos"
  );

  // -------------------------------------------------------------------------
  // Descarga
  // -------------------------------------------------------------------------

  const fechaArchivo = fechaGeneracion
    .toISOString()
    .slice(0, 10);

  XLSX.writeFile(
    libro,
    `${nombreArchivo}-${fechaArchivo}.xlsx`
  );
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function EstudiantesEnRiesgo({
  estudiantes,
  isLoading = false,
  error = null,
  nombreArchivoExport = "estudiantes-en-riesgo",
  usuarioExportador = "Usuario actual",
}: EstudiantesEnRiesgoProps) {
  const [exportando, setExportando] = useState(false);
  const [errorExportacion, setErrorExportacion] = useState<string | null>(
    null
  );

  // -------------------------------------------------------------------------
  // US-C-003 — Filtrar y ordenar estudiantes ROJO
  // -------------------------------------------------------------------------

  const estudiantesRojo = useMemo(
    () =>
      ordenarPorCriticidad(
        estudiantes.filter(
          (estudiante) => estudiante.estado === "rojo"
        )
      ),
    [estudiantes]
  );

  // -------------------------------------------------------------------------
  // Exportación
  // -------------------------------------------------------------------------

  const handleExportar = async () => {
    if (estudiantesRojo.length === 0 || exportando) {
      return;
    }

    setExportando(true);
    setErrorExportacion(null);

    try {
      await exportarExcel(
        estudiantesRojo,
        nombreArchivoExport,
        usuarioExportador
      );
    } catch (error) {
      console.error("Error al exportar Excel:", error);

      setErrorExportacion(
        "No se pudo generar el archivo Excel. Verificá que la dependencia 'xlsx' esté instalada."
      );
    } finally {
      setExportando(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <section
      aria-labelledby="riesgo-titulo"
      className="flex h-full flex-col gap-5"
    >
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className="
              flex h-10 w-10 shrink-0 items-center justify-center
              rounded-lg
              bg-semaforo-rojo-soft
              text-semaforo-rojo
              dark:bg-[color:var(--color-semaforo-rojo-soft-dark)]
            "
          >
            <Flame
              className="h-5 w-5"
              aria-hidden="true"
            />
          </span>

          <div>
            <h1 id="riesgo-titulo">
              Estudiantes en riesgo
            </h1>

            <p className="text-sm text-ink-secondary">
              Casos en estado rojo, priorizados por días sin avance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="
              rounded-full
              bg-semaforo-rojo-soft
              px-3 py-1
              text-xs font-semibold
              text-semaforo-rojo
              dark:bg-[color:var(--color-semaforo-rojo-soft-dark)]
            "
          >
            {estudiantesRojo.length} en rojo
          </span>

          <Button
            variant="outline"
            icon={Download}
            onClick={handleExportar}
            isLoading={exportando}
            disabled={
              isLoading ||
              estudiantesRojo.length === 0 ||
              exportando
            }
          >
            Exportar a Excel
          </Button>
        </div>
      </div>

      {/* Error de exportación */}
      {errorExportacion && (
        <div
          role="alert"
          className="
            rounded-lg
            border border-semaforo-rojo
            bg-semaforo-rojo-soft
            px-4 py-3
            text-sm text-semaforo-rojo
          "
        >
          {errorExportacion}
        </div>
      )}

      {/* Contenido */}
      {isLoading ? (
        <div
          className="
            flex flex-1
            items-center justify-center
            gap-3 py-16
            text-ink-secondary
          "
        >
          <Spinner size="sm" />

          <span className="text-sm">
            Cargando estudiantes…
          </span>
        </div>
      ) : error ? (
        <div
          className="
            flex flex-1
            flex-col items-center justify-center
            gap-2
            rounded-xl
            border border-line
            bg-paper-surface
            py-16
            text-center
          "
        >
          <AlertTriangle
            className="h-6 w-6 text-semaforo-rojo"
            aria-hidden="true"
          />

          <p className="text-sm font-medium text-ink">
            No se pudo cargar el listado
          </p>

          <p className="text-sm text-ink-secondary">
            {error}
          </p>
        </div>
      ) : estudiantesRojo.length === 0 ? (
        <div
          className="
            flex flex-1
            flex-col items-center justify-center
            gap-2
            rounded-xl
            border border-line
            bg-paper-surface
            py-16
            text-center
          "
        >
          <p className="text-sm font-medium text-ink">
            No hay estudiantes en rojo
          </p>

          <p className="text-sm text-ink-secondary">
            Ningún caso requiere intervención prioritaria en este momento.
          </p>
        </div>
      ) : (
        <div
          className="
            scroll-fade
            flex-1
            overflow-x-auto
            rounded-xl
            border border-line
            bg-paper-surface
          "
        >
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-secondary">
                <th
                  scope="col"
                  className="px-4 py-3 font-medium"
                >
                  Nombre
                </th>

                <th
                  scope="col"
                  className="px-4 py-3 font-medium"
                >
                  Carrera
                </th>

                <th
                  scope="col"
                  className="px-4 py-3 font-medium"
                >
                  Fecha de inscripción
                </th>

                <th
                  scope="col"
                  className="px-4 py-3 text-right font-medium"
                >
                  Seminarios adeudados
                </th>

                <th
                  scope="col"
                  className="px-4 py-3 text-right font-medium"
                >
                  Días sin avance
                </th>
              </tr>
            </thead>

            <tbody>
              {estudiantesRojo.map((estudiante, indice) => (
                <tr
                  key={estudiante.id}
                  className={[
                    "transition-colors hover:bg-paper-elevated",
                    indice !== estudiantesRojo.length - 1
                      ? "border-b border-line"
                      : "",
                  ].join(" ")}
                >
                  <td className="px-4 py-3 font-medium text-ink">
                    {estudiante.nombre}
                  </td>

                  <td className="px-4 py-3 text-ink-secondary">
                    {estudiante.carrera}
                  </td>

                  <td className="px-4 py-3 text-ink-secondary">
                    {formatearFecha(
                      estudiante.fechaInscripcion
                    )}
                  </td>

                  <td className="px-4 py-3 text-right text-ink-secondary">
                    {estudiante.seminariosAdeudados}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <span
                      className="
                        inline-flex
                        min-w-[3.5rem]
                        justify-center
                        rounded-full
                        bg-semaforo-rojo-soft
                        px-2.5 py-1
                        text-xs font-semibold
                        text-semaforo-rojo
                        dark:bg-[color:var(--color-semaforo-rojo-soft-dark)]
                      "
                    >
                      {estudiante.diasSinAvance} días
                    </span>
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