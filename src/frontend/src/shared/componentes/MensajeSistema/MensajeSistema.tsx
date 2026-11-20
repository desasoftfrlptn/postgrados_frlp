
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

export default function MensajeSistema({
  tipo,
  texto,
  duracion = 5000,
  alCerrar,
}: MensajeSistemaProps) {
  // Identifica el contenido de la notificación actual.
  const clave = JSON.stringify([tipo, texto]);

  const [mensajeOculto, setMensajeOculto] =
    useState<string | null>(null);

  const visible =
    Boolean(texto) && mensajeOculto !== clave;

  // Cierra automáticamente el mensaje cuando corresponde.
  useEffect(() => {
    if (!visible || duracion <= 0) return;

    const temporizador = window.setTimeout(() => {
      setMensajeOculto(clave);
      alCerrar?.();
    }, duracion);

    return () => {
      window.clearTimeout(temporizador);
    };
  }, [clave, duracion, visible, alCerrar]);

  function cerrar() {
    if (!visible) return;

    setMensajeOculto(clave);
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
