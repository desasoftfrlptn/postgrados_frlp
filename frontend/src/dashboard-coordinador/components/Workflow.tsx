import type { EstadoLegajo, Legajo } from "@/shared/types/types";
import { Button } from "@/shared/components/Button";
import { Spinner } from "@/shared/components/Spinner";
import { Check } from "lucide-react";
import { useActualizarEstado } from "@/shared/hooks/useEstado";

interface WorkflowProps {
  legajo: Legajo;
}

type StepStatus = "done" | "active" | "pending";

const STEP_CLASSES: Record<StepStatus, string> = {
  done: "bg-semaforo-verde text-white",
  active: "bg-brand-500 text-white ring-4 ring-brand-500/20",
  pending: "bg-paper-elevated text-ink-muted ring-1 ring-inset ring-line",
};

export const Workflow = ({ legajo }: WorkflowProps) => {
  const steps: { label: string; status: StepStatus }[] = [
    {
      label: "Solicitud inicial",
      status: legajo.estado === "BORRADOR" ? "active" : "done",
    },
    {
      label: "Pendiente de revisión",
      status:
        legajo.estado === "PENDIENTE" || legajo.estado === "OBSERVADO"
          ? "active"
          : legajo.estado === "BORRADOR"
            ? "pending"
            : "done",
    },
    {
      label: "Revisión académica",
      status:
        legajo.estado === "EN_REVISION"
          ? "active"
          : legajo.estado === "BORRADOR" ||
              legajo.estado === "PENDIENTE" ||
              legajo.estado === "OBSERVADO"
            ? "pending"
            : "done",
    },
    {
      label: "Matriculación",
      status:
        legajo.estado === "COMPLETADO"
          ? "active"
          : legajo.estado === "BORRADOR" ||
              legajo.estado === "PENDIENTE" ||
              legajo.estado === "OBSERVADO" ||
              legajo.estado === "EN_REVISION"
            ? "pending"
            : "done",
    },
  ];
  const doneCount = steps.filter((s) => s.status === "done").length;
  const progressPercent = Math.min((doneCount / (steps.length - 1)) * 100, 100);

  const { mutate: actualizarLegajo, isPending } = useActualizarEstado();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-4 text-xs text-ink-secondary">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-semaforo-verde" /> Completado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand-500" /> En curso
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-line" /> Pendiente
        </span>
      </div>

      <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-xs text-brand-700 dark:border-brand-800/60 dark:bg-brand-900/30 dark:text-brand-200">
        📋 Workflow de{" "}
        <strong>
          {legajo.nombre} {legajo.apellido}
        </strong>{" "}
        —{" "}
        {legajo.numero_legajo ? `#${legajo.numero_legajo}` : "Sin N° asignado"}{" "}
        · {legajo.tipo_carrera || "Carrera no definida"}
      </div>

      <div className="relative pt-2">
        <div className="absolute left-0 right-0 top-6 h-0.5 bg-line" />
        <div
          className="absolute left-0 top-6 h-0.5 bg-brand-500 transition-all"
          style={{ width: `${progressPercent}%` }}
        />

        <div className="relative flex justify-between">
          {steps.map((step) => (
            <div
              key={step.label}
              className="flex flex-col items-center gap-2 text-center"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${STEP_CLASSES[step.status]}`}
              >
                {step.status === "done" ? (
                  <Check size={16} />
                ) : (
                  steps.indexOf(step) + 1
                )}
              </div>
              <span className="max-w-20 text-xs font-medium text-ink-secondary">
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-ink-muted">
        Estado actual:{" "}
        <strong className="text-ink">
          {legajo.estado.replaceAll("_", " ")}
        </strong>
      </p>

      <div className="flex flex-wrap gap-2">
        {legajo.estado === "PENDIENTE" && (
          <Button disabled={isPending} variant="primary" onClick={() => console.log("Avanzar")}>
            Revisar
          </Button>
        )}
        {legajo.estado === "EN_REVISION" && (
          <>
            <Button
            disabled={isPending}
              variant="primary"
              onClick={() =>
                actualizarLegajo(
                  { id: legajo.id, estado: "COMPLETADO" as EstadoLegajo },
                  {
                    onError: (error: Error) => {
                      // manejar error
                      console.log(error);
                    },
                  },
                )
              }
            >
              Aprobar
            </Button>
            <Button disabled={isPending} variant="primary" onClick={() =>
                actualizarLegajo(
                  { id: legajo.id, estado: "RECHAZADO" as EstadoLegajo },
                  {
                    onError: (error: Error) => {
                      // manejar error
                      console.log(error);
                    },
                  },
                )
              }>
              Rechazar
            </Button>
          </>
        )}
        {legajo.estado === "COMPLETADO" && (
          <Button disabled={isPending} variant="primary" onClick={() =>
                actualizarLegajo(
                  { id: legajo.id, estado: "ACTIVO" as EstadoLegajo },
                  {
                    onError: (error: Error) => {
                      // manejar error
                      console.log(error);
                    },
                  },
                )
              }>
            Matricular
          </Button>
        )}
        {legajo.estado === "ACTIVO" && (
          <Button disabled={isPending} variant="primary" onClick={() =>
                actualizarLegajo(
                  { id: legajo.id, estado: "BAJA" as EstadoLegajo },
                  {
                    onError: (error: Error) => {
                      // manejar error
                      console.log(error);
                    },
                  },
                )
              }>
            Dar de baja
          </Button>
        )}
        {isPending && (
          <Spinner label="Actualizando estado..." />
        )}
      </div>
    </div>
  );
};
