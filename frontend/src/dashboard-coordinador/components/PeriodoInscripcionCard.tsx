import { useState } from "react";
import { Button } from "@/shared/components/Button";
import { Spinner } from "@/shared/components/Spinner";
import {
  usePeriodosInscripcion,
  useCrearPeriodo,
  useCerrarPeriodo,
  formatFecha,
  estaAbierto
} from "@/shared/hooks/usePeriodos";
import { NuevoPeriodoModal } from "./NuevoPeriodoModal";

interface PeriodoInscripcionCardProps {
  cohorteId: string;
}

export function PeriodoInscripcionCard({ cohorteId }: PeriodoInscripcionCardProps) {
  const [modalAbierto, setModalAbierto] = useState(false);

  const { data: periodos, isLoading, isError, error } = usePeriodosInscripcion(cohorteId);
  const crear = useCrearPeriodo(cohorteId);
  const cerrar = useCerrarPeriodo(cohorteId);

  const periodoVigente = periodos?.[0]; // ya viene ordenado por fecha_abre desc
  const abierto = periodoVigente ? estaAbierto(periodoVigente) : false;

  return (
    <div className="rounded-2xl border border-line bg-paper-surface p-5">
      <h2 className="mb-4 text-base font-semibold text-ink">Control de Inscripción</h2>

      {isLoading && (
        <div className="flex items-center gap-2 py-4 text-sm text-ink-secondary">
          <Spinner size="sm" /> Cargando…
        </div>
      )}

      {isError && (
        <p role="alert" className="py-4 text-sm text-semaforo-rojo">
          No se pudo cargar el período: {(error as Error).message}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="space-y-3">
          {periodoVigente ? (
            <div
              className={`flex items-center justify-between rounded-xl p-4 ${
                abierto
                  ? "bg-semaforo-verde-soft dark:bg-semaforo-verde-soft-dark"
                  : "bg-paper-elevated"
              }`}
            >
              <div>
                <p className={`text-sm font-semibold ${abierto ? "text-semaforo-verde" : "text-ink"}`}>
                  {abierto ? "Período activo" : "Último período"}
                </p>
                <p className="text-sm text-ink-secondary">
                  {formatFecha(periodoVigente.fecha_abre)}
                  {" — "}
                  {periodoVigente.fecha_cierra ? formatFecha(periodoVigente.fecha_cierra) : "Sin fecha de cierre"}
                </p>
              </div>
              <span
                className={`flex items-center gap-1.5 text-sm font-medium ${
                  abierto ? "text-semaforo-verde" : "text-ink-muted"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${abierto ? "bg-semaforo-verde" : "bg-neutral-400"}`}
                  aria-hidden="true"
                />
                {abierto ? "Abierta" : "Cerrada"}
              </span>
            </div>
          ) : (
            <p className="rounded-xl bg-paper-elevated p-4 text-sm text-ink-secondary">
              Todavía no configuraste ningún período de inscripción para esta cohorte.
            </p>
          )}

          {abierto && periodoVigente && (
            <Button
              variant="danger-soft"
              className="w-full"
              isLoading={cerrar.isPending}
              onClick={() => cerrar.mutate(periodoVigente.id)}
            >
              Cerrar período de inscripción
            </Button>
          )}

          <Button variant="neutral" className="w-full" onClick={() => setModalAbierto(true)}>
            Configurar nuevo período
          </Button>

          {cerrar.isError && (
            <p role="alert" className="text-xs text-semaforo-rojo">
              No se pudo cerrar el período: {(cerrar.error as Error).message}
            </p>
          )}
        </div>
      )}

      <NuevoPeriodoModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onGuardar={(datos) =>
          crear.mutate(datos, { onSuccess: () => setModalAbierto(false) })
        }
        isGuardando={crear.isPending}
        error={crear.isError ? (crear.error as Error).message : undefined}
      />
    </div>
  );
}