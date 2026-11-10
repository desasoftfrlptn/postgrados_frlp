// Página pública con noticias definidas en el frontend.


import { useState } from "react";
import { noticias } from "../datos/noticias";

import TarjetaNoticia from "../componentes/tarjetasNoticias";
import BarraLateral from "../componentes/BarraLateral";

import imagenHero from "../../../imagenes/hero-home.png";

import "./PaginaNoticias.css";


export default function PaginaNoticias() {
  const [busqueda, setBusqueda] =
    useState("");

  const [categoria, setCategoria] =
    useState("Todas");

  const categorias = Array.from(
    new Set(
      noticias.map(
        (noticia) =>
          noticia.categoria
      )
    )
  ).sort();


  const textoBusqueda =
    busqueda
      .trim()
      .toLowerCase();


  const noticiasFiltradas =
    noticias.filter(
      (noticia) => {
        const coincideCategoria =
          categoria === "Todas" ||
          noticia.categoria === categoria;

        const coincideBusqueda =
          !textoBusqueda ||
          noticia.titulo
            .toLowerCase()
            .includes(
              textoBusqueda
            ) ||
          noticia.resumen
            .toLowerCase()
            .includes(
              textoBusqueda
            );

        return (
          coincideCategoria &&
          coincideBusqueda
        );
      }
    );


  return (
    <>
      <section
        className="noticias-hero"
        style={{
          backgroundImage:
            `url(${imagenHero})`,
        }}
        aria-labelledby="noticias-titulo"
      >
        <section className="noticias-hero-contenido">
          <h1 id="noticias-titulo">
            Noticias
          </h1>

          <p>
            Enterate de las últimas novedades
            y comunicados de la facultad.
          </p>
        </section>
      </section>


      <section className="max-w-7xl mx-auto px-4 py-12 flex flex-col md:flex-row gap-8">
        <section className="md:w-2/3">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 border-b pb-2">
            Últimas Noticias
          </h2>

          <section>
            {noticiasFiltradas.map((noticia) => (
              <TarjetaNoticia
                key={noticia.id}
                categoria={noticia.categoria}
                titulo={noticia.titulo}
                resumen={noticia.resumen}
                contenido={noticia.contenido}
                fecha={noticia.fecha_publicacion}
                imagenUrl={noticia.imagen_url}
              />
            ))}

            {noticiasFiltradas.length === 0 && (
              <p>No hay noticias para mostrar.</p>
            )}
          </section>
        </section>

        <aside className="md:w-1/3">
          <BarraLateral
            busqueda={
              busqueda
            }
            categoria={
              categoria
            }
            categorias={
              categorias
            }
            alCambiarBusqueda={
              setBusqueda
            }
            alCambiarCategoria={
              setCategoria
            }
          />
        </aside>
      </section>
    </>
  );
}
