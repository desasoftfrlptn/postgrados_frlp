// Página pública con la oferta de carreras de posgrado.

import { useState } from "react";
import { Link } from "react-router-dom";

import TarjetaCarrera from "../componentes/TarjetaCarrera";
import { carrerasFalsas } from "../mocks/carrerasFalsas";

import "./PaginaCarreras.css";

export default function PaginaCarreras() {
  const [filtro, setFiltro] = useState("Todas");

  const carrerasFiltradas =
    filtro === "Todas"
      ? carrerasFalsas
      : carrerasFalsas.filter((carrera) => carrera.tipo === filtro);

  return (
    <section className="carreras-fondo">
      <section className="carreras">
        <header className="carreras-encabezado">
          <h1>Carreras de Posgrado</h1>
          <p>
            Conocé nuestra oferta académica de especializaciones, maestrías y
            doctorados.
          </p>
        </header>

        <nav className="carreras-filtros" aria-label="Filtrar carreras">
          <button
            type="button"
            className={filtro === "Todas" ? "activo" : ""}
            onClick={() => setFiltro("Todas")}
          >
            Todas
          </button>

          <button
            type="button"
            className={filtro === "Especialización" ? "activo" : ""}
            onClick={() => setFiltro("Especialización")}
          >
            Especializaciones
          </button>

          <button
            type="button"
            className={filtro === "Maestría" ? "activo" : ""}
            onClick={() => setFiltro("Maestría")}
          >
            Maestrías
          </button>

          <button
            type="button"
            className={filtro === "Posgrado" ? "activo" : ""}
            onClick={() => setFiltro("Posgrado")}
          >
            Posgrados
          </button>
        </nav>

        <section className="carreras-listado">
          {carrerasFiltradas.map((carrera) => (
            <TarjetaCarrera
              key={carrera.id}
              id={carrera.id}
              tipo={carrera.tipo}
              nombre={carrera.nombre}
              descripcion={carrera.descripcion}
            />
          ))}
        </section>

        <section className="carreras-inscripcion">
          <span className="carreras-pregunta" aria-hidden="true">
            ?
          </span>

          <section>
            <strong>¿Querés inscribirte?</strong>
            <p>
              Completá el formulario de inscripción online y adjuntá la
              documentación requerida.
            </p>
          </section>

          <Link to="/inscripcion">
            <svg
              className="carreras-inscripcion-icono"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M6 2h8l4 4v16H6V2Z" />
              <path d="M14 2v5h5M9 12h6M9 16h6" />
            </svg>

            Inscribite ahora
          </Link>
        </section>
      </section>
    </section>
  );
}