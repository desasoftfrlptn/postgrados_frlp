
import { useEffect, useState } from "react";

import { api, obtenerUrlArchivo } from "../../../shared/api/client";
import TarjetaNoticia from "../componentes/tarjetasNoticias";
import BarraLateral from "../componentes/BarraLateral";
import imagenHero from "../../../imagenes/hero-home.webp";

import "./PaginaNoticias.css";

interface Noticia {
  id: string;
  titulo: string;
  categoria: string;
  resumen: string;
  contenido: string;
  fecha: string;
  imagen_url: string | null;
  activo: boolean;
}

export default function PaginaNoticias() {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Cargar las noticias publicadas.
  useEffect(() => {
    let activo = true;

    async function cargarNoticias() {
      try {
        const resultado = await api.get<Noticia[]>("/noticias/publicas");
        if (activo) setNoticias(resultado);
      } catch {
        if (activo) setError("No se pudieron cargar las noticias.");
      } finally {
        if (activo) setCargando(false);
      }
    }

    void cargarNoticias();
    return () => { activo = false; };
  }, []);

  // Buscar y filtrar las noticias.
  const categorias = [...new Set(
    noticias.map((noticia) => noticia.categoria)
  )].sort();

  const textoBusqueda = busqueda.trim().toLowerCase();

  const noticiasFiltradas = noticias.filter((noticia) => {
    const coincideCategoria =
      categoria === "Todas" || noticia.categoria === categoria;

    const coincideBusqueda =
      noticia.titulo.toLowerCase().includes(textoBusqueda) ||
      noticia.resumen.toLowerCase().includes(textoBusqueda);

    return coincideCategoria && coincideBusqueda;
  });

  return (
    <>
      <section
        className="noticias-hero"
        style={{ backgroundImage: `url(${imagenHero})` }}
        aria-labelledby="noticias-titulo"
      >
        <section className="noticias-hero-contenido">
          <h1 id="noticias-titulo">Noticias</h1>
          <p>
            Enterate de las últimas novedades y comunicados de la facultad.
          </p>
        </section>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12 flex flex-col md:flex-row gap-8">
        <section className="md:w-2/3">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 border-b pb-2">
            Últimas Noticias
          </h2>

          {cargando && <p role="status">Cargando noticias...</p>}
          {error && <p role="alert">{error}</p>}

          {!cargando && !error && (
            <section>
              {noticiasFiltradas.map((noticia) => (
                <TarjetaNoticia
                  key={noticia.id}
                  categoria={noticia.categoria}
                  titulo={noticia.titulo}
                  resumen={noticia.resumen}
                  contenido={noticia.contenido}
                  fecha={noticia.fecha}
                  imagenUrl={obtenerUrlArchivo(noticia.imagen_url)}
                />
              ))}

              {noticiasFiltradas.length === 0 && (
                <p>No hay noticias para mostrar.</p>
              )}
            </section>
          )}
        </section>

        <aside className="md:w-1/3">
          <BarraLateral
            busqueda={busqueda}
            categoria={categoria}
            categorias={categorias}
            alCambiarBusqueda={setBusqueda}
            alCambiarCategoria={setCategoria}
          />
        </aside>
      </section>
    </>
  );
}
