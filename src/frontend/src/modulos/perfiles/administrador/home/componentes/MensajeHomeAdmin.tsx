import MensajeSistema from "../../../../../shared/componentes/MensajeSistema/MensajeSistema";

interface MensajeHomeAdminProps {
  error?: string;
  mensaje?: string;
  alCerrarError?: () => void;
  alCerrarMensaje?: () => void;
}

// Unifica los mensajes de la administración del sitio público.
export default function MensajeHomeAdmin({
  error = "",
  mensaje = "",
  alCerrarError,
  alCerrarMensaje,
}: MensajeHomeAdminProps) {
  return (
    <>
      {error && (
        <MensajeSistema
          key={`error-${error}`}
          tipo="error"
          texto={error}
          alCerrar={alCerrarError}
        />
      )}

      {mensaje && (
        <MensajeSistema
          key={`exito-${mensaje}`}
          tipo="exito"
          texto={mensaje}
          alCerrar={alCerrarMensaje}
        />
      )}
    </>
  );
}
