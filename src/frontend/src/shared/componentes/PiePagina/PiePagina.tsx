// Pie de página con información de contacto y redes sociales de UTN FRLP.

import "./PiePagina.css";

export default function PiePagina() {
  return (
    <footer className="pie-pagina">
      <section className="pie-pagina-contenido">
        <address className="pie-pagina-bloque">
          <span className="pie-pagina-icono" aria-hidden="true">
            <svg className="pie-pagina-icono-svg" viewBox="0 0 24 24">
              <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
            </svg>
          </span>

          <p>
            <strong>UTN FRLP</strong>
            <br />
            Calle 60 esquina 124
            <br />
            La Plata, Buenos Aires
            <br />
            Argentina
          </p>
        </address>

        <section className="pie-pagina-bloque">
          <span className="pie-pagina-icono" aria-hidden="true">☎</span>
          <p>
            Tel:
            <br />
            <a href="tel:+5491112223333">+54 9 1112223333</a>
          </p>
        </section>

        <section className="pie-pagina-bloque pie-pagina-email">
          <span className="pie-pagina-icono" aria-hidden="true">✉</span>
          <a href="mailto:posgrado@frlp.utn.edu.ar">
            posgrado@frlp.utn.edu.ar
          </a>
        </section>

        <section className="pie-pagina-bloque">
          <span className="pie-pagina-icono" aria-hidden="true">◷</span>
          <p>
            Lunes a viernes
            <br />
            de 9 a 18 hs
          </p>
        </section>

        <section className="pie-pagina-redes">
          <p>Seguinos en redes</p>

          <nav aria-label="Redes sociales">
            <ul>
              <li><a href="#" aria-label="Facebook">f</a></li>
              <li><a href="#" aria-label="Instagram">◎</a></li>
              <li><a href="#" aria-label="LinkedIn">in</a></li>
              <li><a href="#" aria-label="YouTube">▶</a></li>
            </ul>
          </nav>
        </section>
      </section>
    </footer>
  );
}