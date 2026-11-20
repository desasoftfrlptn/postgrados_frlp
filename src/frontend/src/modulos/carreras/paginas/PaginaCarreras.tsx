
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

const categorias = [
  { valor: "Todas", nombre: "Todas" },
  { valor: "Especializacion", nombre: "Especializaciones" },
  { valor: "Maestria", nombre: "Maestrías" },
  { valor: "Doctorado", nombre: "Doctorados" },
];

function mostrarTipo(tipo: string) {
  if (tipo === "Especializacion") return "Especialización";
  if (tipo === "Maestria") return "Maestría";
  if (tipo === "Doctorado") return "Doctorado";
  return tipo;
}

export default function PaginaCarreras() {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [filtro, setFiltro] = useState("Todas");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Obtener las carreras desde el Backend.
  useEffect(() => {
    let activo = true;

    async function cargarCarreras() {
      try {
        const resultado = await api.get<Carrera[]>("/carreras");
        if (activo) setCarreras(resultado.filter((c) => c.activo));
      } catch {
        if (activo) setError("No se pudieron cargar las carreras.");
      } finally {
        if (activo) setCargando(false);
      }
    }

    void cargarCarreras();
    return () => { activo = false; };
  }, []);

  // Filtrar las carreras por categoría.
  const carrerasFiltradas = carreras.filter(
    (carrera) => filtro === "Todas" || carrera.tipo === filtro
  );

  return (
    <section className="carreras-fondo">
      <section className="carreras">
        <header className="carreras-encabezado">
          <h1>Carreras de Posgrado</h1>
          <p>
            Conocé nuestra oferta académica de especializaciones,
            maestrías y doctorados.
          </p>
        </header>

        <nav className="carreras-filtros" aria-label="Filtrar carreras">
          {categorias.map((categoria) => (
            <button
              key={categoria.valor}
              type="button"
              className={filtro === categoria.valor ? "activo" : ""}
              aria-pressed={filtro === categoria.valor}
              onClick={() => setFiltro(categoria.valor)}
            >
              {categoria.nombre}
            </button>
          ))}
        </nav>

        {cargando && <p role="status">Cargando carreras...</p>}
        {error && <p role="alert">{error}</p>}

        {!cargando && !error && (
          <section className="carreras-listado">
            {carrerasFiltradas.length === 0 ? (
              <p>No hay carreras disponibles en esta categoría.</p>
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
          <span className="carreras-pregunta" aria-hidden="true">?</span>

          <section>
            <strong>¿Querés inscribirte?</strong>
            <p>
              Completá el formulario de inscripción online y adjuntá
              la documentación requerida.
            </p>
          </section>

          <Link to="/inscripcion">
            Inscribite ahora
          </Link>
        </section>
      </section>
    </section>
  );
}
