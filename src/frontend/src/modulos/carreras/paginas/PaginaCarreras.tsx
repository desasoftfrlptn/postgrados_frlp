
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../../shared/api/client";
import TarjetaCarrera from "../componentes/TarjetaCarrera";

import "./PaginaCarreras.css";

interface Carrera {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  duracion: string;
  activo: boolean;
}

interface ConfiguracionPublicaRespuesta {
  seccion: string;
  valores: Record<string, string>;
}

const valoresIniciales = {
  titulo: "Carreras de Posgrado",
  descripcion:
    "Conocé nuestra oferta académica de especializaciones, maestrías y doctorados.",
  inscripcion_titulo: "¿Querés inscribirte?",
  inscripcion_descripcion:
    "Completá el formulario de inscripción online y adjuntá la documentación requerida.",
  inscripcion_boton: "Inscribite ahora",
};

const categorias = [
  { valor: "Todas", nombre: "Todas" },
  {
    valor: "Especializacion",
    nombre: "Especializaciones",
  },
  { valor: "Maestria", nombre: "Maestrías" },
  { valor: "Doctorado", nombre: "Doctorados" },
];

function mostrarTipo(tipo: string) {
  if (tipo === "Especializacion") {
    return "Especialización";
  }

  if (tipo === "Maestria") {
    return "Maestría";
  }

  if (tipo === "Doctorado") {
    return "Doctorado";
  }

  return tipo;
}

export default function PaginaCarreras() {
  const [carreras, setCarreras] =
    useState<Carrera[]>([]);

  const [configuracion, setConfiguracion] =
    useState(valoresIniciales);

  const [filtro, setFiltro] =
    useState("Todas");

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let activo = true;

    const cargarCarreras = async () => {
      try {
        const respuesta =
          await api.get<Carrera[]>("/carreras");

        if (!activo) return;

        setCarreras(
          respuesta.filter((carrera) => carrera.activo)
        );
        setError("");
      } catch {
        if (activo) {
          setError(
            "No se pudieron cargar las carreras."
          );
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    };

    void cargarCarreras();

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    let activo = true;

    const cargarConfiguracion = async () => {
      try {
        const respuesta =
          await api.get<ConfiguracionPublicaRespuesta>(
            "/configuracion-publica/carreras"
          );

        if (!activo) return;

        setConfiguracion({
          ...valoresIniciales,
          ...respuesta.valores,
        });
      } catch {
        // Si la configuración no está disponible,
        // se mantienen los textos predeterminados.
      }
    };

    void cargarConfiguracion();

    return () => {
      activo = false;
    };
  }, []);

  const carrerasFiltradas = carreras.filter(
    (carrera) =>
      filtro === "Todas" ||
      carrera.tipo === filtro
  );

  return (
    <section className="carreras-fondo">
      <section className="carreras">
        <header className="carreras-encabezado">
          <h1>{configuracion.titulo}</h1>

          <p>{configuracion.descripcion}</p>
        </header>

        <nav
          className="carreras-filtros"
          aria-label="Filtrar carreras"
        >
          {categorias.map((categoria) => (
            <button
              key={categoria.valor}
              type="button"
              className={
                filtro === categoria.valor
                  ? "activo"
                  : ""
              }
              aria-pressed={
                filtro === categoria.valor
              }
              onClick={() =>
                setFiltro(categoria.valor)
              }
            >
              {categoria.nombre}
            </button>
          ))}
        </nav>

        {cargando && (
          <p role="status">
            Cargando carreras...
          </p>
        )}

        {error && (
          <p role="alert">{error}</p>
        )}

        {!cargando && !error && (
          <section className="carreras-listado">
            {carrerasFiltradas.length === 0 ? (
              <p>
                No hay carreras disponibles
                en esta categoría.
              </p>
            ) : (
              carrerasFiltradas.map((carrera) => (
                <TarjetaCarrera
                  key={carrera.id}
                  id={carrera.id}
                  tipo={mostrarTipo(carrera.tipo)}
                  nombre={carrera.nombre}
                  descripcion={carrera.descripcion}
                />
              ))
            )}
          </section>
        )}

        <section className="carreras-inscripcion">
          <span
            className="carreras-pregunta"
            aria-hidden="true"
          >
            ?
          </span>

          <section>
            <strong>
              {configuracion.inscripcion_titulo}
            </strong>

            <p>
              {configuracion.inscripcion_descripcion}
            </p>
          </section>

          <Link to="/inscripcion">
            {configuracion.inscripcion_boton}
          </Link>
        </section>
      </section>
    </section>
  );
}
