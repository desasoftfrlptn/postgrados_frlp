// Componente utilizado para mostrar la información de una carrera.

import { Link } from "react-router-dom";

type Props = {
  id: number;
  tipo: string;
  nombre: string;
  descripcion: string;
};

export default function TarjetaCarrera({
  id,
  tipo,
  nombre,
  descripcion,
}: Props) {
  return (
    <article className="carrera-tarjeta">
      <section className="carrera-informacion">
        <h2>{nombre}</h2>
        <p>{descripcion}</p>
      </section>

      <section className="carrera-acciones">
        <span className={`carrera-tipo ${tipo.toLowerCase()}`}>
          {tipo}
        </span>

        <Link to={`/carreras/${id}`}>
          Ver más <span aria-hidden="true">→</span>
        </Link>
      </section>
    </article>
  );
}