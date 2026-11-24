// Página responsable de mostrar el registro detallado de asistencias del estudiante.
import { useEffect, useState } from "react";
import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";

interface CursadaAsistencia {
  inscripcion_id: string;
  seminario_nombre: string;
  fecha_inicio: string;
  asistencias: number;
  total_clases: number;
  porcentaje_asistencia: number | null;
}

export default function AsistenciasEstudiantePage() {
  const { user } = useAuth();
  const [registros, setRegistros] = useState<CursadaAsistencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargarAsistencias() {
      if (!user?.token) {
        setCargando(false);
        return;
      }
      try {
        const datos = await api.get<CursadaAsistencia[]>(
          "/seminarios/mi-cursada",
          user.token
        );
        setRegistros(datos);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar tus asistencias."
        );
      } finally {
        setCargando(false);
      }
    }
    cargarAsistencias();
  }, [user?.token]);

  return (
    <section className="perfil-pagina animate-fade-in">
      <header className="perfil-pagina-encabezado">
        <h1>Asistencias</h1>
        <p>Consultá tu registro de presentismo y el porcentaje acumulado por seminario (mínimo requerido: 75%).</p>
      </header>

      {error && (
        <p
          role="alert"
          className="mb-6 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm"
        >
          {error}
        </p>
      )}

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <header className="bg-slate-50 border-b border-slate-200 p-4">
          <h2 className="text-md font-bold text-slate-800">Presentismo por Seminario</h2>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
              <tr>
                <th scope="col" className="p-4 font-bold">Seminario</th>
                <th scope="col" className="p-4 font-bold text-center">Inicio</th>
                <th scope="col" className="p-4 font-bold text-center">Clases Presentes</th>
                <th scope="col" className="p-4 font-bold text-center">Condición Asistencia</th>
                <th scope="col" className="p-4 font-bold text-center">Asistencia Acumulada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {cargando && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    Cargando asistencias...
                  </td>
                </tr>
              )}

              {!cargando && registros.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    No tenés asistencias registradas aún.
                  </td>
                </tr>
              )}

              {!cargando &&
                registros.map((registro) => {
                  const sinClases = registro.total_clases === 0 || registro.porcentaje_asistencia === null;
                  const cumpleMinimo = !sinClases && registro.asistencias * 100 >= registro.total_clases * 75;
                  return (
                    <tr
                      key={registro.inscripcion_id}
                      className="hover:bg-blue-50 transition-colors"
                    >
                      <td className="p-4 font-semibold text-slate-700">
                        {registro.seminario_nombre}
                      </td>

                      <td className="p-4 text-center font-medium text-slate-600">
                        <time dateTime={registro.fecha_inicio}>
                          {new Date(registro.fecha_inicio).toLocaleDateString("es-AR")}
                        </time>
                      </td>

                      <td className="p-4 text-center font-medium text-slate-700">
                        {registro.asistencias} de {registro.total_clases}
                      </td>

                      <td className="p-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold flex items-center justify-center w-32 mx-auto ${
                            sinClases ? "bg-slate-100 text-slate-600" : cumpleMinimo
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          <span aria-hidden="true" className="mr-1">
                            {sinClases ? "—" : cumpleMinimo ? "✔" : "✖"}
                          </span>
                          {sinClases ? "Sin clases registradas" : cumpleMinimo ? "Regular (>=75%)" : "Bajo (<75%)"}
                        </span>
                      </td>

                      <td className="p-4 text-center font-bold text-slate-800">
                        {sinClases ? "—" : `${registro.porcentaje_asistencia}%`}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}