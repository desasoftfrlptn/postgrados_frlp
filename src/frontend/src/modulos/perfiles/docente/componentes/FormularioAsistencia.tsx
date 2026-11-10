import { useState } from "react";

type EstadoAsistencia =
  | "PRESENTE"
  | "AUSENTE";

interface Alumno {
  id: number;
  nombre: string;
  email: string;
  carrera: string;
}

const alumnos: Alumno[] = [
  {
    id: 1,
    nombre: "Juan Pepito",
    email: "juan.pepito@email.com",
    carrera: "Maestría en Educación",
  },
  {
    id: 2,
    nombre: "Thiago Bedoya Agüero",
    email: "thiago.bedoya@email.com",
    carrera: "Maestría en Educación",
  },
  {
    id: 3,
    nombre: "Nicolas Vazquez",
    email: "nicolas.vazquez@email.com",
    carrera: "Maestría en Educación",
  },
  {
    id: 4,
    nombre: "Malvina Ramirez",
    email: "malvina.ramirez@email.com",
    carrera: "Maestría en Educación",
  },
  {
    id: 5,
    nombre: "Justina Agüero",
    email: "justina.aguero@email.com",
    carrera: "Maestría en Educación",
  },
];

const asistenciaInicial: Record<
  number,
  EstadoAsistencia
> = alumnos.reduce(
  (resultado, alumno) => {
    resultado[alumno.id] = "PRESENTE";
    return resultado;
  },
  {} as Record<number, EstadoAsistencia>
);

