import type { Legajo } from "@/shared/types/types";
import { Eye } from "lucide-react";
import { Button } from "@/shared/components/Button";

interface InscriptoProps {
  inscripto: Legajo;
  docs: number;
}

const DOCS_TOTAL = 5;

function estadoDocumentacion(docs: number): {
  label: string;
  barClassName: string;
  textClassName: string;
} {
  if (docs >= DOCS_TOTAL) {
    return {
      label: "Inscripto",
      barClassName: "bg-semaforo-verde",
      textClassName: "text-semaforo-verde",
    };
  }
  if (docs >= 3) {
    return {
      label: "Pendiente",
      barClassName: "bg-semaforo-amarillo",
      textClassName: "text-semaforo-amarillo",
    };
  }
  return {
    label: "Sin documentos",
    barClassName: "bg-semaforo-rojo",
    textClassName: "text-semaforo-rojo",
  };
}

function Inscripto({ inscripto, docs }: InscriptoProps) {
  const { label, barClassName, textClassName } = estadoDocumentacion(docs);
  const progreso = Math.min(100, Math.round((docs / DOCS_TOTAL) * 100));

  return (
    <li className="grid grid-cols-[1.6fr_1fr_1fr_1.2fr_1fr_auto] items-center gap-4 px-4 py-3 text-sm transition-colors hover:bg-paper-elevated/60">
      <p className="truncate font-medium text-ink">
        {inscripto.apellido}, {inscripto.nombre}
      </p>
      <p className="text-ink-secondary">{inscripto.dni}</p>
      <p className="truncate text-ink-secondary">{inscripto.tipo_carrera}</p>

      <div className="flex items-center gap-2">
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-paper-elevated">
          <div
            className={`h-full rounded-full ${barClassName}`}
            style={{ width: `${progreso}%` }}
          />
        </div>
        <span className="shrink-0 text-xs text-ink-muted">
          {docs}/{DOCS_TOTAL}
        </span>
      </div>

      <span className={`text-xs font-semibold ${textClassName}`}>{label}</span>

      <Button icon={Eye} variant="ghost" className="justify-self-end">
        Ver legajo
      </Button>
    </li>
  );
}

export default Inscripto;