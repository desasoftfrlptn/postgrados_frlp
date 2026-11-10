// Muestra las secciones administrables del sitio público.

import type {
  SeccionHomeAdmin,
} from "../tipos/homeAdmin";


interface NavegacionHomeAdminProps {
  seccionActiva: SeccionHomeAdmin;
  alCambiarSeccion: (
    seccion: SeccionHomeAdmin
  ) => void;
}


const opciones: {
  clave: SeccionHomeAdmin;
  texto: string;
}[] = [
  {
    clave: "inicio",
    texto: "Inicio",
  },
  {
    clave: "carreras",
    texto: "Carreras",
  },
  {
    clave: "noticias",
    texto: "Noticias",
  },
  {
    clave: "contacto",
    texto: "Contacto",
  },
  {
    clave: "calendario",
    texto: "Calendario",
  },
  {
    clave: "faq",
    texto: "Preguntas frecuentes",
  },
];


export default function NavegacionHomeAdmin({
  seccionActiva,
  alCambiarSeccion,
}: NavegacionHomeAdminProps) {
  return (
    <nav
      className="admin-home-pestanas"
      aria-label="Secciones del sitio público"
    >
      {opciones.map((opcion) => (
        <button
          key={opcion.clave}
          type="button"
          className={
            seccionActiva === opcion.clave
              ? "admin-home-pestana activa"
              : "admin-home-pestana"
          }
          aria-current={
            seccionActiva === opcion.clave
              ? "page"
              : undefined
          }
          onClick={() =>
            alCambiarSeccion(
              opcion.clave
            )
          }
        >
          {opcion.texto}
        </button>
      ))}
    </nav>
  );
}