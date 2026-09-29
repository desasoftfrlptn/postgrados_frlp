import { Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../../../manejo-sesion/useAuth";
import type { Rol } from "../../../../shared/tipos";

import { menuEstudiante } from "../../estudiante/config/menuEstudiante";
import { menuDocente } from "../../docente/config/menuDocente";

import BarraNavegacionPerfil from "../componentes/BarraNavegacionPerfil";

import "../estilos/PerfilesCompartidos.css";

export default function DashboardLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const etiquetasRol: Record<Rol, string> = {
    ESTUDIANTE: "Estudiante",
    ASPIRANTE: "Aspirante",
    DOCENTE: "Docente",
    COORDINADOR: "Coordinador",
    CPR: "CPR",
    ADMIN: "Administrador",
  };

  const rolUsuario = user ? etiquetasRol[user.rol] : "Sin sesión";
  const nombreUsuario = user
    ? user.nombre + " " + user.apellido
    : "Usuario";

  const inicialesUsuario = user
    ? (user.nombre.charAt(0) + user.apellido.charAt(0)).toUpperCase()
    : "";

  const opcionesMenu =
    user?.rol === "DOCENTE"
      ? menuDocente
      : (user?.rol === "ASPIRANTE" || user?.rol === "ESTUDIANTE")
        ? menuEstudiante
        : [];

  const cerrarSesion = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="perfil-layout animate-fade-in">
      <aside className="perfil-sidebar">
        <header className="perfil-sidebar-encabezado">
          <h2>UTN FRLP</h2>
          <p>{rolUsuario}</p>
        </header>

        <BarraNavegacionPerfil
          rol={rolUsuario}
          opciones={opcionesMenu}
        />

        <footer className="perfil-sidebar-pie">
          <button
            type="button"
            className="perfil-cerrar-sesion"
            onClick={cerrarSesion}
          >
            Cerrar Sesión
          </button>
        </footer>
      </aside>

      <div className="perfil-contenedor">
        <header className="perfil-header">
          <div className="perfil-header-contenido">
            <button
              type="button"
              className="perfil-header-icono"
              aria-label="Mensajes"
            >
              <span aria-hidden="true">✉️</span>
            </button>

            <button
              type="button"
              className="perfil-header-icono"
              aria-label="Notificaciones"
            >
              <span aria-hidden="true">🔔</span>
            </button>

            <section
              className="perfil-usuario"
              aria-label="Usuario actual"
            >
              <span
                className="perfil-usuario-avatar"
                aria-hidden="true"
              >
                {inicialesUsuario}
              </span>

              <div className="perfil-usuario-datos">
                <p className="perfil-usuario-nombre">
                  {nombreUsuario}
                </p>

                <p className="perfil-usuario-rol">
                  {rolUsuario}
                </p>
              </div>
            </section>
          </div>
        </header>

        <main className="perfil-contenido">
          <Outlet />
        </main>
      </div>
    </div>
  );
}