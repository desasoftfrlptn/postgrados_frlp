
import { Link } from "react-router-dom";

import { useAuth } from "../useAuth";
import type { Rol } from "../../../shared/tipos";

import "./AccesoDenegadoPage.css";

const destinoPorRol: Record<Rol, string> = {
  ADMIN: "/dashboard/administrador",
  ASPIRANTE: "/dashboard",
  ALUMNO: "/dashboard/general",
  COORDINADOR: "/dashboard/conduccion",
  CPR: "/dashboard/general",
  DOCENTE: "/dashboard/docente",
};

export default function AccesoDenegadoPage() {
  const { user } = useAuth();

  const destino = user
    ? destinoPorRol[user.rol]
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
        Volver a mi panel
      </Link>
    </section>
  );
}
