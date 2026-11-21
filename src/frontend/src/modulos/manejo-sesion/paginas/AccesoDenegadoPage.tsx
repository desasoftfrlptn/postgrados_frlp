import { Link } from "react-router-dom";

import { useAuth } from "../useAuth";
import { obtenerRutaInicioPorRol } from "../rutasPorRol";

import "./AccesoDenegadoPage.css";

export default function AccesoDenegadoPage() {
  const { user } = useAuth();

  const destino = user
    ? obtenerRutaInicioPorRol(user.rol)
    : "/login";

  return (
    <section
      className="acceso-denegado"
      aria-labelledby="acceso-denegado-titulo"
    >
      <h1 id="acceso-denegado-titulo">
        Acceso denegado
      </h1>

      <p>
        No tenés permisos para acceder a esta sección.
      </p>

      <p>
        Si necesitás acceder, comunicate con el administrador del sistema.
      </p>

      <Link
        to={destino}
        className="acceso-denegado-enlace"
      >
        {user?.rol === "ASPIRANTE" ? "Volver al sitio público" : "Volver a mi panel"}
      </Link>
    </section>
  );
}
