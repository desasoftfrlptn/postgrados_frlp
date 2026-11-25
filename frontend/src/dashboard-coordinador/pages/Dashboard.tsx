import { useState } from "react";
import { Link, useNavigate, Navigate, useParams } from "react-router-dom";
import { Sidebar } from "@/shared/components/Sidebar";
import { menuItems } from "@/shared/menuConfig";
import ListaInscriptos from "../components/ListaInscriptos";
import DetalleLegajo from "../components/DetalleLegajo";
import Panel from "./Panel";
import ListaSeminarios from "../components/ListaSeminarios";
import { patronSeminarioId } from "@/shared/types/types";
import { RegistroAsistencia } from "@/modulo-docente/pages/RegistroAsistencia";
import { Button } from "@/shared/components/Button";
import EstudiantesEnRiesgoPage from "./EstudiantesEnRiesgoPage";
import Alerta from "@/AlertasNotificaciones/pages/Alerta";
import type { Notificacion } from "@/AlertasNotificaciones/types/notificacion.types";
import { NotificationsButton } from "@/shared/components/NotificationsButton";
import { Desgranamiento } from "../components/Desgranamiento";
import { FormularioInscripcion } from "@/Inscripcion/components/FormularioInscripcion";
import EnlacesAccesoPage from "./EnlacesAccesoPage";
import { useAuth } from "@/shared/auth/authContext";

export function Dashboard({ path }: { path: string }) {
  const navigate = useNavigate();
  const { seminarioId } = useParams();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const {user: user} = useAuth();

  const puedeInscribir =
    user?.rol === "coordinador" ||
    user?.rol === "admin";

  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([
    {
      id: "1",
      tipo: "BECA_SOLICITADA",
      title: "Bienvenido",
      description: "Tu sesión ha iniciado correctamente.",
      time: "ahora",
      read: false,
      prioridad: "alta",
      meta: {},
    },
  ]);

  const handleMarcarLeido = (id: string | number) => {
    setNotificaciones((anteriores) =>
      anteriores.map((notificacion) =>
        String(notificacion.id) === String(id)
          ? { ...notificacion, read: true }
          : notificacion,
      ),
    );
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-full bg-paper text-ink">
      <div id="menu-panel" className={menuAbierto ? "absolute inset-y-0 left-0 z-30 md:static" : "hidden md:block"}>
        <Sidebar
          user={user}
          items={menuItems}
          currentPath={path}
          onNavigate={(href) => {
            navigate(href);
            setMenuAbierto(false);
          }}
        />
      </div>
      <main className="scroll-fade min-w-0 flex-1 overflow-y-auto px-4 py-6 transition-colors md:px-8">
        <Button
          variant="outline"
          className="relative z-40 mb-4 md:hidden"
          aria-expanded={menuAbierto}
          aria-controls="menu-panel"
          onClick={() => setMenuAbierto((abierto) => !abierto)}
        >
          {menuAbierto ? "Cerrar menú" : "Menú"}
        </Button>
        {path !== "/notificaciones" && (
          <NotificationsButton
            notifications={notificaciones}
            onClick={() => navigate("/notificaciones")}
          />
        )}

        {path === "/panel" && <Panel />}

        {path === "/estadisticas" && <Desgranamiento />}

        {path === "/inscriptos" && <ListaInscriptos />}

        {path === "/enlaces" && user.rol === "coordinador" && <EnlacesAccesoPage />}

        {path === "/inscriptos/nuevo" && (
          puedeInscribir ? (
            <div className="space-y-5">
              <Link
                to="/inscriptos"
                className="inline-flex text-sm font-medium text-brand-500 hover:underline"
              >
                Volver a inscriptos
              </Link>

              <FormularioInscripcion />
            </div>
          ) : (
            <div
              role="alert"
              className="rounded-xl border border-line bg-paper-surface p-5 text-sm text-ink-secondary"
            >
              No tenés permisos para registrar inscripciones.
            </div>
          )
        )}

        {path === "/:id" && <DetalleLegajo />}

        {path === "/seminarios" && (
          seminarioId
            ? new RegExp(`^${patronSeminarioId}$`).test(seminarioId)
              ? <RegistroAsistencia key={seminarioId} id={seminarioId} />
              : <Navigate to="/seminarios" replace />
            : <ListaSeminarios />
        )}

        {path === "/riesgo" && <EstudiantesEnRiesgoPage />}

        {path === "/notificaciones" && (
          <Alerta
            notificaciones={notificaciones}
            onMarcarLeido={handleMarcarLeido}
            onActualizar={setNotificaciones}
          />
        )}
      </main>
    </div>
  );
}

export default Dashboard;