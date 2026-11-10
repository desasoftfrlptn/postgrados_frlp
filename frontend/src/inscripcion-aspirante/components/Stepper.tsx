export type Step = {
  id: "personales" | "academicos" | "documentos" | "confirmar";
  label: string;
};

interface StepperProps {
  steps: Step[];
  currentStep: number;
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <nav className="border-b border-line bg-paper px-5 py-3" aria-label="Progreso del formulario">
      <ol className="flex flex-wrap items-center gap-2">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isComplete = index < currentStep;

          return (
            <li key={step.id} className="flex items-center gap-2">
              <span
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                  isActive
                    ? "bg-brand-500 text-white"
                    : isComplete
                      ? "bg-emerald-500 text-white"
                      : "bg-paper-elevated text-ink-secondary",
                ].join(" ")}
              >
                {index + 1}
              </span>

              <span
                className={[
                  "text-sm",
                  isActive ? "font-semibold text-ink" : "text-ink-secondary",
                ].join(" ")}
              >
                {step.label}
              </span>

              {index < steps.length - 1 && (
                <span className="text-ink-secondary">/</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
