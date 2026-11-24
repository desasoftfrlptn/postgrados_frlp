import { useEffect, useState } from "react";
import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";

type EstadoAsistencia = "PRESENTE" | "AUSENTE";

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
  correo_electronico: string;
  carrera_elegida: string;
  asistencias: number;
  total_clases: number;
  porcentaje_asistencia: number | null;
  estado: string;
}

// type EstadoAsistencia =
//   | "PRESENTE"
//   | "AUSENTE";

// interface Alumno {
//   id: number;
//   nombre: string;
//   email: string;
//   carrera: string;
// }

// const alumnos: Alumno[] = [
//   {
//     id: 1,
//     nombre: "Juan Pepito",
//     email: "juan.pepito@email.com",
//     carrera: "Maestría en Educación",
//   },
//   {
//     id: 2,
//     nombre: "Thiago Bedoya Agüero",
//     email: "thiago.bedoya@email.com",
//     carrera: "Maestría en Educación",
//   },
//   {
//     id: 3,
//     nombre: "Nicolas Vazquez",
//     email: "nicolas.vazquez@email.com",
//     carrera: "Maestría en Educación",
//   },
//   {
//     id: 4,
//     nombre: "Malvina Ramirez",
//     email: "malvina.ramirez@email.com",
//     carrera: "Maestría en Educación",
//   },
//   {
//     id: 5,
//     nombre: "Justina Agüero",
//     email: "justina.aguero@email.com",
//     carrera: "Maestría en Educación",
//   },
// ];

// const asistenciaInicial: Record<
//   number,
//   EstadoAsistencia
// > = alumnos.reduce(
//   (resultado, alumno) => {
//     resultado[alumno.id] = "PRESENTE";
//     return resultado;
//   },
//   {} as Record<number, EstadoAsistencia>
// );

