import { SearchX } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/Button";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center text-ink transition-colors">
      {/* Marca */}
      <div className="mb-10 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-brand-500" />
        <span className="text-xs font-semibold tracking-[0.3em] text-ink-muted">
          FÉNIX POSGRADO
        </span>
      </div>

      {/* Icono */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-white/5">
        <SearchX className="h-8 w-8 text-brand-500" aria-hidden="true" />
      </div>

      {/* Código de error */}
      <p className="text-6xl font-extrabold tracking-tight text-brand-500 sm:text-7xl">
        404
      </p>

      <h1 className="mt-3 text-xl font-bold text-ink">Página no encontrada</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-secondary">
        La página que buscás no existe, se movió, o no tenés acceso a ella.
        Revisá la URL o volvé al inicio.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => navigate(-1)} variant="outline">
          Volver atrás
        </Button>
        <Link to="/">
          <Button variant="primary">Ir al inicio</Button>
        </Link>
      </div>
    </div>
  );
}