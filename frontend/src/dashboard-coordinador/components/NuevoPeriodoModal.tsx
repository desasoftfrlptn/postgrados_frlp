import { useState } from "react";
import VentanaEmergente from "@/shared/components/VentanaEmergente";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";

interface NuevoPeriodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardar: (datos: { fecha_abre: string; fecha_cierra: string | null }) => void;
  isGuardando: boolean;
  error?: string;
}

export function NuevoPeriodoModal({
  isOpen,
  onClose,
  onGuardar,
  isGuardando,
  error,
}: NuevoPeriodoModalProps) {
  const [fechaAbre, setFechaAbre] = useState("");
  const [fechaCierra, setFechaCierra] = useState("");
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  function handleCerrar() {
    setFechaAbre("");
    setFechaCierra("");
    setErrorValidacion(null);
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!fechaAbre) {
      setErrorValidacion("La fecha de apertura es obligatoria.");
      return;
    }
    if (fechaCierra && fechaCierra < fechaAbre) {
      setErrorValidacion("La fecha de cierre no puede ser anterior a la de apertura.");
      return;
    }
    setErrorValidacion(null);

    onGuardar({ fecha_abre: fechaAbre, fecha_cierra: fechaCierra || null });
  }

  return (
    <VentanaEmergente isOpen={isOpen} onClose={handleCerrar} title="Configurar nuevo período">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Fecha de apertura"
          type="date"
          value={fechaAbre}
          onChange={(e) => setFechaAbre(e.target.value)}
          required
        />
        <Input
          label="Fecha de cierre"
          type="date"
          value={fechaCierra}
          onChange={(e) => setFechaCierra(e.target.value)}
          hint="Opcional — dejalo en blanco para un período sin fecha de cierre definida."
        />

        {(errorValidacion || error) && (
          <p role="alert" className="text-xs text-semaforo-rojo">
            {errorValidacion ?? error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleCerrar}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isGuardando}>
            Guardar
          </Button>
        </div>
      </form>
    </VentanaEmergente>
  );
}