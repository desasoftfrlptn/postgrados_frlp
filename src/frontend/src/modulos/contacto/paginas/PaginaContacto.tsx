import { useOutletContext } from "react-router-dom";

import imagenHero from "../../../imagenes/hero-home.png";

import type {
  ContactoPublicoContexto,
} from "../../../shared/api/contacto";

import {
  emailValido,
  telefonoValido,
  obtenerEnlaceTelefono,
} from "../../../shared/validaciones/contacto";

import MensajeSistema from "../../../shared/componentes/MensajeSistema/MensajeSistema";

import "./PaginaContacto.css";

import FormularioContacto from "../componentes/FormularioContacto";

export default function PaginaContacto() {
  const {
    configuracion,
    cargando,
    error,
  } = useOutletContext<ContactoPublicoContexto>();

  const direccion = configuracion.direccion?.trim() ?? "";
  const email = configuracion.email?.trim() ?? "";
  const telefono = configuracion.telefono?.trim() ?? "";
  const horario = configuracion.horario?.trim() ?? "";

  return (
    <div className="contacto">
      <section
        className="contacto-hero"
        style={{
          backgroundImage: `url(${imagenHero})`,
        }}
        aria-labelledby="contacto-titulo"
      >
        <div className="contacto-hero-contenido">
          <h1 id="contacto-titulo">
            {configuracion.titulo || "Contacto"}
          </h1>

          <p>{configuracion.descripcion}</p>
        </div>
      </section>

      {cargando ? (
        <p className="contacto-aviso" role="status">
          Cargando información de contacto...
        </p>
      ) : error ? (
        <div className="contacto-aviso">
          <MensajeSistema
            tipo="error"
            texto={error}
          />
        </div>
      ) : (
        <section
          className="contacto-principal"
          aria-labelledby="contacto-formulario-titulo"
        >
        <section className="contacto-formulario">
          <h2 id="contacto-formulario-titulo">
            {configuracion.formulario_titulo}
          </h2>

          <p>
            {configuracion.formulario_descripcion}
          </p>

          <FormularioContacto />
        </section>

          <aside
            className="contacto-informacion"
            aria-labelledby="contacto-informacion-titulo"
          >
            <h2 id="contacto-informacion-titulo">
              Información de contacto
            </h2>

            <div className="contacto-datos">
              <article className="contacto-dato">
                <span
                  className="contacto-dato-icono"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                </span>

                <div>
                  <h3>Dirección</h3>
                  <p>
                    {direccion || "No disponible"}
                  </p>
                </div>
              </article>

              <article className="contacto-dato">
                <span
                  className="contacto-dato-icono"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24">
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="14"
                      rx="2"
                    />
                    <path d="m3 7 9 7 9-7" />
                  </svg>
                </span>

                <div>
                  <h3>Correo electrónico</h3>

                  {emailValido(email) ? (
                    <a href={`mailto:${email}`}>
                      {email}
                    </a>
                  ) : (
                    <p>No disponible</p>
                  )}
                </div>
              </article>

              <article className="contacto-dato">
                <span
                  className="contacto-dato-icono"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M6.5 3.5 9 3l2 5-2.5 2a14 14 0 0 0 5.5 5.5l2-2.5 5 2 .5 2.5c.2 1.1-.7 2-1.8 2A17.2 17.2 0 0 1 4.5 5.3c0-1.1.9-2 2-1.8Z" />
                  </svg>
                </span>

                <div>
                  <h3>Teléfono</h3>

                  {telefonoValido(telefono) ? (
                    <a
                      href={obtenerEnlaceTelefono(
                        telefono
                      )}
                    >
                      {telefono}
                    </a>
                  ) : (
                    <p>No disponible</p>
                  )}
                </div>
              </article>

              <article className="contacto-dato">
                <span
                  className="contacto-dato-icono"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </span>

                <div>
                  <h3>Horario de atención</h3>
                  <p>{horario || "No disponible"}</p>
                </div>
              </article>
            </div>

            {direccion && (
              <div className="contacto-mapa">
                <iframe
                  title="Ubicación institucional"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(direccion)}&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </aside>
        </section>
      )}
    </div>
  );
}
