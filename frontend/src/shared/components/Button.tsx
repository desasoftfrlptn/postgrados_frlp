/**
 * Variantes:
 * - primary: acción principal (ej. "Guardar", "Enviar inscripción")
 * - danger: acciones destructivas (ej. "Rechazar legajo")
 * - ghost: acciones secundarias, sin fondo
 * - outline: botón "píldora" con borde e ícono — ej. "Exportar"
 */

import { forwardRef, type ButtonHTMLAttributes, type ComponentType, type SVGProps } from "react";
import { Spinner } from "./Spinner";

type Variant = "primary" | "danger" | "ghost" | "outline";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "rounded-lg bg-brand-500 text-white shadow-sm hover:bg-brand-600 focus-visible:outline-brand-700 dark:hover:bg-brand-400",
  danger:
    "rounded-lg bg-semaforo-rojo text-white shadow-sm hover:opacity-90 focus-visible:outline-semaforo-rojo",
  ghost:
    "rounded-lg bg-transparent text-brand-700 hover:bg-brand-50 focus-visible:outline-brand-500 dark:text-brand-200 dark:hover:bg-white/5",
  outline:
    "rounded-full border border-line bg-paper-surface text-ink-secondary shadow-sm hover:bg-paper-elevated focus-visible:outline-neutral-400 dark:hover:bg-white/5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", isLoading = false, icon: Icon, disabled, children, className = "", ...rest },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={`
          inline-flex items-center justify-center gap-2 px-4 py-2
          text-sm font-medium transition-colors
          disabled:cursor-not-allowed disabled:opacity-50
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
          ${VARIANT_CLASSES[variant]} ${className}
        `}
        {...rest}
      >
        {isLoading ? (
          <Spinner size="sm" />
        ) : (
          Icon && <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";