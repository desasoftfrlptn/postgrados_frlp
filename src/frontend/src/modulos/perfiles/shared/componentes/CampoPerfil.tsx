interface CampoPerfilProps {
  etiqueta: string;
  valor: string;
  editando: boolean;
  tipo?: string;
  onChange: (valor: string) => void;
}

export default function CampoPerfil({
  etiqueta,
  valor,
  editando,
  tipo = "text",
  onChange,
}: CampoPerfilProps) {
  const id = `campo-${etiqueta
    .toLowerCase()
    .replaceAll(" ", "-")}`;

  return (
    <div className="mi-perfil-campo">
      <label htmlFor={id}>
        {etiqueta}
      </label>

      {editando ? (
        <input
          id={id}
          type={tipo}
          value={valor}
          onChange={(event) =>
            onChange(event.target.value)
          }
        />
      ) : (
        <p>{valor}</p>
      )}
    </div>
  );
}