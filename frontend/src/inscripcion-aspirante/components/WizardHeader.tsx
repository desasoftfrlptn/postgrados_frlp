import { Button } from "@/shared/components/Button";

interface WizardHeaderProps {
  onBack?: () => void;
  title?: string;
}

export function WizardHeader({
  onBack,
  title = "Inscripción",
}: WizardHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-line bg-paper px-5 py-4">
      <div className="flex items-center gap-3">
        {onBack && (
          <Button type="button" variant="ghost" onClick={onBack}>
            Volver
          </Button>
        )}

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-secondary">
            Postgrado
          </p>
          <h2 className="text-base font-bold text-ink">{title}</h2>
        </div>
      </div>
    </header>
  );
}
