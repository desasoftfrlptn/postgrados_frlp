import { useState } from "react";
import VentanaEmergente from "@/shared/components/VentanaEmergente";
import { Button } from "@/shared/components/Button";
import { useObservarDocumento } from "../hooks/useDocumentos";
import { ETIQUETA_TIPO, type DocumentoConEstado } from "@/shared/types/types";

interface ObservarDocumentoModalProps {
  doc: DocumentoConEstado | null;
  legajoId: string;
  onClose: () => void;
}
type Accion = "APROBAR" | "OBSERVAR" | "MARCAR_FALTANTE";
const acciones: { value: Accion; label: string }[] = [
  { value: "APROBAR", label: "Aprobar" },
  { value: "OBSERVAR", label: "Observar" },
  { value: "MARCAR_FALTANTE", label: "Marcar faltante" },
];

export function ObservarDocumentoModal({ doc, legajoId, onClose }: ObservarDocumentoModalProps) {
  const [accion, setAccion] = useState<Accion>("OBSERVAR");
  const [motivo, setMotivo] = useState("");
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);
  const revisar = useObservarDocumento();
  function cerrar() {
    if (revisar.isPending) return;
    revisar.reset(); setMotivo(""); setErrorMotivo(null); onClose();
  }
  function guardar() {
    if (!doc || revisar.isPending) return;
    if (accion !== "APROBAR" && !motivo.trim()) {
      setErrorMotivo("Indicá qué debe corregir o volver a adjuntar el aspirante."); return;
    }
    setErrorMotivo(null);
    revisar.mutate({ legajoId, docId: doc.id, accion, motivo: accion === "APROBAR" ? undefined : motivo.trim() },
      { onSuccess: () => { revisar.reset(); onClose(); } });
  }
  return (
    <VentanaEmergente isOpen={doc !== null} onClose={cerrar} title="Revisar documento">
      {doc && <div className="space-y-4">
        <p className="text-sm text-ink">{ETIQUETA_TIPO[doc.tipo]}: {doc.nombre_original}</p>
        <label htmlFor="accion-documento" className="block text-sm text-ink">Acción</label>
        <select id="accion-documento" value={accion} disabled={revisar.isPending}
          onChange={(e) => { setAccion(e.target.value as Accion); setErrorMotivo(null); }}>
          {acciones.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        {accion !== "APROBAR" && <>
          <label htmlFor="motivo-documento" className="block text-sm text-ink">Motivo</label>
          <textarea id="motivo-documento" value={motivo} maxLength={2000} disabled={revisar.isPending}
            onChange={(e) => setMotivo(e.target.value)} rows={3} />
          <p className="text-xs text-ink-muted">Se conserva el archivo recibido y el historial de revisiones.</p>
        </>}
        {(errorMotivo || revisar.isError) && <p role="alert" className="text-sm text-semaforo-rojo">{errorMotivo ?? revisar.error?.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={cerrar} disabled={revisar.isPending}>Cancelar</Button>
          <Button onClick={guardar} isLoading={revisar.isPending}>Guardar revisión</Button>
        </div>
      </div>}
    </VentanaEmergente>
  );
}
