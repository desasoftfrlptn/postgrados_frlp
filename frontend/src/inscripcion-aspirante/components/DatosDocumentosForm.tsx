import { useRef, useState } from "react";
import { Upload, Check } from "lucide-react";
import {
  DOCUMENTOS_REQUERIDOS,
  type DatosDocumentos,
  type DocumentoRequerido,
} from "../../shared/types/types.ts";

interface DatosDocumentosFormProps {
  initialData: DatosDocumentos;
  isSubmitting?: boolean;
  onNext: (data: DatosDocumentos) => void;
  onSaveDraft?: (data: DatosDocumentos) => void;
}

function EstadoBadge({
  archivo,
  opcional,
}: {
  archivo: File | undefined;
  opcional?: boolean;
}) {
  if (archivo) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-semaforo-verde-soft px-2.5 py-1 text-xs font-semibold text-semaforo-verde">
        Cargado <Check className="h-3 w-3" aria-hidden="true" />
      </span>
    );
  }

  if (opcional) {
    return (
      <span className="text-xs font-medium text-ink-muted">No aplica</span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-semaforo-amarillo-soft px-2.5 py-1 text-xs font-semibold text-semaforo-amarillo">
      Pendiente
    </span>
  );
}

function DocumentoRow({
  documento,
  archivo,
  onSelectFile,
  disabled,
}: {
  documento: DocumentoRequerido;
  archivo: File | undefined;
  onSelectFile: (file: File | undefined) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? undefined;
    onSelectFile(file);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="flex w-full items-center justify-between border-b border-line px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-paper-surface disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-ink">{documento.label}</span>
        {archivo && (
          <span className="truncate text-xs text-ink-muted">
            {archivo.name}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <EstadoBadge archivo={archivo} opcional={documento.opcional} />
        <Upload className="h-4 w-4 text-ink-muted" aria-hidden="true" />
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleChange}
      />
    </button>
  );
}

export function DatosDocumentosForm({
  initialData,
  isSubmitting = false,
  onNext,
  onSaveDraft,
}: DatosDocumentosFormProps) {
  const [documentos, setDocumentos] = useState<DatosDocumentos>(initialData);
  const [error, setError] = useState<string | undefined>(undefined);

  const handleSelectFile = (id: string, file: File | undefined) => {
    setDocumentos((prev) => ({ ...prev, [id]: file }));
    setError(undefined);
  };

  const faltantes = DOCUMENTOS_REQUERIDOS.filter(
    (doc) => !doc.opcional && !documentos[doc.id]
  );
  if (faltantes.length > 0) {
    console.log("Faltan documentos:", faltantes);
    return;
  }
  
const handleSubmit = () => {
  onNext(documentos);
};

  const handleSaveDraft = () => {
    onSaveDraft?.(documentos);
  };

  return (
    <div className="flex flex-col gap-4 px-5 pb-8">
      <div className="overflow-hidden rounded-xl border border-line bg-paper">
        <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">
          Documentos requeridos
        </h2>

        {DOCUMENTOS_REQUERIDOS.map((documento) => (
          <DocumentoRow
            key={documento.id}
            documento={documento}
            archivo={documentos[documento.id]}
            disabled={isSubmitting}
            onSelectFile={(file) => handleSelectFile(documento.id, file)}
          />
        ))}

        <div className="flex items-center justify-between px-4 py-3.5">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            className="text-sm font-semibold text-ink-secondary transition-colors hover:text-ink disabled:opacity-50"
          >
            Guardar borrador
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-lg bg-ink px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-ink/90 disabled:opacity-50"
          >
            {isSubmitting ? "GUARDANDO..." : "Siguiente"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm font-medium text-semaforo-rojo">{error}</p>
      )}
    </div>
  );
}