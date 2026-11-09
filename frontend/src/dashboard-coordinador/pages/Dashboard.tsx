import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sidebar } from "@/shared/components/Sidebar";
import { menuItems } from "@/shared/menuConfig";
import ListaInscriptos from "../components/ListaInscriptos";
import DetalleLegajo from "../components/DetalleLegajo";
import Panel from "./Panel";
import { UserContext } from "@/shared/context/UserContext";
import ListaSeminarios from "../components/ListaSeminarios";
import EstudiantesEnRiesgoPage from "./EstudiantesEnRiesgoPage";
import Alerta from "@/AlertasNotificaciones/pages/Alerta";
import type { Notificacion } from "@/AlertasNotificaciones/types/notificacion.types";
import { NotificationsButton } from "@/shared/components/NotificationsButton";
import { Desgranamiento } from "../components/Desgranamiento";
import { FormularioInscripcion } from "@/Inscripcion/components/FormularioInscripcion";

export function Dashboard({ path }: { path: string }) {
  const currentUser = useContext(UserContext);
  const navigate = useNavigate();

  const puedeInscribir =
    currentUser?.rol === "coordinador" ||
    currentUser?.rol === "admin";

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

  return (
    <div className="flex h-screen w-full bg-paper text-ink">
      <Sidebar
        user={currentUser}
        items={menuItems}
        currentPath={path}
        onNavigate={navigate}
      />

      <main className="scroll-fade flex-1 overflow-y-auto px-8 py-6 transition-colors">
        {path !== "/notificaciones" && (
          <NotificationsButton
            notifications={notificaciones}
            onClick={() => navigate("/notificaciones")}
          />
        )}

        {path === "/panel" && <Panel />}

        {path === "/estadisticas" && <Desgranamiento />}

        {path === "/inscriptos" && <ListaInscriptos />}

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

        {path === "/seminarios" && <ListaSeminarios />}

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