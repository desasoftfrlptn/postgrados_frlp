// Muestra una noticia dentro del listado público.

import {
  useState,
} from "react";


interface NoticiaProps {
  categoria: string;
  titulo: string;
  resumen: string;
  contenido: string;
  imagenUrl: string;
  fecha: string;
}


export default function TarjetaNoticia({
  categoria,
  titulo,
  resumen,
  contenido,
  imagenUrl,
  fecha,
}: NoticiaProps) {
  const [
    mostrarContenido,
    setMostrarContenido,
  ] = useState(false);


  return (
    <article className="flex flex-col md:flex-row bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow mb-6">
      {imagenUrl && (
        <figure className="md:w-1/3 h-48 md:h-auto m-0">
          <img
            src={imagenUrl}
            alt={`Imagen de la noticia: ${titulo}`}
            className="w-full h-full object-cover"
          />
        </figure>
      )}

      <section className="p-6 flex-1">
        <header className="mb-2">
          <strong className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block mb-3 font-semibold">
            {categoria}
          </strong>

          <h2 className="text-xl font-bold text-gray-900 m-0">
            {titulo}
          </h2>

          <time
            dateTime={fecha}
            className="block mt-2 text-xs text-gray-500"
          >
            {fecha}
          </time>
        </header>

        <p className="text-gray-600 text-sm mb-4">
          {resumen}
        </p>

        {mostrarContenido && (
          <p className="text-gray-700 text-sm whitespace-pre-line">
            {contenido}
          </p>
        )}

        <footer className="mt-4">
          <button
            type="button"
            onClick={() =>
              setMostrarContenido(
                !mostrarContenido
              )
            }
            className="text-blue-600 font-semibold text-sm hover:underline"
            aria-expanded={
              mostrarContenido
            }
          >
            {mostrarContenido
              ? "Ver menos"
              : "Leer más"}
          </button>
        </footer>
      </section>
    </article>
  );
}