// Página responsable de mostrar al docente sus tareas administrativas pendientes (alertas).

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";

interface SeminarioDocente {
  id: string;
  nombre: string;
  fecha_fin: string;
}

interface AlumnoSeminario {
  legajo_id: string;
  total_clases: number;
  nota_final: number | null;
}

interface TareaPendiente {
  id: string;
  tipo: string;
  seminario: string;
  fechaLimite: string;
  estado: "Vencido" | "Pendiente";
  ruta: string;
}

export default function PendientesPage() {
  const { user } = useAuth();
  const [pendientes, setPendientes] = useState<TareaPendiente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargarPendientes() {
      if (!user?.token) {
        setCargando(false);
        return;
      }
      setCargando(true);
      try {
        const seminarios = await api.get<SeminarioDocente[]>(
          "/seminarios/mis-seminarios",
          user.token
        );

        const hoy = new Date().toISOString().slice(0, 10);
        const listaTareas: TareaPendiente[] = [];

        for (const sem of seminarios) {
          const alumnos = await api.get<AlumnoSeminario[]>(
            `/seminarios/${sem.id}/estudiantes`,
            user.token
          );

          if (alumnos.length === 0) continue;

          const vencido = sem.fecha_fin < hoy;
          const sinClases = alumnos.every((a) => a.total_clases === 0);
          if (sinClases) {
            listaTareas.push({
              id: `asist-${sem.id}`,
              tipo: "Asistencia (Sin clases registradas)",
              seminario: sem.nombre,
              fechaLimite: sem.fecha_fin,
              estado: vencido ? "Vencido" : "Pendiente",
              ruta: "/dashboard/docente/asistencia",
            });
          }

          const sinNota = alumnos.filter((a) => a.nota_final === null).length;
          if (sinNota > 0) {
            listaTareas.push({
              id: `acta-${sem.id}`,
              tipo: `Acta de Cierre (${sinNota} nota/s sin cargar)`,
              seminario: sem.nombre,
              fechaLimite: sem.fecha_fin,
              estado: vencido ? "Vencido" : "Pendiente",
              ruta: "/dashboard/docente/calificaciones",
            });
          }
        }

        setPendientes(listaTareas);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al calcular las tareas pendientes."
        );
      } finally {
        setCargando(false);
      }
    }
    cargarPendientes();
  }, [user?.token]);

  return (
    <section className="perfil-pagina animate-fade-in">
      <header className="perfil-pagina-encabezado">
        <h1>Cargas Pendientes</h1>
        <p>Revisá y completá las actas y asistencias que requieren tu atención.</p>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm"
        >
          {error}
        </p>
      )}

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
        <header className="bg-slate-50 border-b border-slate-200 p-4">
          <h2 className="text-md font-bold text-slate-800">Tareas Requeridas</h2>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
              <tr>
                <th scope="col" className="p-4 font-bold">Tipo de Carga</th>
                <th scope="col" className="p-4 font-bold">Seminario</th>
                <th scope="col" className="p-4 font-bold text-center">Fecha Fin</th>
                <th scope="col" className="p-4 font-bold text-center">Estado</th>
                <th scope="col" className="p-4 font-bold text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {cargando && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    Verificando cargas pendientes...
                  </td>
                </tr>
              )}

              {!cargando && pendientes.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-emerald-700 font-semibold">
                    No tenés cargas pendientes. ¡Todas tus actas y asistencias están al día!
                  </td>
                </tr>
              )}

              {!cargando &&
                pendientes.map((tarea) => (
                  <tr key={tarea.id} className="hover:bg-blue-50 transition-colors">
                    <td className="p-4 font-semibold text-slate-700">
                      {tarea.tipo}
                    </td>

                    <td className="p-4 font-medium text-slate-600">
                      {tarea.seminario}
                    </td>

                    <td className="p-4 text-center font-medium text-slate-600">
                      <time dateTime={tarea.fechaLimite}>
                        {new Date(tarea.fechaLimite).toLocaleDateString("es-AR")}
                      </time>
                    </td>

                    <td className="p-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          tarea.estado === "Vencido"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {tarea.estado}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <Link
                        to={tarea.ruta}
                        className="inline-block px-4 py-2 font-bold rounded-md transition-colors bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                        aria-label={`Completar ${tarea.tipo} de ${tarea.seminario}`}
                      >
                        Ir a Cargar →
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}