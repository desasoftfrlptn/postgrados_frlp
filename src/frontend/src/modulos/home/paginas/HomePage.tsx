// Página pública de inicio del Sistema de Posgrado UTN FRLP.

import { Link } from "react-router-dom";

import imagenHero from "../../../imagenes/hero-home.png";

import "./HomePage.css";


const valoresIniciales = {
  hero_titulo:
    "Bienvenido al Sistema de Posgrado UTN FRLP",

  hero_descripcion:
    "Gestioná tu inscripción, consultá tu estado académico y accedé a toda la información de tu carrera.",

  boton_inscripcion:
    "Inscribite ahora",

  boton_informacion:
    "Solicitar información",

  boton_estado_inscripcion:
    "Consultar estado de inscripción",

  tarjeta_carreras_titulo:
    "Carreras de Posgrado",

  tarjeta_carreras_descripcion:
    "Conocé nuestra oferta académica de especializaciones, maestrías y doctorados.",

  tarjeta_carreras_enlace:
    "Ver carreras",

  tarjeta_calendario_titulo:
    "Calendario Académico",

  tarjeta_calendario_descripcion:
    "Consultá el calendario de clases, exámenes, inscripciones y fechas importantes.",

  tarjeta_calendario_enlace:
    "Ver calendario",

  tarjeta_noticias_titulo:
    "Novedades",

  tarjeta_noticias_descripcion:
    "Enterate de las últimas noticias y comunicados de la facultad.",

  tarjeta_noticias_enlace:
    "Ver novedades",

  tarjeta_faq_titulo:
    "¿Tenés dudas?",

  tarjeta_faq_descripcion:
    "Respondemos las preguntas más frecuentes sobre el posgrado.",

  tarjeta_faq_enlace:
    "Ir a preguntas frecuentes",
};


export default function HomePage() {
  const configuracion = valoresIniciales;

  return (
    <>
      <section
        className="home-hero"
        style={{
          backgroundImage:
            `url(${imagenHero})`,
        }}
        aria-labelledby="home-titulo"
      >
        <section className="home-hero-contenido">
          <h1 id="home-titulo">
            {configuracion.hero_titulo}
          </h1>

          <p>
            {
              configuracion.hero_descripcion
            }
          </p>

          <nav
            className="home-acciones"
            aria-label="Acciones principales"
          >
            <Link
              className="home-boton home-boton-principal"
              to="/inscripcion"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M6 2h9l5 5v15H6V2Zm8 2v5h5" />
                <path d="M9 13h8M9 17h8" />
              </svg>

              {
                configuracion.boton_inscripcion
              }
            </Link>

            <Link
              className="home-boton home-boton-secundario"
              to="/contacto"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M3 5h18v14H3V5Z" />
                <path d="m3 6 9 7 9-7" />
              </svg>

              {
                configuracion.boton_informacion
              }
            </Link>

            <Link
            className="home-boton home-boton-secundario"
            to="/estado-inscripcion"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M5 3h14v18H5V3Z" />
              <path d="M8 8h8M8 12h8M8 16h5" />
              <path d="m15 16 2 2 4-4" />
            </svg>

            {
              configuracion.boton_estado_inscripcion
            }
            </Link>
          </nav>
        </section>
      </section>


      <section
        className="home-accesos"
        aria-labelledby="home-accesos-titulo"
      >
        <h2
          id="home-accesos-titulo"
          className="sr-only"
        >
          Accesos principales
        </h2>


        <article className="home-tarjeta">
          <span
            className="home-tarjeta-icono home-icono-carreras"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24">
              <path d="m3 10 9-5 9 5-9 5-9-5Z" />
              <path d="M7 12v5c3 2 7 2 10 0v-5" />
            </svg>
          </span>

          <section className="home-tarjeta-contenido">
            <h3>
              {
                configuracion
                  .tarjeta_carreras_titulo
              }
            </h3>

            <p>
              {
                configuracion
                  .tarjeta_carreras_descripcion
              }
            </p>

            <Link to="/carreras">
              {
                configuracion
                  .tarjeta_carreras_enlace
              }{" "}

              <span aria-hidden="true">
                →
              </span>
            </Link>
          </section>
        </article>


        <article className="home-tarjeta">
          <span
            className="home-tarjeta-icono home-icono-calendario"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24">
              <rect
                x="4"
                y="5"
                width="16"
                height="15"
                rx="2"
              />

              <path d="M8 3v4M16 3v4M4 9h16M8 13h2M14 13h2M8 17h2M14 17h2" />
            </svg>
          </span>

          <section className="home-tarjeta-contenido">
            <h3>
              {
                configuracion
                  .tarjeta_calendario_titulo
              }
            </h3>

            <p>
              {
                configuracion
                  .tarjeta_calendario_descripcion
              }
            </p>

            <Link to="/calendario">
              {
                configuracion
                  .tarjeta_calendario_enlace
              }{" "}

              <span aria-hidden="true">
                →
              </span>
            </Link>
          </section>
        </article>


        <article className="home-tarjeta">
          <span
            className="home-tarjeta-icono home-icono-noticias"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
              <path d="M10 21h4" />
            </svg>
          </span>

          <section className="home-tarjeta-contenido">
            <h3>
              {
                configuracion
                  .tarjeta_noticias_titulo
              }
            </h3>

            <p>
              {
                configuracion
                  .tarjeta_noticias_descripcion
              }
            </p>

            <Link to="/noticias">
              {
                configuracion
                  .tarjeta_noticias_enlace
              }{" "}

              <span aria-hidden="true">
                →
              </span>
            </Link>
          </section>
        </article>


        <article className="home-tarjeta">
          <span
            className="home-tarjeta-icono home-icono-preguntas"
            aria-hidden="true"
          >
            ?
          </span>

          <section className="home-tarjeta-contenido">
            <h3>
              {
                configuracion
                  .tarjeta_faq_titulo
              }
            </h3>

            <p>
              {
                configuracion
                  .tarjeta_faq_descripcion
              }
            </p>

            <Link to="/faq">
              {
                configuracion
                  .tarjeta_faq_enlace
              }{" "}

              <span aria-hidden="true">
                →
              </span>
            </Link>
          </section>
        </article>
      </section>
    </>
  );
}