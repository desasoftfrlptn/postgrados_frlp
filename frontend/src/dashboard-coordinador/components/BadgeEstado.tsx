import type { EstadoLegajo } from "@/shared/types/types";

const ESTADO_CONFIG: Record<EstadoLegajo, { label: string; className: string }> = {
  BORRADOR: {
    label: "Borrador",
    className: "bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-300",
  },
  PENDIENTE: {
    label: "Pendiente",
    className:
      "bg-semaforo-amarillo-soft text-semaforo-amarillo dark:bg-semaforo-amarillo-soft-dark dark:text-amber-300",
  },
  EN_REVISION: {
    label: "En revisión",
    className: "bg-brand-100 text-brand-700 dark:bg-brand-800/60 dark:text-brand-200",
  },
  OBSERVADO: {
    label: "Observado",
    className:
      "bg-semaforo-amarillo-soft text-semaforo-amarillo dark:bg-semaforo-amarillo-soft-dark dark:text-amber-300",
  },
  COMPLETADO: {
    label: "Completado",
    className:
      "bg-semaforo-verde-soft text-semaforo-verde dark:bg-semaforo-verde-soft-dark dark:text-green-300",
  },
  ACTIVO: {
    label: "Activo",
    className:
      "bg-semaforo-verde-soft text-semaforo-verde dark:bg-semaforo-verde-soft-dark dark:text-green-300",
  },
  VENCIDO: {
    label: "Vencido",
    className:
      "bg-semaforo-rojo-soft text-semaforo-rojo dark:bg-semaforo-rojo-soft-dark dark:text-red-300",
  },
  RECHAZADO: {
    label: "Rechazado",
    className:
      "bg-semaforo-rojo-soft text-semaforo-rojo dark:bg-semaforo-rojo-soft-dark dark:text-red-300",
  },
  BAJA: {
    label: "Baja",
    className: "bg-neutral-100 text-neutral-500 dark:bg-white/10 dark:text-neutral-400",
  },
  GRADUADO: {
    label: "Graduado",
    className: "bg-brand-500 text-white",
  },
};

export function BadgeEstado({ estado }: { estado: EstadoLegajo }) {
  const { label, className } = ESTADO_CONFIG[estado];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}