import { useState } from "react";
import VentanaEmergente from "@/shared/components/VentanaEmergente";
import { Button } from "@/shared/components/Button";
import { useObservarDocumento } from "../hooks/useDocumentos";
import type { DocumentoConEstado, EstadoLegajo } from "@/shared/types/types";
import { ETIQUETA_TIPO } from "@/shared/types/types";
import { useActualizarEstado } from "@/shared/hooks/useEstado";

type Accion = "OBSERVAR" | "MARCAR_FALTANTE";

interface ObservarDocumentoModalProps {
  doc: DocumentoConEstado | null;
  legajoId: string;
  onClose: () => void;
}

export function ObservarDocumentoModal({
  doc,
  legajoId,
  onClose,
}: ObservarDocumentoModalProps) {
  const [accion, setAccion] = useState<Accion>("OBSERVAR");
  const [motivo, setMotivo] = useState("");
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);

  const observar = useObservarDocumento();
  const { mutate: actualizarLegajo, isPending } = useActualizarEstado();

  function handleCerrar() {
    setAccion("OBSERVAR");
    setMotivo("");
    setErrorMotivo(null);
    observar.reset();
    onClose();
  }

  function handleGuardar() {
    if (!doc) return;

    if (motivo.trim().length === 0) {
      setErrorMotivo("Contale al aspirante qué tiene que corregir.");
      return;
    }
    setErrorMotivo(null);

    observar.mutate(
      { legajoId, docId: doc.id, accion, motivo: motivo.trim() },
      {
        onSuccess: () =>
          actualizarLegajo(
            { id: legajoId, estado: "OBSERVADO" as EstadoLegajo },
            { onSuccess: handleCerrar },
          ),
      },
    );
  }

  return (
    <VentanaEmergente
      isOpen={doc !== null}
      onClose={handleCerrar}
      title="Observar documento"
    >
      {doc && (
        <div className="space-y-4">
          <p className="text-sm text-ink-secondary">
            Documento:{" "}
            <span className="font-medium text-ink">
              {ETIQUETA_TIPO[doc.tipo]}
            </span>
          </p>

          {/* Selección de acción */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={accion === "OBSERVAR" ? "primary" : "outline"}
              className="flex-1"
              onClick={() => setAccion("OBSERVAR")}
            >
              Observar
            </Button>
            <Button
              type="button"
              variant={accion === "MARCAR_FALTANTE" ? "danger" : "outline"}
              className="flex-1"
              onClick={() => setAccion("MARCAR_FALTANTE")}
            >
              Marcar faltante
            </Button>
          </div>
          <p className="text-xs text-ink-muted">
            {accion === "OBSERVAR"
              ? "El documento queda guardado, pero el aspirante va a ver que tiene que corregirlo."
              : "El documento se invalida por completo — el aspirante lo va a ver como no subido y tiene que volver a adjuntarlo."}
          </p>

          {/* Texto de observación */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="motivo-observacion"
              className="text-sm font-medium text-ink-secondary"
            >
              Texto de observación
            </label>
            <textarea
              id="motivo-observacion"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: falta el reverso legalizado del título."
              aria-invalid={Boolean(errorMotivo)}
            />
            {errorMotivo && (
              <span role="alert" className="text-xs text-semaforo-rojo">
                {errorMotivo}
              </span>
            )}
          </div>

          {observar.isError && (
            <p role="alert" className="text-sm text-semaforo-rojo">
              No se pudo guardar: {(observar.error as Error).message}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={handleCerrar}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleGuardar}
              isLoading={observar.isPending || isPending}
            >
              Guardar
            </Button>
          </div>
        </div>
      )}
    </VentanaEmergente>
  );
}
