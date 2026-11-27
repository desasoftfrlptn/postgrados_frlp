
interface CampoConfiguracionProps {
  id: string;
  etiqueta: string;
  valor: string;
  multilinea?: boolean;
  tipo?: "text" | "email" | "number";
  obligatorio?: boolean;
  deshabilitado?: boolean;
  error?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  alCambiar: (valor: string) => void;
}

export default function CampoConfiguracion({
  id,
  etiqueta,
  valor,
  multilinea = false,
  tipo = "text",
  obligatorio = true,
  deshabilitado = false,
  error = "",
  maxLength,
  min,
  max,
  alCambiar,
}: CampoConfiguracionProps) {
  const idError = `${id}-error`;
  const tieneError = Boolean(error);

  const propiedadesComunes = {
    id,
    name: id,
    required: obligatorio,
    disabled: deshabilitado,
    value: valor,
    "aria-invalid": tieneError,
    "aria-describedby": tieneError
      ? idError
      : undefined,
  };

  return (
    <div className="admin-home-campo">
      <label htmlFor={id}>
        {etiqueta}
        {obligatorio && (
          <span aria-hidden="true"> *</span>
        )}
      </label>

      {multilinea ? (
        <textarea
          {...propiedadesComunes}
          rows={4}
          maxLength={maxLength}
          onChange={(event) =>
            alCambiar(event.target.value)
          }
        />
      ) : (
        <input
          {...propiedadesComunes}
          type={tipo}
          maxLength={maxLength}
          min={tipo === "number" ? min : undefined}
          max={tipo === "number" ? max : undefined}
          onChange={(event) =>
            alCambiar(event.target.value)
          }
        />
      )}

      {tieneError && (
        <p
          id={idError}
          className="admin-home-campo-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}
