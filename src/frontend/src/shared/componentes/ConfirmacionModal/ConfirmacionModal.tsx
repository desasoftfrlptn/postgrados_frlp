import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import "./ConfirmacionModal.css";

interface ConfirmacionModalProps {
  abierto: boolean;
  titulo: string;
  descripcion: string;
  alConfirmar: () => void | Promise<void>;
  alCancelar: () => void;
  textoConfirmar?: string;
  textoCancelar?: string;
  confirmando?: boolean;
  peligroso?: boolean;
}

export default function ConfirmacionModal(props: ConfirmacionModalProps) {
  return props.abierto ? <ConfirmacionContenido {...props} /> : null;
}

function ConfirmacionContenido({
  abierto,
  titulo,
  descripcion,
  alConfirmar,
  alCancelar,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  confirmando = false,
  peligroso = false,
}: ConfirmacionModalProps) {
  const id = useId();

  const dialogoRef = useRef<HTMLDivElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const bloqueoRef = useRef(false);

  const [procesando, setProcesando] = useState(false);
  const [errorOperacion, setErrorOperacion] = useState("");

  const ocupado = procesando || confirmando;

  // Coloca el foco en Cancelar al abrir el modal.
  // Devuelve el foco al control anterior al cerrarlo.
  useEffect(() => {
    if (!abierto) return;

    const focoAnterior = document.activeElement;

    cancelarRef.current?.focus();

    return () => {
      if (focoAnterior instanceof HTMLElement) {
        focoAnterior.focus();
      }
    };
  }, [abierto]);

  // Durante el procesamiento, los botones se deshabilitan.
  // El diálogo conserva el foco hasta que vuelva a estar disponible.
  useEffect(() => {
    if (ocupado) dialogoRef.current?.focus();
    else if (document.activeElement === dialogoRef.current) {
      cancelarRef.current?.focus();
    }
  }, [ocupado]);

  // Mantiene la navegación por teclado dentro del modal.
  useEffect(() => {
    if (!abierto) return;

    function manejarTeclado(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();

        if (!ocupado) {
          alCancelar();
        }

        return;
      }

      if (evento.key !== "Tab") return;

      const botones = Array.from(
        dialogoRef.current?.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)"
        ) ?? []
      );

      if (botones.length === 0) {
        evento.preventDefault();
        return;
      }

      const primero = botones[0];
      const ultimo = botones[botones.length - 1];

      if (
        evento.shiftKey &&
        (document.activeElement === primero || !botones.includes(document.activeElement as HTMLButtonElement))
      ) {
        evento.preventDefault();
        ultimo.focus();
      } else if (
        !evento.shiftKey &&
        (document.activeElement === ultimo || !botones.includes(document.activeElement as HTMLButtonElement))
      ) {
        evento.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", manejarTeclado);

    return () => {
      document.removeEventListener("keydown", manejarTeclado);
    };
  }, [abierto, ocupado, alCancelar]);

  async function confirmar() {
    if (!abierto || ocupado || bloqueoRef.current) {
      return;
    }

    bloqueoRef.current = true;
    setProcesando(true);
    setErrorOperacion("");

    try {
      await alConfirmar();
    } catch {
      setErrorOperacion(
        "No se pudo completar la operación. Intentá nuevamente."
      );
    } finally {
      bloqueoRef.current = false;
      setProcesando(false);
    }
  }

  if (!abierto) return null;

  return (
    <div className="confirmacion-modal__fondo">
      <div
        ref={dialogoRef}
        className="confirmacion-modal"
        role="alertdialog"
        tabIndex={-1}
        aria-busy={ocupado}
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-descripcion`}
      >
        <h2 id={`${id}-titulo`}>
          {titulo}
        </h2>

        <p id={`${id}-descripcion`}>
          {descripcion}
        </p>

        {errorOperacion && (
          <p
            className="confirmacion-modal__error"
            role="alert"
          >
            {errorOperacion}
          </p>
        )}

        <div className="confirmacion-modal__acciones">
          <button
            ref={cancelarRef}
            type="button"
            className="confirmacion-modal__cancelar"
            onClick={alCancelar}
            disabled={ocupado}
          >
            {textoCancelar}
          </button>

          <button
            type="button"
            className={
              peligroso
                ? "confirmacion-modal__confirmar confirmacion-modal__confirmar--peligro"
                : "confirmacion-modal__confirmar"
            }
            onClick={() => void confirmar()}
            disabled={ocupado}
          >
            {ocupado
              ? "Procesando..."
              : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
