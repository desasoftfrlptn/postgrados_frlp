import type { ContactoPublicoContexto } from "../../api/contacto";

import {
  emailValido,
  telefonoValido,
  enlaceValido,
  obtenerEnlaceTelefono,
} from "../../validaciones/contacto";

import "./PiePagina.css";

const redesSociales = [
  { clave: "facebook", nombre: "Facebook", icono: "f" },
  { clave: "instagram", nombre: "Instagram", icono: "◎" },
  { clave: "linkedin", nombre: "LinkedIn", icono: "in" },
  { clave: "youtube", nombre: "YouTube", icono: "▶" },
];

export default function PiePagina({
  configuracion,
  cargando,
  error,
}: ContactoPublicoContexto) {
  const direccion = configuracion.direccion?.trim() ?? "";
  const telefono = configuracion.telefono?.trim() ?? "";
  const email = configuracion.email?.trim() ?? "";
  const horario = configuracion.horario?.trim() ?? "";

  const redesDisponibles = redesSociales.filter((red) => {
    const enlace = configuracion[red.clave]?.trim();

    return Boolean(enlace && enlaceValido(enlace));
  });

  return (
    <footer className="pie-pagina" aria-busy={cargando}>
      {cargando ? (
        <p className="pie-pagina-aviso" role="status">
          Cargando información de contacto...
        </p>
      ) : error ? (
        <p className="pie-pagina-aviso" role="alert">
          {error}
        </p>
      ) : (
        <div className="pie-pagina-contenido">
          <address className="pie-pagina-bloque">
            <span
              className="pie-pagina-icono"
              aria-hidden="true"
            >
              <svg
                className="pie-pagina-icono-svg"
                viewBox="0 0 24 24"
              >
                <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
              </svg>
            </span>

            <p>
              <strong>UTN FRLP</strong>
              <br />
              {direccion || "Dirección no disponible"}
            </p>
          </address>

          <section className="pie-pagina-bloque">
            <span
              className="pie-pagina-icono"
              aria-hidden="true"
            >
              ☎
            </span>

            <p>
              Tel:
              <br />

              {telefonoValido(telefono) ? (
                <a href={obtenerEnlaceTelefono(telefono)}>
                  {telefono}
                </a>
              ) : (
                "Teléfono no disponible"
              )}
            </p>
          </section>

          <section className="pie-pagina-bloque pie-pagina-email">
            <span
              className="pie-pagina-icono"
              aria-hidden="true"
            >
              ✉
            </span>

            {emailValido(email) ? (
              <a href={`mailto:${email}`}>
                {email}
              </a>
            ) : (
              <p>Correo no disponible</p>
            )}
          </section>

          <section className="pie-pagina-bloque">
            <span
              className="pie-pagina-icono"
              aria-hidden="true"
            >
              ◷
            </span>

            <p>
              {horario || "Horario no disponible"}
            </p>
          </section>

          <section className="pie-pagina-redes">
            <p>Seguinos en redes</p>

            {redesDisponibles.length > 0 ? (
              <nav aria-label="Redes sociales">
                <ul>
                  {redesDisponibles.map((red) => (
                    <li key={red.clave}>
                      <a
                        href={configuracion[red.clave].trim()}
                        aria-label={red.nombre}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {red.icono}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : (
              <p className="pie-pagina-red-aviso">
                Redes sociales no disponibles.
              </p>
            )}
          </section>
        </div>
      )}
    </footer>
  );
}