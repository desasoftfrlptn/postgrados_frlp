import { useState } from "react";

type EstadoAsistencia =
  | "PRESENTE"
  | "AUSENTE";

interface AsistenciaCargada {
  id: number;
  materia: string;
  fecha: string;
  alumno: string;
  estado: EstadoAsistencia;
  turno: string;
  curso: string;
}

const asistenciasCargadas: AsistenciaCargada[] = [
  {
    id: 1,
    materia:
      "Metodología de la Investigación",
    fecha: "2026-08-29",
    alumno: "Juan Pepito",
    estado: "PRESENTE",
    turno: "Noche",
    curso: "P21",
  },
  {
    id: 2,
    materia:
      "Metodología de la Investigación",
    fecha: "2026-08-29",
    alumno:
      "Thiago Bedoya Agüero",
    estado: "AUSENTE",
    turno: "Noche",
    curso: "P21",
  },
  {
    id: 3,
    materia:
      "Gestión de Proyectos",
    fecha: "2026-08-31",
    alumno: "Nicolas Vazquez",
    estado: "PRESENTE",
    turno: "Tarde",
    curso: "P22",
  },
  {
    id: 4,
    materia:
      "Gestión de Proyectos",
    fecha: "2026-08-31",
    alumno: "Malvina Ramirez",
    estado: "PRESENTE",
    turno: "Tarde",
    curso: "P22",
  },
  {
    id: 5,
    materia:
      "Metodología de la Investigación",
    fecha: "2026-09-02",
    alumno: "Justina Agüero",
    estado: "AUSENTE",
    turno: "Noche",
    curso: "P21",
  },
];

export default function HistorialAsistencias() {
  const [busqueda, setBusqueda] =
    useState("");

  const [materia, setMateria] =
    useState("");

  const [fecha, setFecha] =
    useState("");

  const asistenciasFiltradas =
    asistenciasCargadas.filter(
      (asistencia) => {
        const coincideAlumno =
          asistencia.alumno
            .toLowerCase()
            .includes(
              busqueda.toLowerCase()
            );

        const coincideMateria =
          !materia ||
          asistencia.materia ===
            materia;

        const coincideFecha =
          !fecha ||
          asistencia.fecha === fecha;

        return (
          coincideAlumno &&
          coincideMateria &&
          coincideFecha
        );
      }
    );

  const limpiarFiltros = () => {
    setBusqueda("");
    setMateria("");
    setFecha("");
  };

  const hayFiltros =
    busqueda !== "" ||
    materia !== "" ||
    fecha !== "";

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <header className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Asistencias cargadas
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Consultá las asistencias registradas por materia, fecha y estudiante.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="flex flex-col">
          <label
            htmlFor="buscar-asistencia"
            className="text-sm font-semibold text-gray-700 mb-2"
          >
            Estudiante
          </label>

          <input
            id="buscar-asistencia"
            type="search"
            placeholder="Buscar estudiante"
            value={busqueda}
            onChange={(event) =>
              setBusqueda(
                event.target.value
              )
            }
            className="border border-gray-300 rounded-md p-2 bg-gray-50"
          />
        </div>

        <div className="flex flex-col">
          <label
            htmlFor="filtrar-materia"
            className="text-sm font-semibold text-gray-700 mb-2"
          >
            Materia
          </label>

          <select
            id="filtrar-materia"
            value={materia}
            onChange={(event) =>
              setMateria(
                event.target.value
              )
            }
            className="border border-gray-300 rounded-md p-2 bg-gray-50"
          >
            <option value="">
              Todas las materias
            </option>

            <option value="Metodología de la Investigación">
              Metodología de la Investigación
            </option>

            <option value="Gestión de Proyectos">
              Gestión de Proyectos
            </option>
          </select>
        </div>

        <div className="flex flex-col">
          <label
            htmlFor="filtrar-fecha"
            className="text-sm font-semibold text-gray-700 mb-2"
          >
            Fecha
          </label>

          <input
            id="filtrar-fecha"
            type="date"
            value={fecha}
            onChange={(event) =>
              setFecha(
                event.target.value
              )
            }
            className="border border-gray-300 rounded-md p-2 bg-gray-50"
          />
        </div>
      </div>

      <div className="flex justify-between items-center gap-4 mb-5">
        <p className="text-sm text-gray-500">
          Resultados:{" "}
          {asistenciasFiltradas.length}
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
              <th className="p-4 border-b">
                Materia
              </th>

              <th className="p-4 border-b">
                Fecha
              </th>

              <th className="p-4 border-b">
                Estudiante
              </th>

              <th className="p-4 border-b">
                Turno
              </th>

              <th className="p-4 border-b">
                Curso
              </th>

              <th className="p-4 border-b">
                Estado
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {asistenciasFiltradas.map(
              (asistencia) => (
                <tr
                  key={asistencia.id}
                  className="hover:bg-blue-50"
                >
                  <td className="p-4 text-sm text-slate-700">
                    {asistencia.materia}
                  </td>

                  <td className="p-4 text-sm text-slate-600">
                    {asistencia.fecha}
                  </td>

                  <td className="p-4 text-sm font-semibold text-slate-800">
                    {asistencia.alumno}
                  </td>

                  <td className="p-4 text-sm text-slate-600">
                    {asistencia.turno}
                  </td>

                  <td className="p-4 text-sm text-slate-600">
                    {asistencia.curso}
                  </td>

                  <td className="p-4 text-sm">
                    <span
                      className={
                        asistencia.estado ===
                        "PRESENTE"
                          ? "font-semibold text-emerald-700"
                          : "font-semibold text-red-700"
                      }
                    >
                      {asistencia.estado ===
                      "PRESENTE"
                        ? "Presente"
                        : "Ausente"}
                    </span>
                  </td>
                </tr>
              )
            )}

            {asistenciasFiltradas.length ===
              0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-gray-500"
                >
                  No se encontraron asistencias con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}