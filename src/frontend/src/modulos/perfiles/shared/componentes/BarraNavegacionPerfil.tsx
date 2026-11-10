// Renderiza las opciones de navegación disponibles para cada perfil.

import { NavLink } from "react-router-dom";


export interface OpcionMenuPerfil {
  texto: string;
  icono: string;
  ruta?: string;
}


interface BarraNavegacionPerfilProps {
  rol: string;
  opciones: OpcionMenuPerfil[];
}


export default function BarraNavegacionPerfil({
  rol,
  opciones,
}: BarraNavegacionPerfilProps) {
  const esRutaInicio = (
    ruta: string
  ) =>
    ruta === "/dashboard" ||
    ruta === "/dashboard/docente" ||
    ruta === "/dashboard/administrador";


  return (
    <nav
      className="perfil-menu"
      aria-label={`Navegación del perfil de ${rol.toLowerCase()}`}
    >
      <ul className="perfil-menu-lista">
        {opciones.map((opcion) => (
          <li key={opcion.texto}>
            {opcion.ruta ? (
              <NavLink
                to={opcion.ruta}
                end={
                  esRutaInicio(
                    opcion.ruta
                  )
                }
                className={({
                  isActive,
                }) =>
                  isActive
                    ? "perfil-menu-enlace perfil-menu-enlace-activo"
                    : "perfil-menu-enlace"
                }
              >
                <span
                  aria-hidden="true"
                >
                  {opcion.icono}
                </span>

                <span>
                  {opcion.texto}
                </span>
              </NavLink>
            ) : (
              <span
                className="perfil-menu-enlace perfil-menu-enlace-deshabilitado"
                aria-disabled="true"
              >
                <span
                  aria-hidden="true"
                >
                  {opcion.icono}
                </span>

                <span>
                  {opcion.texto}
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}