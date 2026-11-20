import { useEffect, useState } from "react";
import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";

interface SeminarioDocente {
  id: string;
  nombre: string;
  carrera_nombre: string;
}

interface AlumnoSeminario {
  inscripcion_id: string;
  legajo_id: string;
  dni_pasaporte: string;
  apellido: string;
  nombre: string;
  carrera_elegida: string;
  asistencias: number;
  total_clases: number;
  porcentaje_asistencia: number;
}

interface RegistroResumen {
  inscripcion_id: string;
  seminario_id: string;
  seminario_nombre: string;
  dni_pasaporte: string;
  alumno: string;
  carrera_elegida: string;
  asistencias: number;
  total_clases: number;
  porcentaje_asistencia: number;
}

export default function HistorialAsistencias() {
  const { user } = useAuth();
  const [seminarios, setSeminarios] = useState<SeminarioDocente[]>([]);
  const [registros, setRegistros] = useState<RegistroResumen[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [seminarioFiltro, setSeminarioFiltro] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargarHistorial() {
      if (!user?.token) {
        setCargando(false);
        return;
      }
      setCargando(true);
      try {
        const listaSeminarios = await api.get<SeminarioDocente[]>(
          "/seminarios/mis-seminarios",
          user.token
        );
        setSeminarios(listaSeminarios);

        const acumulados: RegistroResumen[] = [];
        for (const sem of listaSeminarios) {
          const alumnos = await api.get<AlumnoSeminario[]>(
            `/seminarios/${sem.id}/estudiantes`,
            user.token
          );
          for (const a of alumnos) {
            acumulados.push({
              inscripcion_id: a.inscripcion_id,
              seminario_id: sem.id,
              seminario_nombre: sem.nombre,
              dni_pasaporte: a.dni_pasaporte,
              alumno: `${a.apellido}, ${a.nombre}`,
              carrera_elegida: a.carrera_elegida,
              asistencias: a.asistencias,
              total_clases: a.total_clases,
              porcentaje_asistencia: a.porcentaje_asistencia,
            });
          }
        }
        setRegistros(acumulados);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al consultar las asistencias cargadas."
        );
      } finally {
        setCargando(false);
      }
    }
    cargarHistorial();
  }, [user?.token]);

  const asistenciasFiltradas = registros.filter((r) => {
    const coincideAlumno = `${r.alumno} ${r.dni_pasaporte}`
      .toLowerCase()
      .includes(busqueda.toLowerCase());
    const coincideSeminario =
      !seminarioFiltro || r.seminario_id === seminarioFiltro;
    return coincideAlumno && coincideSeminario;
  });

  const limpiarFiltros = () => {
    setBusqueda("");
    setSeminarioFiltro("");
  };

  const hayFiltros = busqueda !== "" || seminarioFiltro !== "";

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <header className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Asistencias cargadas
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Consultá el resumen de presentismo acumulado por seminario y estudiante (BR-002).
        </p>
      </header>

      {error && (
        <p
          role="alert"
          className="mb-6 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm"
        >
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="flex flex-col">
          <label
            htmlFor="buscar-asistencia"
            className="text-sm font-semibold text-gray-700 mb-2"
          >
            Estudiante o DNI
          </label>
          <input
            id="buscar-asistencia"
            type="search"
            placeholder="Buscar estudiante..."
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            className="border border-gray-300 rounded-md p-2 bg-gray-50"
          />
        </div>

        <div className="flex flex-col">
          <label
            htmlFor="filtrar-seminario"
            className="text-sm font-semibold text-gray-700 mb-2"
          >
            Seminario
          </label>
          <select
            id="filtrar-seminario"
            value={seminarioFiltro}
            onChange={(event) => setSeminarioFiltro(event.target.value)}
            className="border border-gray-300 rounded-md p-2 bg-gray-50"
          >
            <option value="">Todos los seminarios</option>
            {seminarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-between items-center gap-4 mb-5">
        <p className="text-sm text-gray-500">
          Resultados: {asistenciasFiltradas.length}
        </p>

        <button
          type="button"
          onClick={limpiarFiltros}
          disabled={!hayFiltros}
          className={
            hayFiltros
              ? "border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md font-semibold hover:bg-gray-50"
              : "border border-gray-200 bg-gray-100 text-gray-400 px-4 py-2 rounded-md font-semibold cursor-not-allowed"
          }
        >
          Limpiar filtros
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-100 text-slate-700 text-sm">
            <tr>
              <th scope="col" className="p-4 border-b">Seminario</th>
              <th scope="col" className="p-4 border-b">DNI</th>
              <th scope="col" className="p-4 border-b">Estudiante</th>
              <th scope="col" className="p-4 border-b">Carrera</th>
              <th scope="col" className="p-4 border-b text-center">Clases Presentes</th>
              <th scope="col" className="p-4 border-b text-center">% Asistencia</th>
              <th scope="col" className="p-4 border-b text-center">Condición</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {cargando && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  Cargando historial de asistencias...
                </td>
              </tr>
            )}

            {!cargando &&
              asistenciasFiltradas.map((r) => {
                const regular = r.porcentaje_asistencia >= 75;
                return (
                  <tr key={r.inscripcion_id} className="hover:bg-blue-50">
                    <td className="p-4 text-sm text-slate-700">
                      {r.seminario_nombre}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {r.dni_pasaporte}
                    </td>
                    <td className="p-4 text-sm font-semibold text-slate-800">
                      {r.alumno}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {r.carrera_elegida}
                    </td>
                    <td className="p-4 text-sm text-center text-slate-700">
                      {r.asistencias} / {r.total_clases}
                    </td>
                    <td className="p-4 text-sm text-center font-bold text-slate-800">
                      {r.porcentaje_asistencia}%
                    </td>
                    <td className="p-4 text-sm text-center">
                      <span
                        className={
                          regular
                            ? "font-semibold text-emerald-700"
                            : "font-semibold text-red-700"
                        }
                      >
                        {regular ? "Regular (>=75%)" : "Bajo (<75%)"}
                      </span>
                    </td>
                  </tr>
                );
              })}

            {!cargando && asistenciasFiltradas.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  No se encontraron registros con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}