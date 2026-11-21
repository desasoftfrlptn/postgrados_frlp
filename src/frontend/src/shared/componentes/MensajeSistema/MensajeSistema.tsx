import { useEffect, useState } from "react";
import "./MensajeSistema.css";

export type TipoMensaje =
  | "exito"
  | "error"
  | "advertencia"
  | "informacion";

interface MensajeSistemaProps {
  tipo: TipoMensaje;
  texto: string;
  duracion?: number;
  alCerrar?: () => void;
}

const iconos: Record<TipoMensaje, string> = {
  exito: "✓",
  error: "!",
  advertencia: "!",
  informacion: "i",
};

export default function MensajeSistema(props: MensajeSistemaProps) {
  if (!props.texto.trim()) return null;

  return (
    <MensajeContenido
      key={JSON.stringify([props.tipo, props.texto])}
      {...props}
    />
  );
}

function MensajeContenido({
  tipo,
  texto,
  duracion = tipo === "error" ? 0 : 5000,
  alCerrar,
}: MensajeSistemaProps) {
  const [visible, setVisible] = useState(true);

  // Cierra automáticamente el mensaje cuando corresponde.
  useEffect(() => {
    if (!visible || duracion <= 0) return;

    const temporizador = window.setTimeout(() => {
      setVisible(false);
      alCerrar?.();
    }, duracion);

    return () => {
      window.clearTimeout(temporizador);
    };
  }, [duracion, visible, alCerrar]);

  function cerrar() {
    if (!visible) return;

    setVisible(false);
    alCerrar?.();
  }

  if (!visible) return null;

  return (
    <div
      className={`mensaje-sistema mensaje-sistema--${tipo}`}
      role={tipo === "error" ? "alert" : "status"}
    >
      <span
        className="mensaje-sistema__icono"
        aria-hidden="true"
      >
        {iconos[tipo]}
      </span>

      <p className="mensaje-sistema__texto">
        {texto}
      </p>

      <button
        type="button"
        className="mensaje-sistema__cerrar"
        onClick={cerrar}
        aria-label="Cerrar notificación"
      >
        ×
      </button>
    </div>
  );
}
