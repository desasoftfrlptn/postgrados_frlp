import { ArrowLeft } from 'lucide-react';
import LogoFenix from '../../assets/LogoFenix.png';
import ThemeToggle from '../../shared/components/ThemeToggle';

interface HeaderProps {
  onBack?: () => void;
  hideLogoOnDesktop?: boolean;
}

export default function Header({ onBack, hideLogoOnDesktop = false }: HeaderProps) {
  return (
    <header className="flex flex-col items-center px-6 pt-6 pb-4">
      <div className="flex w-full items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-full border border-line bg-paper-surface px-3 py-1.5 text-sm font-medium text-ink-secondary transition-colors hover:bg-paper-elevated"
        >
          <ArrowLeft size={16} />
          Salir
        </button>

        <ThemeToggle />
      </div>

      <div
        className={`mt-3 flex w-full flex-col items-center ${
          hideLogoOnDesktop ? 'md:hidden' : ''
        }`}
      >
        <img
          src={LogoFenix}
          alt=""
          className="h-12 w-auto object-contain md:h-16"
        />

        <div className="mt-1 flex w-full items-center justify-center gap-3">
          <span className="h-px max-w-12 flex-1 bg-gradient-to-r from-transparent to-brand-500 md:max-w-16" />
          <div className="flex flex-col items-center">
            
          </div>
        </div>
      </div>
    </header>
  );
}