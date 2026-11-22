
import { Outlet, useNavigate, useLocation } from "react-router-dom";

import { useAuth } from "../../../manejo-sesion/useAuth";
import type { Rol } from "../../../../shared/tipos";

import { menuEstudiante } from "../../estudiante/config/menuEstudiante";
import { menuDocente } from "../../docente/config/menuDocente";
import { menuAdministrador } from "../../administrador/config/menuAdministrador";
import { menuCPR } from "../../cpr/config/menuCPR";
import { menuConduccion } from "../../conduccion/config/menuConduccion";

import ProveedorAlertas from "../componentes/ProveedorAlertas";
import CampanaAlertas from "../componentes/CampanaAlertas";
import BarraNavegacionPerfil from "../componentes/BarraNavegacionPerfil";
import type { OpcionMenuPerfil } from "../componentes/BarraNavegacionPerfil";

import "../estilos/PerfilesCompartidos.css";

// Nombres visibles de los roles del sistema.
const etiquetasRol: Record<Rol, string> = {
  ADMIN: "Administrador",
  ASPIRANTE: "Aspirante",
  ALUMNO: "Alumno",
  COORDINADOR: "Coordinador",
  CPR: "CPR",
  DOCENTE: "Docente",
};

// Menú de navegación correspondiente a cada rol.
const menusPorRol: Record<Rol, OpcionMenuPerfil[]> = {
  ADMIN: menuAdministrador,
  ASPIRANTE: menuEstudiante,
  ALUMNO: menuEstudiante,
  COORDINADOR: menuConduccion,
  CPR: menuCPR,
  DOCENTE: menuDocente,
};

export default function DashboardLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const rolUsuario = user
    ? etiquetasRol[user.rol]
    : "Sin sesión";

  const nombreUsuario = user
    ? `${user.nombre} ${user.apellido}`.trim()
    : "Usuario";

  const inicialesUsuario = user
    ? `${user.nombre.charAt(0)}${user.apellido.charAt(0)}`.toUpperCase()
    : "";

  const baseMenu = (user ? menusPorRol[user.rol] ?? [] : []).filter(o => o.ruta !== "/dashboard/alertas" && o.texto !== "Notificaciones");
  const opcionesMenu = [...baseMenu.filter(o => o.texto !== "Mi perfil"),
    ...baseMenu.filter(o => o.texto === "Mi perfil")];

  function cerrarSesion() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <ProveedorAlertas key={user?.token ?? "sin-sesion"} token={user?.token ?? ""}>
    <div className="perfil-layout animate-fade-in">
      {/* Navegación compartida de los perfiles */}
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
            Cerrar sesión
          </button>
        </footer>
      </aside>

      {/* Contenedor principal del perfil */}
      <div className="perfil-contenedor">
        <header className="perfil-header">
          <div className="perfil-header-contenido">
            <CampanaAlertas key={location.pathname} />

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
    </ProveedorAlertas>
  );
}
