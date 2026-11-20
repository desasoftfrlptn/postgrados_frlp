import MensajeSistema from "../../../../../shared/componentes/MensajeSistema/MensajeSistema";

interface MensajeHomeAdminProps {
  error?: string;
  mensaje?: string;
}

export default function MensajeHomeAdmin({
  error = "",
  mensaje = "",
}: MensajeHomeAdminProps) {
  return (
    <>
      {error && (
        <MensajeSistema
          key={`error-${error}`}
          tipo="error"
          texto={error}
        />
      )}

      {mensaje && (
        <MensajeSistema
          key={`exito-${mensaje}`}
          tipo="exito"
          texto={mensaje}
        />
      )}
    </>
  );
}
