import { useId } from "react";

export type EstadoFiltro = "todos" | "activos" | "inactivos";

interface Props {
  valor: EstadoFiltro;
  alCambiar: (valor: EstadoFiltro) => void;
  etiqueta?: string;
  textoActivo?: string;
  textoInactivo?: string;
}

export default function FiltroEstado({
  valor,
  alCambiar,
  etiqueta = "Estado",
  textoActivo = "Activos",
  textoInactivo = "Inactivos",
}: Props) {
  const id = useId();

  return (
    <div className="admin-filtro-campo">
      <label htmlFor={id}>{etiqueta}</label>
      <select
        id={id}
        value={valor}
        onChange={(event) =>
          alCambiar(event.target.value as EstadoFiltro)
        }
      >
        <option value="todos">Todos</option>
        <option value="activos">{textoActivo}</option>
        <option value="inactivos">{textoInactivo}</option>
      </select>
    </div>
  );
}

