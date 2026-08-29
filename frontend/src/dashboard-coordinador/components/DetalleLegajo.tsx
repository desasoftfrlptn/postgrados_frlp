import { useLegajo } from "../hooks/useLegajos";
import { useDocumentos } from "../hooks/useDocumentos";
import { Spinner } from "@/shared/components/Spinner";
import { Button } from "@/shared/components/Button";
import { Download } from "lucide-react";
import { Workflow } from "./Workflow";

export default function DetalleLegajo({ id }: { id: string }) {
  const { data: legajo, isLoading: isLoadingLegajo, isError: isErrorLegajo, error: errorLegajo } = useLegajo(id);
  const { data: documentos, isLoading: isLoadingDocumentos, isError: isErrorDocumentos, error: errorDocumentos } = useDocumentos(id);
  const iniciales = `${legajo?.nombre[0] || ""}${legajo?.apellido[0] || ""}`.toUpperCase();

  if (isLoadingLegajo || isLoadingDocumentos) {
    return (
      <div className="flex items-center gap-2 p-6 text-ink-secondary">
        <Spinner size="sm" /> Cargando…
      </div>
    );
  }

  if (isErrorLegajo || isErrorDocumentos) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-semaforo-rojo/20 bg-semaforo-rojo-soft p-4 text-sm text-semaforo-rojo dark:bg-semaforo-rojo-soft-dark"
      >
        {isErrorLegajo &&
          `No se pudo cargar el legajo: ${(errorLegajo as Error).message}`}
          <br />
        {isErrorDocumentos &&
          `No se pudieron cargar los documentos: ${(errorDocumentos as Error).message}`}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center border-b border-line pb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700 font-bold text-lg dark:bg-brand-950 dark:text-brand-300">
          {iniciales}
        </div>
        <div>
          <div className="text-lg font-bold text-ink">{legajo?.apellido}, {legajo?.nombre}</div>
          <div className="text-sm font-medium text-ink-secondary">
            {legajo?.numero_legajo ? `Legajo #${legajo?.numero_legajo}` : `Estado: ${legajo?.estado}`}
          </div>
        </div>
        <div className="sm:ml-auto">
          <Button
            icon={Download} variant="outline">
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Datos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface-alt/50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Título de Grado</div>
          <div className="text-sm font-medium text-ink mt-1">{legajo?.titulo_grado}</div>
        </div>
        <div className="rounded-xl border border-line bg-surface-alt/50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Tipo de Carrera</div>
          <div className="text-sm font-medium text-ink mt-1">{legajo?.tipo_carrera || "No especificado"}</div>
        </div>
        <div className="rounded-xl border border-line bg-surface-alt/50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">DNI</div>
          <div className="text-sm font-medium text-ink mt-1 font-mono">{legajo?.dni}</div>
        </div>
        <div className="rounded-xl border border-line bg-surface-alt/50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Ciudad / Provincia</div>
          <div className="text-sm font-medium text-ink mt-1">{legajo?.domicilio.ciudad}, {legajo?.domicilio.provincia}</div>
        </div>
        <div className="rounded-xl border border-line bg-surface-alt/50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Email</div>
          <div className="text-xs font-medium text-ink mt-1 truncate">{legajo?.email}</div>
        </div>
        <div className="rounded-xl border border-line bg-surface-alt/50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Teléfono</div>
          <div className="text-sm font-medium text-ink mt-1 font-mono">{legajo?.telefono_movil}</div>
        </div>
        <div className="rounded-xl border border-line bg-surface-alt/50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Estado</div>
          <div className="text-sm font-medium text-ink mt-1">{legajo?.estado}</div>
        </div>
        
        {/* Semaforo */}
        <div className="rounded-xl border border-line bg-surface-alt/50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Semáforo</div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-block h-3 w-3 rounded-full ${
                legajo?.semaforo === "VERDE"
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  : legajo?.semaforo === "AMARILLO"
                  ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                  : legajo?.semaforo === "ROJO"
                  ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                  : "bg-gray-400"
              }`}
            />
            <span className="text-sm font-medium text-ink uppercase">
              {legajo?.semaforo || "DESCONOCIDO"}
            </span>
          </div>
        </div>
      </div>

      {/* Motivacion */}
      <div className="rounded-xl border border-line bg-surface-alt/30 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">Motivación</div>
        <p className="text-sm text-ink italic">"{legajo?.motivacion}"</p>
      </div>
      {legajo && <Workflow legajo={legajo}/>}
    </div>
  );
}