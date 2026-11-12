// Muestra mensajes de éxito o error en la administración pública.

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
        <p
          className="admin-home-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {mensaje && (
        <p
          className="admin-home-mensaje"
          role="status"
        >
          {mensaje}
        </p>
      )}
    </>
  );
}