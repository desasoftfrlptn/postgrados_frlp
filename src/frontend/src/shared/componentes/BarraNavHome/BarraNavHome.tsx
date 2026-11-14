// Barra de navegación utilizada en las páginas públicas del sistema.

import { Link, NavLink } from "react-router-dom";
import logoUtnFrlp from "../../../imagenes/logo-utn-frlp.png";
import "./BarraNavHome.css";

export default function BarraNavHome() {
  return (
    <header className="barra-nav-home">
      <nav className="barra-nav-home-contenido" aria-label="Navegación principal">
        <Link className="barra-nav-home-logo" to="/" aria-label="Ir al inicio">
          <img src={logoUtnFrlp} alt="UTN Facultad Regional La Plata" />
        </Link>

        <ul className="barra-nav-home-enlaces">
          <li>
            <NavLink to="/" end>
              <svg className="barra-nav-home-icono" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 11.5 12 4l9 7.5" />
                <path d="M5.5 10v10h13V10" />
                <path d="M9.5 20v-6h5v6" />
              </svg>
              Inicio
            </NavLink>
          </li>

          <li>
            <NavLink to="/carreras">
              <svg className="barra-nav-home-icono" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m2.5 9 9.5-5 9.5 5-9.5 5-9.5-5Z" />
                <path d="M6 11v5c3.5 2.5 8.5 2.5 12 0v-5" />
              </svg>
              Carreras
            </NavLink>
          </li>

          <li>
            <NavLink to="/inscripcion">
              <svg className="barra-nav-home-icono" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 2h8l4 4v16H6V2Z" />
                <path d="M14 2v5h5M9 12h6M9 16h6" />
              </svg>
              Inscripción
            </NavLink>
          </li>

          <li>
            <NavLink to="/calendario">
              <svg className="barra-nav-home-icono" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M7 3v4M17 3v4M3 9h18" />
              </svg>
              Calendario académico
            </NavLink>
          </li>

          <li>
            <NavLink to="/noticias">
              <svg className="barra-nav-home-icono" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 4h16v16H4V4Z" />
                <path d="M8 8h8M8 12h8M8 16h5" />
              </svg>
              Noticias
            </NavLink>
          </li>

          <li>
            <NavLink to="/faq">
              {/* Usamos un ícono de signo de interrogación simple */}
              <svg className="barra-nav-home-icono" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              FAQ
            </NavLink>
          </li>

          <li>
            <NavLink to="/contacto">
              <svg className="barra-nav-home-icono" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 3 4 5c0 8 7 15 15 15l2-3-5-3-2 2c-3-1-5-3-6-6l2-2-3-5Z" />
              </svg>
              Contacto
            </NavLink>
          </li>
        </ul>

        <Link className="barra-nav-home-login" to="/login">
          <svg className="barra-nav-home-icono-usuario" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4.2 3.6-7 8-7s8 2.8 8 7v1H4Z" />
          </svg>
          Iniciar sesión
        </Link>
      </nav>
    </header>
  );
}