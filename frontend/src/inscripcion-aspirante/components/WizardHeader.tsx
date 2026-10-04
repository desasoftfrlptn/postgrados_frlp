import { ArrowLeft } from "lucide-react";
import logoFenix from "../../assets/LogoFenix.png";

interface WizardHeaderProps {
  onBack?: () => void;
}

export function WizardHeader({ onBack }: WizardHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-brand-700 bg-brand-500 px-5 py-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold text-white/80 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        VOLVER
      </button>

      <img src={logoFenix} alt="Fenix Posgrado" className="h-14 w-auto" />
    </header>
  );
}