export default function FormularioAsistencia() {
  const [materia, setMateria] =
    useState("");

  const [turno, setTurno] =
    useState("");

  const [fecha, setFecha] =
    useState("");

  const [curso, setCurso] =
    useState("");

  const [busqueda, setBusqueda] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const [asistencias, setAsistencias] =
    useState<
      Record<number, EstadoAsistencia>
    >(asistenciaInicial);

  const [
    asistenciasGuardadas,
    setAsistenciasGuardadas,
  ] = useState<
    Record<number, EstadoAsistencia>
  >(asistenciaInicial);

  const alumnosFiltrados = alumnos.filter(
    (alumno) =>
      alumno.nombre
        .toLowerCase()
        .includes(busqueda.toLowerCase())
  );

  const cambiarAsistencia = (
    alumnoId: number,
    estado: EstadoAsistencia
  ) => {
    setAsistencias({
      ...asistencias,
      [alumnoId]: estado,
    });

    setMensaje("");
  };

  const marcarTodosPresentes = () => {
    const nuevasAsistencias = {
      ...asistencias,
    };

    alumnos.forEach((alumno) => {
      nuevasAsistencias[alumno.id] =
        "PRESENTE";
    });

    setAsistencias(nuevasAsistencias);
    setMensaje("");
  };

  const descartarCambios = () => {
    setAsistencias({
      ...asistenciasGuardadas,
    });

    setMensaje(
      "Se descartaron los cambios sin guardar."
    );
  };

  const guardarAsistencias = () => {
    if (
      !materia ||
      !turno ||
      !fecha ||
      !curso.trim()
    ) {
      setMensaje(
        "Completá materia, turno, fecha y curso antes de guardar."
      );

      return;
    }

    setAsistenciasGuardadas({
      ...asistencias,
    });

    setMensaje(
      `Asistencias guardadas para ${materia} - ${fecha}.`
    );
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <header className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Registrar asistencia
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Seleccioná la materia, el turno y la fecha para registrar la asistencia.
        </p>
      </header>

      {mensaje && (
        <p
          role="status"
          className="mb-6 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-md"
        >
          {mensaje}
        </p>
      )}

      <form
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-6"
        onSubmit={(event) =>
          event.preventDefault()
        }
      >
        <div className="flex flex-col lg:col-span-2">
          <label
            htmlFor="materia"
            className="text-sm font-semibold text-gray-700 mb-2"
          >
            Seleccionar Materia
            <span className="text-red-500">
              {" "}
              *
            </span>
          </label>

          <select
            id="materia"
            required
            value={materia}
            onChange={(event) =>
              setMateria(
                event.target.value
              )
            }
            className="border border-gray-300 rounded-md p-2 bg-gray-50 text-gray-700 h-11"
          >
            <option value="">
              Seleccionar
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
            htmlFor="turno"
            className="text-sm font-semibold text-gray-700 mb-2"
          >
            Turno
            <span className="text-red-500">
              {" "}
              *
            </span>
          </label>

          <select
            id="turno"
            required
            value={turno}
            onChange={(event) =>
              setTurno(
                event.target.value
              )
            }
            className="border border-gray-300 rounded-md p-2 bg-gray-50 text-gray-700 h-11"
          >
            <option value="">
              Seleccionar
            </option>

            <option value="Mañana">
              Mañana
            </option>

            <option value="Tarde">
              Tarde
            </option>

            <option value="Noche">
              Noche
            </option>
          </select>
        </div>

        <div className="flex flex-col">
          <label
            htmlFor="fecha"
            className="text-sm font-semibold text-gray-700 mb-2"
          >
            Fecha
            <span className="text-red-500">
              {" "}
              *
            </span>
          </label>

          <input
            id="fecha"
            type="date"
            required
            value={fecha}
            onChange={(event) =>
              setFecha(
                event.target.value
              )
            }
            className="border border-gray-300 rounded-md p-2 bg-gray-50 h-11"
          />
        </div>

        <div className="flex flex-col">
          <label
            htmlFor="curso"
            className="text-sm font-semibold text-gray-700 mb-2"
          >
            Curso
            <span className="text-red-500">
              {" "}
              *
            </span>
          </label>

          <input
            id="curso"
            type="text"
            required
            value={curso}
            onChange={(event) =>
              setCurso(
                event.target.value
              )
            }
            placeholder="Ej: P21"
            className="border border-gray-300 rounded-md p-2 bg-gray-50 h-11"
          />
        </div>
      </form>

      <div className="flex flex-col sm:flex-row justify-between gap-4 items-center mb-5">
        <div className="w-full sm:w-80">
          <label
            htmlFor="buscar-alumno"
            className="sr-only"
          >
            Buscar estudiante
          </label>

          <input
            id="buscar-alumno"
            type="search"
            placeholder="Buscar alumno"
            value={busqueda}
            onChange={(event) =>
              setBusqueda(
                event.target.value
              )
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-full text-sm h-11"
          />
        </div>

        <button
          type="button"
          onClick={marcarTodosPresentes}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-md text-sm h-11"
        >
          Marcar a todos presentes
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-100 text-slate-700 text-sm">
            <tr>
              <th className="p-4 border-b">
                #
              </th>

              <th className="p-4 border-b">
                Alumno
              </th>

              <th className="p-4 border-b">
                Correo
              </th>

              <th className="p-4 border-b">
                Carrera
              </th>

              <th className="p-4 border-b text-center text-emerald-700">
                Presente
              </th>

              <th className="p-4 border-b text-center text-red-700">
                Ausente
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {alumnosFiltrados.map(
              (alumno) => (
                <tr
                  key={alumno.id}
                  className="hover:bg-blue-50"
                >
                  <td className="p-4 text-gray-500 text-sm">
                    {alumno.id}
                  </td>

                  <td className="p-4 font-bold text-slate-800 text-sm">
                    {alumno.nombre}
                  </td>

                  <td className="p-4 text-slate-600 text-sm">
                    {alumno.email}
                  </td>

                  <td className="p-4 text-slate-600 text-sm">
                    {alumno.carrera}
                  </td>

                  <td className="p-4 text-center">
                    <input
                      type="radio"
                      name={`asistencia-${alumno.id}`}
                      checked={
                        asistencias[
                          alumno.id
                        ] ===
                        "PRESENTE"
                      }
                      onChange={() =>
                        cambiarAsistencia(
                          alumno.id,
                          "PRESENTE"
                        )
                      }
                      aria-label={`${alumno.nombre} presente`}
                      className="w-5 h-5 accent-emerald-500"
                    />
                  </td>

                  <td className="p-4 text-center">
                    <input
                      type="radio"
                      name={`asistencia-${alumno.id}`}
                      checked={
                        asistencias[
                          alumno.id
                        ] ===
                        "AUSENTE"
                      }
                      onChange={() =>
                        cambiarAsistencia(
                          alumno.id,
                          "AUSENTE"
                        )
                      }
                      aria-label={`${alumno.nombre} ausente`}
                      className="w-5 h-5 accent-red-500"
                    />
                  </td>
                </tr>
              )
            )}

            {alumnosFiltrados.length ===
              0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-gray-500"
                >
                  No se encontraron estudiantes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="mt-6 flex justify-end gap-4">
        <button
          type="button"
          onClick={descartarCambios}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-md"
        >
          Descartar
        </button>

        <button
          type="button"
          onClick={guardarAsistencias}
          className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-6 rounded-md"
        >
          Guardar
        </button>
      </footer>
    </section>
  );
}