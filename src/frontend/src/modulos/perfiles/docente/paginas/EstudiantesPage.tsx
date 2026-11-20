// Página responsable de mostrar al docente la información detallada de sus estudiantes inscriptos.
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
  correo_electronico: string;
  carrera_elegida: string;
  estado: string;
    nota_final: number | null;
}

export default function EstudiantesPage() {
  // Datos simulados (Mock) de los estudiantes a cargo del docente
  // const estudiantes = [
  //   { 
  //     id: "LEG-001", 
  //     apellido: "Pérez", 
  //     nombre: "Juan", 
  //     correo: "juan@estudiante.utn.edu.ar", 
  //     carreraPosgrado: "Maestría en Ingeniería en Sistemas de Información",
  //     seminario: "Metodología de la Investigación"
  //   },
  //   { 
  //     id: "LEG-002", 
  //     apellido: "Gómez", 
  //     nombre: "Ana", 
  //     correo: "ana@estudiante.utn.edu.ar", 
  //     carreraPosgrado: "Especialización en Gestión de TIC",
  //     seminario: "Metodología de la Investigación"
  //   },
  //   { 
  //     id: "LEG-003", 
  //     apellido: "López", 
  //     nombre: "Carlos", 
  //     correo: "carlos@estudiante.utn.edu.ar", 
  //     carreraPosgrado: "Maestría en Ingeniería en Sistemas de Información",
  //     seminario: "Gestión de Proyectos IT"
  //   }
  // ];

const { user } = useAuth();
const [seminarios, setSeminarios] = useState<SeminarioDocente[]>([]);
const [seminarioId, setSeminarioId] = useState<string>("");
const [estudiantes, setEstudiantes] = useState<AlumnoSeminario[]>([]);
const [busqueda, setBusqueda] = useState("");
const [dniNuevo, setDniNuevo] = useState("");
const [cargando, setCargando] = useState(true);
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
  async function cargarEstudiantes() {
    if (!user?.token || !seminarioId) return;
    setCargando(true);
    try {
      const lista = await api.get<AlumnoSeminario[]>(
        `/seminarios/${seminarioId}/estudiantes`,
        user.token
      );
      setEstudiantes(lista);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar estudiantes."
      );
    } finally {
      setCargando(false);
    }
  }
  cargarEstudiantes();
}, [seminarioId, user?.token]);

  const asociarEstudiante = async (event: React.FormEvent) => {
    event.preventDefault();
    setMensaje(null);
    setError(null);

    if (!user?.token) return;
    if (!seminarioId) {
      setError("Seleccioná un seminario asignado antes de inscribir.");
      return;
    }
    if (!dniNuevo.trim()) {
      setError("Ingresá el DNI del estudiante a inscribir.");
      return;
    }

    try {
      const nuevo = await api.post<AlumnoSeminario>(
        `/seminarios/${seminarioId}/estudiantes`,
        { dni_pasaporte: dniNuevo.trim() },
        user.token
      );
      setEstudiantes((prev) => [...prev, nuevo]);
      setDniNuevo("");
      setMensaje(
        `Estudiante ${nuevo.apellido}, ${nuevo.nombre} asociado al seminario.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo asociar al estudiante."
      );
    }
  };

  const desvincularEstudiante = async (estudiante: AlumnoSeminario) => {
    setMensaje(null);
    setError(null);

    if (!user?.token || !seminarioId) return;

    try {
      await api.delete(
        `/seminarios/${seminarioId}/estudiantes/${estudiante.legajo_id}`,
        user.token
      );
      setEstudiantes((prev) =>
        prev.filter((e) => e.legajo_id !== estudiante.legajo_id)
      );
      setMensaje(
        `Estudiante ${estudiante.apellido}, ${estudiante.nombre} desvinculado del seminario.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo desvincular al estudiante."
      );
    }
  };


