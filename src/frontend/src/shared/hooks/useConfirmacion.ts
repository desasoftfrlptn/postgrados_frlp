import { useRef, useState } from "react";

interface AccionConfirmable {
  titulo: string;
  descripcion: string;
  ejecutar: () => void | Promise<void>;
  textoConfirmar?: string;
  peligroso?: boolean;
}

// Centraliza la confirmación y el bloqueo de operaciones ABML.
export function useConfirmacion() {
  const [accion, setAccion] =
    useState<AccionConfirmable | null>(null);

  const [procesando, setProcesando] = useState(false);

  const pendiente = useRef<AccionConfirmable | null>(null);
  const bloqueo = useRef(false);

  function solicitar(nuevaAccion: AccionConfirmable) {
    if (bloqueo.current || pendiente.current) return;

    pendiente.current = nuevaAccion;
    setAccion(nuevaAccion);
  }

  function cancelar() {
    if (bloqueo.current) return;

    pendiente.current = null;
    setAccion(null);
  }

  async function confirmar() {
    if (bloqueo.current || !pendiente.current) return;

    bloqueo.current = true;
    setProcesando(true);

    try {
      await pendiente.current.ejecutar();
    } finally {
      pendiente.current = null;
      bloqueo.current = false;
      setAccion(null);
      setProcesando(false);
    }
  }

  return {
    solicitar,
    cancelar,
    confirmar,
    procesando,
    abierto: accion !== null,
    titulo: accion?.titulo ?? "",
    descripcion: accion?.descripcion ?? "",
    textoConfirmar: accion?.textoConfirmar ?? "Confirmar",
    peligroso: accion?.peligroso ?? false,
  };
}
