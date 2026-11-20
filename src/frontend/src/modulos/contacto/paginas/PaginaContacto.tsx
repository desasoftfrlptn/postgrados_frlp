// Página pública con el formulario y la información de contacto.

import imagenHero from "../../../imagenes/hero-home.png";
import "./PaginaContacto.css";

export default function PaginaContacto() {
  return (
    <main className="contacto">
      <section
        className="contacto-hero"
        style={{ backgroundImage: `url(${imagenHero})` }}
        aria-labelledby="contacto-titulo"
      >
        <div className="contacto-hero-contenido">
          <h1 id="contacto-titulo">Contacto</h1>

          <p>
            Estamos para ayudarte. Contactanos para resolver tus dudas sobre
            nuestras carreras y el proceso de inscripción.
          </p>
        </div>
      </section>

      <section
        className="contacto-principal"
        aria-labelledby="contacto-formulario-titulo"
      >
        <section className="contacto-formulario">
          <h2 id="contacto-formulario-titulo">Envianos tu consulta</h2>

          <p>
            Completá el formulario y nuestro equipo se pondrá en contacto a la
            brevedad.
          </p>

          <form>
            <div className="contacto-campo">
              <label htmlFor="nombre">
                Nombre y Apellido <span aria-hidden="true">*</span>
              </label>

              <input
                id="nombre"
                name="nombre"
                type="text"
                required
              />
            </div>

            <div className="contacto-campo">
              <label htmlFor="email">
                Correo Electrónico <span aria-hidden="true">*</span>
              </label>

              <input
                id="email"
                name="email"
                type="email"
                required
              />
            </div>

            <div className="contacto-campo">
              <label htmlFor="asunto">
                Asunto <span aria-hidden="true">*</span>
              </label>

              <input
                id="asunto"
                name="asunto"
                type="text"
                required
              />
            </div>

            <div className="contacto-campo">
              <label htmlFor="mensaje">
                Mensaje <span aria-hidden="true">*</span>
              </label>

              <textarea
                id="mensaje"
                name="mensaje"
                rows={4}
                required
              />
            </div>

            <button type="submit">Enviar</button>
          </form>
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
              <span className="contacto-dato-icono" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              </span>

              <div>
                <h3>Dirección</h3>
                <p>Calle 60 y 124 s/n, La Plata, Buenos Aires</p>
              </div>
            </article>

            <article className="contacto-dato">
              <span className="contacto-dato-icono" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 7 9-7" />
                </svg>
              </span>

              <div>
                <h3>Email</h3>
                <p>posgrado@frlp.utn.edu.ar</p>
              </div>
            </article>

            <article className="contacto-dato">
              <span className="contacto-dato-icono" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M6.5 3.5 9 3l2 5-2.5 2a14 14 0 0 0 5.5 5.5l2-2.5 5 2 .5 2.5c.2 1.1-.7 2-1.8 2A17.2 17.2 0 0 1 4.5 5.3c0-1.1.9-2 2-1.8Z" />
                </svg>
              </span>

              <div>
                <h3>Teléfono</h3>
                <p>+54 9 4277270</p>
              </div>
            </article>

            <article className="contacto-dato">
              <span className="contacto-dato-icono" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </span>

              <div>
                <h3>Horario de atención</h3>
                <p>Lunes a viernes de 9 a 18 hs</p>
              </div>
            </article>
          </div>

          <div className="contacto-mapa">
            <iframe
              title="Ubicación UTN Facultad Regional La Plata"
              src="https://www.google.com/maps?q=UTN%20Facultad%20Regional%20La%20Plata&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </aside>
      </section>
    </main>
  );
}