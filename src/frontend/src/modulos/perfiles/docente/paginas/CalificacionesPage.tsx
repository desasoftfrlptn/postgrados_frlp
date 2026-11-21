// Página responsable de permitir al docente registrar las calificaciones finales de sus alumnos (Formulario de carga).
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
  porcentaje_asistencia: number;
  nota_final: number | null;
  estado: string;
}
export default function CalificacionesPage() {
  // Simulamos la lista de alumnos inscriptos en el seminario
  // const alumnos = [
  //   { id: "LEG-001", apellido: "Pérez", nombre: "Juan" },
  //   { id: "LEG-002", apellido: "Gómez", nombre: "Ana" },
  //   { id: "LEG-003", apellido: "López", nombre: "Carlos" }
  // ];

  // // Función que maneja el evento de envío del formulario
  // const handleSubmit = async (event: React.FormEvent) => {
  //   // Evitamos que el navegador recargue la página (comportamiento HTML por defecto)
  //   event.preventDefault();
    
  //   // Aquí a futuro irá el Fetch/Async Await para enviar los datos al Backend
  //   alert("Las calificaciones se han guardado exitosamente.");
  // };


const { user } = useAuth();
const [seminarios, setSeminarios] = useState<SeminarioDocente[]>([]);
const [seminarioId, setSeminarioId] = useState<string>("");
const [alumnos, setAlumnos] = useState<AlumnoSeminario[]>([]);
const [notas, setNotas] = useState<Record<string, string>>({});
const [cargando, setCargando] = useState(true);
const [mensaje, setMensaje] = useState<string | null>(null);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  async function cargarMisSeminarios() {
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
  cargarMisSeminarios();
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
      const notasIniciales: Record<string, string> = {};
      lista.forEach((a) => {
        notasIniciales[a.legajo_id] =
          a.nota_final !== null ? String(a.nota_final) : "";
      });
      setNotas(notasIniciales);
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

const handleSubmit = async (event: React.FormEvent) => {
  event.preventDefault();
  setMensaje(null);
  setError(null);

  if (!user?.token || !seminarioId) return;

  try {
    const actualizados: AlumnoSeminario[] = [];

    for (const alumno of alumnos) {
      const valorTexto = notas[alumno.legajo_id]?.trim();
      if (!valorTexto) continue;

      const valorNumero = Number(valorTexto);
      if (
        Number.isNaN(valorNumero) ||
        valorNumero < 1 ||
        valorNumero > 10 ||
        Math.round(valorNumero * 10) !== valorNumero * 10
      ) {
        setError(
          `La nota de ${alumno.apellido}, ${alumno.nombre} debe estar entre 1 y 10 con máximo un decimal (ej: 7.5).`
        );
        return;
      }

      const respuesta = await api.patch<AlumnoSeminario>(
        `/seminarios/${seminarioId}/estudiantes/${alumno.legajo_id}/calificacion`,
        { nota_final: valorNumero },
        user.token
      );
      actualizados.push(respuesta);
    }

    if (actualizados.length > 0) {
      setAlumnos((prev) =>
        prev.map(
          (a) =>
            actualizados.find((act) => act.legajo_id === a.legajo_id) ?? a
        )
      );
    }
        setMensaje("Las calificaciones se han guardado exitosamente.");
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "No se pudieron guardar las calificaciones."
    );
  }
};

  const anularNota = async (alumno: AlumnoSeminario) => {
    setMensaje(null);
    setError(null);
    if (!user?.token || !seminarioId) return;

    try {
      const actualizado = await api.delete<AlumnoSeminario>(
        `/seminarios/${seminarioId}/estudiantes/${alumno.legajo_id}/calificacion`,
        user.token
      );
      setAlumnos((prev) =>
        prev.map((a) => (a.legajo_id === alumno.legajo_id ? actualizado : a))
      );
      setNotas((prev) => ({
        ...prev,
        [alumno.legajo_id]: "",
      }));
      setMensaje(
        `Se anuló la calificación de ${alumno.apellido}, ${alumno.nombre} (vuelve a estado CURSANDO).`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo anular la calificación."
      );
    }
  };

  const seminarioActual = seminarios.find((s) => s.id === seminarioId);

  return (
    <section className="perfil-pagina animate-fade-in">
      <header className="bg-slate-50 border-b border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            Planilla de Acta de Cierre
          </h2>
            <p className="text-sm text-slate-500 mt-1">
              Condición automática (BR-003): Aprobado requiere Nota ≥ 4 y Asistencia ≥ 75%
            </p>
        </div>

        <div>
          <label htmlFor="selector-seminario" className="sr-only">
            Seleccionar seminario
          </label>
          <select
            id="selector-seminario"
            value={seminarioId}
            onChange={(e) => setSeminarioId(e.target.value)}
            className="border border-slate-300 rounded-md p-2 text-sm text-slate-700 bg-white"
          >
            {seminarios.length === 0 && (
              <option value="">Sin seminarios asignados</option>
            )}
            {seminarios.map((sem) => (
              <option key={sem.id} value={sem.id}>
                {sem.nombre} ({sem.carrera_nombre})
              </option>
            ))}
          </select>
        </div>
      </header>

   {mensaje && (
     <p role="status" className="m-5 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-sm">
       {mensaje}
     </p>
   )}

   {error && (
     <p role="alert" className="m-5 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
       {error}
     </p>
   )}

   {cargando && (
     <p role="status" className="p-5 text-slate-600 text-sm">
       Cargando planilla de estudiantes...
     </p>
   )}

      <article className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
        <header className="bg-slate-50 border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-800">
            {seminarioActual?.nombre ?? "Seminario"}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {seminarioActual?.carrera_nombre ?? "Posgrado"} - Acta de Cierre
          </p>
        </header>

        {/* Formulario que envuelve toda la tabla de carga de notas */}
        <form onSubmit={handleSubmit} className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                <tr>
                  <th scope="col" className="p-4 font-bold">Legajo</th>
                  <th scope="col" className="p-4 font-bold">Alumno</th>
                  <th scope="col" className="p-4 font-bold text-center">Condición</th>
                  <th scope="col" className="p-4 font-bold text-center">Nota Final (1-10)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {alumnos.map((alumno) => (
                  <tr key={alumno.legajo_id} className="hover:bg-blue-50 transition-colors">
                    
                    <td className="p-4 font-semibold text-slate-600">
                      {alumno.dni_pasaporte}
                    </td>
                    
                    <td className="p-4 font-bold text-slate-800">
                      {alumno.apellido}, {alumno.nombre}
                    </td>
                  {/* 
                    <td className="p-4 text-center">
                      {/* Label accesible, visualmente oculto mediante sr-only }
                      <label htmlFor={`condicion-${alumno.id}`} className="sr-only">
                        Condición académica de {alumno.nombre}
                      </label>
                      <select 
                        id={`condicion-${alumno.id}`}
                        name={`condicion-${alumno.id}`}
                        defaultValue=""
                        required
                        className="border border-slate-300 rounded-md p-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-[150px]"
                      >
                        <option value="" disabled>Seleccionar...</option>
                        <option value="Aprobado">Aprobado</option>
                        <option value="Regular">Regular</option>
                        <option value="Libre">Libre</option>
                        <option value="Ausente">Ausente</option> 
                      </select>
                    </td>
                  */}
                    <td className="p-4 text-center">
                      <span className="font-semibold text-slate-700">
                        {alumno.porcentaje_asistencia}% asist.
                      </span>{" "}
                      —{" "}
                      <span className="font-bold">
                        {alumno.estado}
                      </span>
                    </td>
                    
                    <td className="p-4 text-center">
                      {/* Label accesible, vinculado al input por ID */}
                      <label htmlFor={`nota-${alumno.legajo_id}`} className="sr-only">
                        Nota final de {alumno.nombre}
                      </label>
                      <input 
                        type="number" 
                        id={`nota-${alumno.legajo_id}`}
                        name={`nota-${alumno.legajo_id}`}
                        min="1" 
                        max="10"
                        step="0.1"
                        value={notas[alumno.legajo_id] ?? ""}
                        onChange={(e) =>
                          setNotas({
                            ...notas,
                            [alumno.legajo_id]: e.target.value,
                          })
                        }
                                                placeholder="Ej: 7.5"
                        className="border border-slate-300 rounded-md p-2 text-center text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
                      />
                      {alumno.nota_final !== null && (
                        <button
                          type="button"
                          onClick={() => anularNota(alumno)}
                          className="ml-2 px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded text-xs transition-colors"
                          title="Anular calificación cargada"
                        >
                          Anular
                        </button>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer del formulario con botones de acción nativos */}
          <footer className="bg-slate-50 p-5 border-t border-slate-200 flex justify-end gap-4">
            <button 
              type="reset" 
              className="px-6 py-2 rounded-md font-bold text-slate-600 hover:bg-slate-200 transition-colors focus:ring-2 focus:ring-slate-400 focus:outline-none"
            >
              Limpiar
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 rounded-md font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            >
              Guardar Calificaciones
            </button>
          </footer>
        </form>
      </article>
    </section>
  );
}