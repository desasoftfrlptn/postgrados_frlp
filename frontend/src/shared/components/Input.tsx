import { forwardRef, useId, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = "", required, ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium text-ink-secondary">
          {label}
          {required && <span className="text-semaforo-rojo"> *</span>}
        </label>

        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={
            error
              ? `border-semaforo-rojo focus:ring-semaforo-rojo ${className}`
              : className
          }
          {...rest}
        />

        {hint && !error && (
          <span id={hintId} className="text-xs text-ink-muted">
            {hint}
          </span>
        )}
        {error && (
          <span id={errorId} role="alert" className="text-xs text-semaforo-rojo">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";