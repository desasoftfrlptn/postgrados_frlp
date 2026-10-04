import { Check } from "lucide-react";

export interface Step {
  id: string;
  label: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number; // índice 0-based
}

export function Stepper({ steps, currentStep }: StepperProps) {
  const progress =
    steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 0;

  return (
    <div className="px-5 pb-5 pt-4">
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium">
        {steps.map((step, index) => {
          const isDone = index < currentStep;
          const isActive = index === currentStep;
          return (
            <li key={step.id} className="flex items-center gap-1.5">
              <span
                className={[
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                  isDone || isActive
                    ? "bg-brand-500 text-white"
                    : "bg-paper-elevated text-ink-muted",
                ].join(" ")}
              >
                {isDone ? (
                  <Check className="h-3 w-3" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              <span className={isActive ? "text-ink" : "text-ink-muted"}>
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 h-1 w-full rounded-full bg-paper-elevated">
        <div
          className="h-1 rounded-full bg-brand-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
