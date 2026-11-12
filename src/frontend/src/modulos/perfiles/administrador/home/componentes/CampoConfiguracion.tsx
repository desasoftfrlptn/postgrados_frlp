// Renderiza un campo editable de configuración pública.

interface CampoConfiguracionProps {
  id: string;
  etiqueta: string;
  valor: string;
  multilinea?: boolean;
  tipo?: "text" | "email" | "number";
  alCambiar: (
    valor: string
  ) => void;
}


export default function CampoConfiguracion({
  id,
  etiqueta,
  valor,
  multilinea = false,
  tipo = "text",
  alCambiar,
}: CampoConfiguracionProps) {
  return (
    <div className="admin-home-campo">
      <label htmlFor={id}>
        {etiqueta}
      </label>

      {multilinea ? (
        <textarea
          id={id}
          rows={4}
          required
          value={valor}
          onChange={(event) =>
            alCambiar(
              event.target.value
            )
          }
        />
      ) : (
        <input
          id={id}
          type={tipo}
          required
          value={valor}
          onChange={(event) =>
            alCambiar(
              event.target.value
            )
          }
        />
      )}
    </div>
  );
}