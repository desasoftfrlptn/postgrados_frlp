import { useRef, useState } from "react";
import {
  GraduationCap,
  Upload,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  FileUp,
} from "lucide-react";

export interface BecaState {
  solicita_beca: boolean;
  tipo_beca: 30 | 100 | null;
  archivo_beca: File | null;
}

interface SeccionBecaProps {
  disabled?: boolean;
  value: BecaState;
  onChange: (next: BecaState) => void;
  error?: Partial<Record<keyof BecaState, string>>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function SeccionBeca({
  disabled = false,
  value,
  onChange,
  error,
}: SeccionBecaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | undefined>();

  function handleToggle(checked: boolean) {
    if (disabled) return;

    setFileError(undefined);

    onChange({
      solicita_beca: checked,
      tipo_beca: checked ? value.tipo_beca : null,
      archivo_beca: checked ? value.archivo_beca : null,
    });

    if (!checked && inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleTipo(porcentaje: 30 | 100) {
    if (disabled) return;

    onChange({
      ...value,
      tipo_beca: porcentaje,
    });
  }

  function validarArchivo(file: File): boolean {
    setFileError(undefined);

    if (file.type !== "application/pdf") {
      setFileError("El archivo seleccionado no es un PDF válido.");
      return false;
    }

    if (file.size === 0) {
      setFileError("El archivo PDF está vacío.");
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError(
        "El archivo supera el tamaño máximo permitido de 5 MB.",
      );
      return false;
    }

    return true;
  }

  function procesarArchivo(file: File) {
    if (disabled) return;

    if (!validarArchivo(file)) {
      onChange({
        ...value,
        archivo_beca: null,
      });

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      return;
    }

    setFileError(undefined);

    onChange({
      ...value,
      archivo_beca: file,
    });
  }

  function handleArchivo(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (file) {
      procesarArchivo(file);
    }
  }

  function handleDragOver(
    event: React.DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault();

    if (disabled) return;

    setIsDragging(true);
  }

  function handleDragLeave(
    event: React.DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const file = event.dataTransfer.files?.[0];

    if (file) {
      procesarArchivo(file);
    }
  }

  function handleQuitarArchivo() {
    if (disabled) return;

    onChange({
      ...value,
      archivo_beca: null,
    });

    setFileError(undefined);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function formatearTamano(bytes: number) {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  const errorArchivo = fileError || error?.archivo_beca;

  return (
    <fieldset
      disabled={disabled}
      className="overflow-hidden rounded-2xl border border-line bg-paper-surface shadow-sm"
    >
      <div className="border-b border-line px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10">
              <GraduationCap
                size={20}
                className="text-brand-500"
              />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-ink">
                Solicitud de beca
              </h3>
              <p className="mt-0.5 text-xs text-ink-muted">
                Indicá si el aspirante solicita apoyo económico
                para cursar.
              </p>
            </div>
          </div>

          <div
            className={[
              "rounded-full px-2.5 py-1 text-[11px] font-medium",
              value.solicita_beca
                ? "bg-brand-500/10 text-brand-600 dark:text-brand-300"
                : "bg-paper-elevated text-ink-muted",
            ].join(" ")}
          >
            {value.solicita_beca ? "Solicitada" : "No solicitada"}
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex items-center justify-between rounded-xl border border-line bg-paper-elevated/40 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-ink">
              Solicita beca
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Activá esta opción para registrar una solicitud de beca.
            </p>
          </div>

          <label className="relative inline-flex cursor-pointer">
            <input
              type="checkbox"
              className="sr-only"
              checked={value.solicita_beca}
              onChange={(e) => handleToggle(e.target.checked)}
            />

            <div
              className={[
                "h-6 w-11 rounded-full transition-all duration-200",
                value.solicita_beca
                  ? "bg-brand-500"
                  : "bg-paper-elevated ring-1 ring-inset ring-line",
              ].join(" ")}
            />

            <div
              className={[
                "absolute left-0.5 top-0.5 h-5 w-5 rounded-full",
                "bg-white shadow-sm transition-transform duration-200",
                value.solicita_beca
                  ? "translate-x-5"
                  : "translate-x-0",
              ].join(" ")}
            />
          </label>
        </div>

        {value.solicita_beca && (
          <div className="space-y-5 border-t border-line pt-5">
            <div>
              <div className="mb-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Porcentaje solicitado{" "}
                  <span className="text-semaforo-rojo">*</span>
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  Seleccioná el porcentaje de beca que querés solicitar.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {([30, 100] as const).map((porcentaje) => {
                  const selected = value.tipo_beca === porcentaje;

                  return (
                    <button
                      key={porcentaje}
                      type="button"
                      onClick={() => handleTipo(porcentaje)}
                      className={[
                        "group relative rounded-xl border px-4 py-3.5",
                        "text-left transition-all duration-200",
                        "focus:outline-none focus:ring-2 focus:ring-brand-500/30",
                        selected
                          ? "border-brand-500 bg-brand-500/10"
                          : "border-line bg-paper-elevated/40 hover:border-brand-400 hover:bg-brand-500/5",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span
                            className={[
                              "text-lg font-bold",
                              selected
                                ? "text-brand-600 dark:text-brand-300"
                                : "text-ink",
                            ].join(" ")}
                          >
                            {porcentaje}%
                          </span>
                          <p className="mt-0.5 text-[11px] text-ink-muted">
                            de beca
                          </p>
                        </div>

                        {selected && (
                          <CheckCircle2
                            size={19}
                            className="text-brand-500"
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {error?.tipo_beca && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-semaforo-rojo">
                  <AlertCircle size={14} />
                  <span>{error.tipo_beca}</span>
                </div>
              )}
            </div>

            <div>
              <div className="mb-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Formulario de beca{" "}
                  <span className="text-semaforo-rojo">*</span>
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  Adjuntá el formulario completo en formato PDF.
                </p>
              </div>

              {value.archivo_beca ? (
                <div className="rounded-xl border border-semaforo-verde/30 bg-semaforo-verde-soft/60 p-4 dark:bg-semaforo-verde-soft-dark/30">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-semaforo-verde/10">
                      <FileText
                        size={20}
                        className="text-semaforo-verde"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink">
                          {value.archivo_beca.name}
                        </p>
                        <CheckCircle2
                          size={15}
                          className="shrink-0 text-semaforo-verde"
                        />
                      </div>

                      <p className="mt-0.5 text-xs text-ink-muted">
                        {formatearTamano(value.archivo_beca.size)} · PDF
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleQuitarArchivo}
                      className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-paper-elevated hover:text-semaforo-rojo"
                      aria-label="Quitar archivo"
                    >
                      <X size={17} />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => {
                    if (!disabled) {
                      inputRef.current?.click();
                    }
                  }}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  aria-label="Seleccionar PDF de beca"
                  aria-disabled={disabled}
                  onKeyDown={(e) => {
                    if (
                      !disabled &&
                      (e.key === "Enter" || e.key === " ")
                    ) {
                      e.preventDefault();
                      inputRef.current?.click();
                    }
                  }}
                  className={[
                    "group cursor-pointer rounded-2xl border-2 border-dashed",
                    "px-5 py-7 text-center transition-all duration-200",
                    errorArchivo
                      ? "border-semaforo-rojo/60 bg-semaforo-rojo-soft/30 dark:bg-semaforo-rojo-soft-dark/20"
                      : isDragging
                        ? "border-brand-500 bg-brand-500/10"
                        : "border-line bg-paper-elevated/30 hover:border-brand-400 hover:bg-brand-500/5",
                  ].join(" ")}
                >
                  <div className="mx-auto flex max-w-sm flex-col items-center">
                    <div
                      className={[
                        "mb-3 flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                        errorArchivo
                          ? "bg-semaforo-rojo/10"
                          : isDragging
                            ? "bg-brand-500/15"
                            : "bg-brand-500/10 group-hover:bg-brand-500/15",
                      ].join(" ")}
                    >
                      {errorArchivo ? (
                        <AlertCircle
                          size={21}
                          className="text-semaforo-rojo"
                        />
                      ) : isDragging ? (
                        <FileUp
                          size={21}
                          className="text-brand-500"
                        />
                      ) : (
                        <Upload
                          size={21}
                          className="text-brand-500"
                        />
                      )}
                    </div>

                    <p className="text-sm font-semibold text-ink">
                      {isDragging
                        ? "Soltá el archivo acá"
                        : "Subí el formulario de beca"}
                    </p>

                    <p className="mt-1 text-xs text-ink-muted">
                      Arrastrá el PDF o hacé clic para seleccionarlo
                    </p>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="rounded-md bg-paper-elevated px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                        PDF
                      </span>
                      <span className="text-[11px] text-ink-muted">
                        Máximo 5 MB
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleArchivo}
              />

              {errorArchivo && (
                <div className="mt-2 flex items-start gap-1.5 text-xs text-semaforo-rojo">
                  <AlertCircle
                    size={14}
                    className="mt-0.5 shrink-0"
                  />
                  <span>{errorArchivo}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 rounded-xl border border-brand-500/15 bg-brand-500/5 px-4 py-3">
              <GraduationCap
                size={17}
                className="mt-0.5 shrink-0 text-brand-500"
              />
              <p className="text-xs leading-relaxed text-ink-secondary">
                La solicitud quedará asociada al legajo del aspirante
                y será visible para el coordinador en su evaluación.
              </p>
            </div>
          </div>
        )}
      </div>
    </fieldset>
  );
}