export default function FormularioAsistencia() {
  // const [materia, setMateria] =
  //   useState("");

  // const [turno, setTurno] =
  //   useState("");

  // const [fecha, setFecha] =
  //   useState("");

  // const [curso, setCurso] =
  //   useState("");

  // const [busqueda, setBusqueda] =
  //   useState("");

  // const [mensaje, setMensaje] =
  //   useState("");

  // const [asistencias, setAsistencias] =
  //   useState<
  //     Record<number, EstadoAsistencia>
  //   >(asistenciaInicial);
    const { user } = useAuth();
  const [seminarios, setSeminarios] = useState<SeminarioDocente[]>([]);
  const [seminarioId, setSeminarioId] = useState<string>("");
  const [alumnos, setAlumnos] = useState<AlumnoSeminario[]>([]);
  const [fecha, setFecha] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [busqueda, setBusqueda] = useState("");
  const [asistencias, setAsistencias] = useState<Record<string, EstadoAsistencia>>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargarSeminarios() {
      if (!user?.token) {
        setCargando(false);
        return;
      }
      try {
        const lista = await api.get<SeminarioDocente[]>(
          "/seminarios/mis-seminarios",
          user.token
        );
        setSeminarios(lista);
        if (lista.length > 0) {
          setSeminarioId(lista[0].id);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al cargar seminarios."
        );
      } finally {
        setCargando(false);
      }
    }
    cargarSeminarios();
  }, [user?.token]);

  useEffect(() => {
    async function cargarAlumnos() {
      if (!user?.token || !seminarioId) return;
      setCargando(true);
      try {
        const lista = await api.get<AlumnoSeminario[]>(
          `/seminarios/${seminarioId}/estudiantes`,
          user.token
        );
        setAlumnos(lista);
        // RF-DOC-002: Por defecto todos los alumnos inician AUSENTES al registrar una clase
        const inicial: Record<string, EstadoAsistencia> = {};
        lista.forEach((a) => {
          inicial[a.legajo_id] = "AUSENTE";
        });
        setAsistencias(inicial);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al cargar estudiantes."
        );
      } finally {
        setCargando(false);
      }
    }
    cargarAlumnos();
  }, [seminarioId, user?.token]);

  const alumnosFiltrados = alumnos.filter((alumno) =>
    `${alumno.apellido} ${alumno.nombre} ${alumno.dni_pasaporte}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  const cambiarAsistencia = (legajoId: string, estado: EstadoAsistencia) => {
    setAsistencias((prev) => ({
      ...prev,
      [legajoId]: estado,
    }));
    setMensaje(null);
  };

  const marcarTodosPresentes = () => {
    const nuevas: Record<string, EstadoAsistencia> = {};
    alumnos.forEach((alumno) => {
      nuevas[alumno.legajo_id] = "PRESENTE";
    });
    setAsistencias(nuevas);
    setMensaje(null);
  };

  const descartarCambios = () => {
    const reinicio: Record<string, EstadoAsistencia> = {};
    alumnos.forEach((alumno) => {
      reinicio[alumno.legajo_id] = "AUSENTE";
    });
    setAsistencias(reinicio);
    setMensaje("Se restableció la planilla (todos ausentes por defecto).");
  };

  const guardarAsistencias = async () => {
    setMensaje(null);
    setError(null);

    if (!user?.token || !seminarioId || !fecha) {
      setError("Seleccioná un seminario y una fecha válida antes de guardar.");
      return;
    }

    const presentesIds = Object.entries(asistencias)
      .filter(([, estado]) => estado === "PRESENTE")
      .map(([legajoId]) => legajoId);

    setGuardando(true);
    try {
      const actualizados = await api.post<AlumnoSeminario[]>(
        `/seminarios/${seminarioId}/asistencias`,
        {
          fecha,
          presentes_legajo_ids: presentesIds,
        },
        user.token
      );
      setAlumnos(actualizados);
      setMensaje(
        `Clase del ${fecha} registrada con éxito (${presentesIds.length} presentes de ${actualizados.length} inscriptos).`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la asistencia."
      );
    } finally {
      setGuardando(false);
    }
  };

  // const [
  //   asistenciasGuardadas,
  //   setAsistenciasGuardadas,
  // ] = useState<
  //   Record<number, EstadoAsistencia>
  // >(asistenciaInicial);

  // const alumnosFiltrados = alumnos.filter(
  //   (alumno) =>
  //     alumno.nombre
  //       .toLowerCase()
  //       .includes(busqueda.toLowerCase())
  // );

  // const cambiarAsistencia = (
  //   alumnoId: number,
  //   estado: EstadoAsistencia
  // ) => {
  //   setAsistencias({
  //     ...asistencias,
  //     [alumnoId]: estado,
  //   });

  //   setMensaje("");
  // };

  // const marcarTodosPresentes = () => {
  //   const nuevasAsistencias = {
  //     ...asistencias,
  //   };

  //   alumnos.forEach((alumno) => {
  //     nuevasAsistencias[alumno.id] =
  //       "PRESENTE";
  //   });

  //   setAsistencias(nuevasAsistencias);
  //   setMensaje("");
  // };

  // const descartarCambios = () => {
  //   setAsistencias({
  //     ...asistenciasGuardadas,
  //   });

  //   setMensaje(
  //     "Se descartaron los cambios sin guardar."
  //   );
  // };

  // const guardarAsistencias = () => {
  //   if (
  //     !materia ||
  //     !turno ||
  //     !fecha ||
  //     !curso.trim()
  //   ) {
  //     setMensaje(
  //       "Completá materia, turno, fecha y curso antes de guardar."
  //     );

  //     return;
  //   }

  //   setAsistenciasGuardadas({
  //     ...asistencias,
  //   });

  //   setMensaje(
  //     `Asistencias guardadas para ${materia} - ${fecha}.`
  //   );
  // };

  return (
     
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <header className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Registrar clase y asistencia
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Seleccioná el seminario y la fecha de la clase. Por defecto los estudiantes inician ausentes (RF-DOC-002).
        </p>
      </header>

      {mensaje && (
        <p
          role="status"
          className="mb-6 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-sm"
        >
          {mensaje}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mb-6 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm"
        >
          {error}
        </p>
      )}

      <form
        className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="flex flex-col sm:col-span-2">
          <label
            htmlFor="seminario-asistencia"
            className="text-sm font-semibold text-gray-700 mb-2"
          >
            Seminario Asignado <span className="text-red-500">*</span>
          </label>
          <select
            id="seminario-asistencia"
            required
            value={seminarioId}
            onChange={(event) => setSeminarioId(event.target.value)}
            className="border border-gray-300 rounded-md p-2 bg-gray-50 text-gray-700 h-11"
          >
            {seminarios.length === 0 && (
              <option value="">Sin seminarios asignados</option>
            )}
            {seminarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} ({s.carrera_nombre})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label
            htmlFor="fecha-clase"
            className="text-sm font-semibold text-gray-700 mb-2"
          >
            Fecha de Clase <span className="text-red-500">*</span>
          </label>
          <input
            id="fecha-clase"
            type="date"
            required
            value={fecha}
            onChange={(event) => setFecha(event.target.value)}
            className="border border-gray-300 rounded-md p-2 bg-gray-50 h-11"
          />
        </div>
      </form>

      <div className="flex flex-col sm:flex-row justify-between gap-4 items-center mb-5">
        <div className="w-full sm:w-80">
          <label htmlFor="buscar-alumno" className="sr-only">
            Buscar estudiante
          </label>
          <input
            id="buscar-alumno"
            type="search"
            placeholder="Buscar alumno por nombre o DNI..."
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
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
              <th scope="col" className="p-4 border-b">DNI / Legajo</th>
              <th scope="col" className="p-4 border-b">Alumno</th>
              <th scope="col" className="p-4 border-b">Carrera</th>
              <th scope="col" className="p-4 border-b text-center">% Asistencia (BR-002)</th>
              <th scope="col" className="p-4 border-b text-center text-emerald-700">Presente</th>
              <th scope="col" className="p-4 border-b text-center text-red-700">Ausente</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {cargando && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  Cargando estudiantes...
                </td>
              </tr>
            )}

            {!cargando &&
              alumnosFiltrados.map((alumno) => (
                <tr key={alumno.legajo_id} className="hover:bg-blue-50">
                  <td className="p-4 text-gray-500 text-sm">
                    {alumno.dni_pasaporte}
                  </td>

                  <td className="p-4 font-bold text-slate-800 text-sm">
                    {alumno.apellido}, {alumno.nombre}
                  </td>

                  <td className="p-4 text-slate-600 text-sm">
                    {alumno.carrera_elegida}
                  </td>

                  <td className="p-4 text-center text-sm font-semibold text-slate-700">
                    {alumno.porcentaje_asistencia === null ? "Sin clases registradas" : `${alumno.porcentaje_asistencia}% (${alumno.asistencias}/${alumno.total_clases})`}
                  </td>

                  <td className="p-4 text-center">
                    <input
                      type="radio"
                      name={`asistencia-${alumno.legajo_id}`}
                      checked={asistencias[alumno.legajo_id] === "PRESENTE"}
                      onChange={() =>
                        cambiarAsistencia(alumno.legajo_id, "PRESENTE")
                      }
                      aria-label={`${alumno.apellido} ${alumno.nombre} presente`}
                      className="w-5 h-5 accent-emerald-500"
                    />
                  </td>

                  <td className="p-4 text-center">
                    <input
                      type="radio"
                      name={`asistencia-${alumno.legajo_id}`}
                      checked={asistencias[alumno.legajo_id] !== "PRESENTE"}
                      onChange={() =>
                        cambiarAsistencia(alumno.legajo_id, "AUSENTE")
                      }
                      aria-label={`${alumno.apellido} ${alumno.nombre} ausente`}
                      className="w-5 h-5 accent-red-500"
                    />
                  </td>
                </tr>
              ))}

            {!cargando && alumnosFiltrados.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  No se encontraron estudiantes inscriptos en este seminario.
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
          Restablecer
        </button>

        <button
          type="button"
          disabled={guardando || alumnos.length === 0}
          onClick={guardarAsistencias}
          className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-bold py-2 px-6 rounded-md"
        >
          {guardando ? "Guardando..." : "Guardar Clase"}
        </button>
      </footer>
    </section>
  );
}