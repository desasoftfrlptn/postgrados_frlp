import { Sun, Moon } from "lucide-react";
import type { MenuItem, User } from "@/shared/types/types";
import { Button } from "./Button";
import { useTheme } from "@/shared/context/useTheme";
import LogoFenix from "../../assets/LogoFenix.png";
import UtnLogo from "../../assets/UtnLogo.png"; 

export interface SidebarProps {
  user: User;
  items: MenuItem[];
  currentPath: string;
  onNavigate: (href: string) => void;
}

export function Sidebar({ user, items, currentPath, onNavigate }: SidebarProps) {
  const visibleItems = items.filter(
    (item) => !item.roles || item.roles.includes(user.rol)
  );

  const { theme, toggleTheme } = useTheme();

  return (
    <aside
      className="flex h-full w-64 shrink-0 flex-col border-r border-line bg-paper-surface text-neutral-600 transition-colors duration-300 dark:border-white/10 dark:bg-sidebar dark:text-slate-300"
      aria-label="Menú principal"
    >
      {/* Logos */}
      <div className="flex items-center justify-between border-b border-line px-4 py-4 dark:border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-50 dark:bg-sidebar-box">
            <img
              src={LogoFenix}
              alt="Logo Fénix"
              className="h-full w-full object-contain p-1"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-ink dark:text-white">
              FENIX POSGRADO
            </p>
            <p className="truncate text-[10px] leading-tight text-ink-muted dark:text-slate-400">
              SISTEMA ACADEMICO
            </p>
          </div>
        </div>

        {/* Logo UTN a la derecha */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center">
          <img
            src={UtnLogo}
            alt="Logo UTN"
            className="h-full w-full object-contain"
          />
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {visibleItems.map((item) => {
          const isActive = currentPath === item.href;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.href)}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700 dark:bg-sidebar-active dark:text-white"
                  : "text-ink-secondary hover:bg-paper-elevated hover:text-ink dark:text-slate-400 dark:hover:bg-sidebar-hover dark:hover:text-slate-200",
              ].join(" ")}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Usuario */}
      <div className="flex items-center gap-3 border-t border-line px-4 py-3 dark:border-white/10">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-sidebar-box dark:text-white">
          {user.nombre
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink dark:text-white">{user.nombre}</p>
          <p className="truncate text-xs capitalize text-ink-muted dark:text-slate-400">{user.rol}</p>
        </div>
      </div>

      {/* Toggle de tema */}
      <div className="border-t border-line px-3 py-3 dark:border-white/10">
        <Button
          icon={theme === "oscuro" ? Sun : Moon}
          variant="outline"
          className="w-full justify-start gap-3 border-line bg-transparent text-ink-secondary shadow-none transition-colors hover:bg-paper-elevated hover:text-ink dark:border-white/10 dark:text-slate-400 dark:hover:bg-sidebar-hover dark:hover:text-slate-200"
          onClick={toggleTheme}
        >
          {theme === "oscuro" ? "Modo claro" : "Modo oscuro"}
        </Button>
      </div>
    </aside>
  );
}