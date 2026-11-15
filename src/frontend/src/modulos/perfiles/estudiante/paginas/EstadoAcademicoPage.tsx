// Página responsable de mostrar el historial académico y avance del estudiante.
import { useEffect, useState } from "react";
import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";

interface CursadaSeminario {
  inscripcion_id: string;
  seminario_id: string;
  seminario_nombre: string;
  carrera_nombre: string;
  asistencias: number;
  total_clases: number;
  porcentaje_asistencia: number;
  nota_final: number | null;
  estado: string;
}

export default function EstadoAcademicoPage() {
  const { user } = useAuth();
  const [cursada, setCursada] = useState<CursadaSeminario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargarCursada() {
      if (!user?.token) {
        setCargando(false);
        return;
      }
      try {
        const datos = await api.get<CursadaSeminario[]>(
          "/seminarios/mi-cursada",
          user.token
        );
        setCursada(datos);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar tu estado académico."
        );
      } finally {
        setCargando(false);
      }
    }
    cargarCursada();
  }, [user?.token]);

  const totalSeminarios = cursada.length;
  const aprobados = cursada.filter((s) => s.estado === "APROBADO").length;
  const porcentajeAvance =
    totalSeminarios > 0 ? Math.round((aprobados / totalSeminarios) * 100) : 0;

  return (
    <section className="perfil-pagina animate-fade-in">
      <header className="perfil-pagina-encabezado">
        <h1>Estado Académico</h1>
        <p>Consultá el estado académico y el avance del posgrado.</p>
      </header>

      {error && (
        <p
          role="alert"
          className="mb-6 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm"
        >
          {error}
        </p>
      )}

      {/* Tarjeta de resumen de avance */}
      <article className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <header className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">Avance de Seminarios</h2>
          <span className="text-3xl font-extrabold text-blue-600">
            {porcentajeAvance}%
          </span>
        </header>

        <div
          className="w-full bg-slate-100 rounded-full h-4 shadow-inner overflow-hidden"
          role="progressbar"
          aria-valuenow={porcentajeAvance}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progreso de aprobación de seminarios"
        >
          <div
            className="bg-blue-600 h-4 rounded-full transition-all duration-1000"
            style={{ width: `${porcentajeAvance}%` }}
          ></div>
        </div>
        <p className="text-sm text-slate-500 mt-4 font-medium">
          Aprobaste {aprobados} de {totalSeminarios} seminarios inscriptos.
        </p>
      </article>

      {/* Tabla del historial de seminarios */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <header className="bg-slate-50 border-b border-slate-200 p-4">
          <h2 className="text-md font-bold text-slate-800">Historial de Seminarios</h2>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
              <tr>
                <th scope="col" className="p-4 font-bold">Seminario</th>
                <th scope="col" className="p-4 font-bold text-center w-36">Asistencia (BR-002)</th>
                <th scope="col" className="p-4 font-bold text-center w-36">Condición (BR-003)</th>
                <th scope="col" className="p-4 font-bold text-center w-32">Nota Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {cargando && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500">
                    Cargando historial académico...
                  </td>
                </tr>
              )}

              {!cargando && cursada.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500">
                    Aún no registrás inscripciones a seminarios.
                  </td>
                </tr>
              )}

              {!cargando &&
                cursada.map((seminario) => (
                  <tr
                    key={seminario.inscripcion_id}
                    className="hover:bg-blue-50 transition-colors"
                  >
                    <td className="p-4 font-semibold text-slate-700">
                      {seminario.seminario_nombre}
                    </td>

                    <td className="p-4 text-center font-medium text-slate-600">
                      {seminario.porcentaje_asistencia}% ({seminario.asistencias}/{seminario.total_clases})
                    </td>

                    <td className="p-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          seminario.estado === "APROBADO"
                            ? "bg-emerald-100 text-emerald-700"
                            : seminario.estado === "CURSANDO"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {seminario.estado}
                      </span>
                    </td>

                    <td
                      className={`p-4 text-center font-extrabold text-base ${
                        seminario.nota_final === null
                          ? "text-slate-400"
                          : seminario.nota_final >= 4
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {seminario.nota_final ?? "-"}
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