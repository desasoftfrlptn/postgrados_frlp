import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/shared/context/useTheme';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'oscuro';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-1.5 rounded-full border border-line bg-paper-surface px-3 py-1.5 text-sm font-medium text-ink-secondary transition-colors hover:bg-paper-elevated"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      {isDark ? 'MODO CLARO' : 'MODO OSCURO'}
    </button>
  );
}