const seminarioActual = seminarios.find((s) => s.id === seminarioId);
const estudiantesFiltrados = estudiantes.filter((e) =>
  `${e.apellido} ${e.nombre} ${e.dni_pasaporte}`
    .toLowerCase()
    .includes(busqueda.toLowerCase())
);

  return (
    <section className="perfil-pagina animate-fade-in">
      <header className="perfil-pagina-encabezado">
        <h1>Información de Estudiantes</h1>
        <p>Consultá el listado y los datos de contacto de los alumnos inscriptos en tus materias.</p>
      </header>

      <form
        onSubmit={asociarEstudiante}
        className="bg-white rounded-xl shadow-sm border border-slate-200 
      p-5 mt-6 flex flex-col sm:flex-row gap-4 items-end"
        >
          <div className="flex-1 w-full">
            <label htmlFor="seminario-est" className="block text-sm font-semibold 
          text-slate-700 mb-1">
              Seminario asignado
            </label>
            <select
              id="seminario-est"
              value={seminarioId}
              onChange={(e) => setSeminarioId(e.target.value)}
              className="w-full border border-slate-300 rounded-md p-2 
            text-sm text-slate-700 bg-white"
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

   <div className="w-full sm:w-64">
     <label htmlFor="dni-asociar" className="block text-sm font-semibold text-slate-700 mb-1">
       Asociar alumno por DNI
     </label>
     <input
       id="dni-asociar"
       type="text"
       value={dniNuevo}
       onChange={(e) => setDniNuevo(e.target.value)}
       placeholder="Ej: 38123456"
       className="w-full border border-slate-300 rounded-md p-2 text-sm text-slate-700"
     />
   </div>

   <button
     type="submit"
     className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-md text-sm"
   >
     Inscribir al Seminario
   </button>
</form>

 {mensaje && (
   <p role="status" className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-sm">
     {mensaje}
   </p>
 )}

 {error && (
   <p role="alert" className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
     {error}
   </p>
 )}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
        <header className="bg-slate-50 border-b border-slate-200 p-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h2 className="text-lg font-bold text-slate-800">Directorio de Alumnos</h2>
          
          {/* Pequeño buscador visual, sin lógica compleja para no sobre-ingeniar */}
          <div className="relative">
            <label htmlFor="buscar-alumno" className="sr-only">Buscar estudiante por nombre</label>
            <input 
              type="search" 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              id="buscar-alumno" 
              placeholder="Buscar estudiante..." 
              className="border border-slate-300 rounded-md py-2 px-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
            />
          </div>
        </header>

        <div className="overflow-x-auto">
          {/* Tabla de datos tabulares (HTML Semántico) */}
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
              <tr>
                <th scope="col" className="p-4 font-bold">Legajo</th>
                <th scope="col" className="p-4 font-bold">Estudiante</th>
                <th scope="col" className="p-4 font-bold">Seminario</th>
                <th scope="col" className="p-4 font-bold">Carrera de Posgrado</th>
                <th scope="col" className="p-4 font-bold text-center">Contacto</th>
                <th scope="col" className="p-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {cargando && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-500">
                    Cargando estudiantes...
                  </td>
                </tr>
              )}
              {estudiantesFiltrados.map((estudiante) => (
                <tr key={estudiante.legajo_id} className="hover:bg-blue-50 transition-colors">
                  
                  <td className="p-4 font-semibold text-slate-600 whitespace-nowrap">
                    {estudiante.dni_pasaporte}
                  </td>
                  
                  <td className="p-4 font-bold text-slate-800 whitespace-nowrap">
                    {estudiante.apellido}, {estudiante.nombre}
                  </td>
                  
                  <td className="p-4 font-medium text-slate-700">
                    {seminarioActual?.nombre ?? "-"}
                  </td>
                  
                  <td className="p-4 text-slate-600">
                    {estudiante.carrera_elegida}
                  </td>
                  
  
                  <td className="p-4 text-center">
                    {/* Enlace de correo semántico y accesible */}
                    <a 
                      href={`mailto:${estudiante.correo_electronico}`}
                      className="inline-flex items-center justify-center p-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                      aria-label={`Enviar correo a ${estudiante.nombre} ${estudiante.apellido}`}
                    >
                      <span aria-hidden="true">✉️</span>
                    </a>
                  </td>

               <td className="p-4 text-center">
                 <button
                   type="button"
                   disabled={estudiante.nota_final !== null}
                   onClick={() => desvincularEstudiante(estudiante)}
                   className="px-3 py-1 bg-red-100 hover:bg-red-200 disabled:bg-slate-100 disabled:text-slate-400 text-red-700 font-semibold rounded-md text-xs transition-colors"
                   title={
                     estudiante.nota_final !== null
                       ? "No se puede desvincular porque ya tiene nota final"
                       : "Desvincular estudiante del seminario"
                   }
                 >
                   Desvincular
                 </button>
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