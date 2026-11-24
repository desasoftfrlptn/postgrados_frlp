// Página responsable de mostrar el historial académico, avance e inscripción a seminarios del estudiante.
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../../../../shared/api/client";
import ConfirmacionModal from "../../../../shared/componentes/ConfirmacionModal/ConfirmacionModal";
import { useConfirmacion } from "../../../../shared/hooks/useConfirmacion";
import { useAuth } from "../../../manejo-sesion/useAuth";

interface CursadaSeminario {
  inscripcion_id: string;
  seminario_id: string;
  seminario_nombre: string;
  carrera_nombre: string;
  asistencias: number;
  total_clases: number;
  porcentaje_asistencia: number | null;
  nota_final: number | null;
  estado: string;
}

interface SeminarioDisponible {
  id: string;
  nombre: string;
  carrera_nombre: string;
  docente_nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
}

export default function EstadoAcademicoPage() {
  const { user } = useAuth();
  const [parametros] = useSearchParams();
  const gestion = parametros.get("vista") === "seminarios";
  const confirmacion = useConfirmacion();
  const [revision, setRevision] = useState(0);
  const [errorCarga, setErrorCarga] = useState(false);
  const [cursada, setCursada] = useState<CursadaSeminario[]>([]);
  const [disponibles, setDisponibles] = useState<SeminarioDisponible[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    async function cargarDatosAcademicos() {
      if (!user?.token) {
        setCargando(false);
        return;
      }
      try {
        setCargando(true); setErrorCarga(false); setError(null);
        const [datosCursada, datosDisponibles] = await Promise.all([
          api.get<CursadaSeminario[]>("/seminarios/mi-cursada", user.token),
          api.get<SeminarioDisponible[]>("/seminarios/disponibles", user.token),
        ]);
        if (!vigente) return;
        setCursada(datosCursada);
        setDisponibles(datosDisponibles);
      } catch (err) {
        if (!vigente) return;
        setErrorCarga(true);
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar tu estado académico."
        );
      } finally {
        if (vigente) setCargando(false);
      }
    }
    void cargarDatosAcademicos();
    return () => { vigente = false; };
  }, [user?.token, revision]);

  const inscribirme = async (seminarioId: string) => {
    setMensaje(null);
    setError(null);
    if (!user?.token) return;

    try {
      const nueva = await api.post<CursadaSeminario>(
        `/seminarios/${seminarioId}/mi-inscripcion`,
        {},
        user.token
      );
      setCursada((prev) => [nueva, ...prev.filter(s => s.seminario_id !== nueva.seminario_id)]);
      setMensaje(`Te inscribiste correctamente en "${nueva.seminario_nombre}".`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo completar la inscripción al seminario."
      );
    }
  };

  const desinscribirme = async (sem: CursadaSeminario) => {
    setMensaje(null);
    setError(null);
    if (!user?.token) return;

    try {
      await api.delete(
        `/seminarios/${sem.seminario_id}/mi-inscripcion`,
        user.token
      );
      setCursada((prev) =>
        prev.filter((item) => item.seminario_id !== sem.seminario_id)
      );
      setMensaje(
        `Te desinscribiste correctamente de "${sem.seminario_nombre}".`
      );
      setRevision(v => v + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo anular la inscripción al seminario."
      );
    }
  };

  const totalSeminarios = cursada.length;
  const aprobados = cursada.filter((s) => s.estado === "APROBADO").length;
  const porcentajeAvance =
    totalSeminarios > 0 ? Math.round((aprobados / totalSeminarios) * 100) : 0;

  const idsInscriptos = new Set(cursada.map((c) => c.seminario_id));
  const seminariosParaInscribir = disponibles.filter(
    (d) => !idsInscriptos.has(d.id)
  );

  return (
    <section className="perfil-pagina animate-fade-in">
      <header className="perfil-pagina-encabezado">
        <h1>{gestion ? "Seminarios" : "Estado Académico"}</h1>
        <p>{gestion ? "Consultá tus inscripciones y los seminarios disponibles." : "Consultá tu avance y los resultados de tus seminarios."}</p>
        {!gestion && <Link className="perfil-enlace" to="?vista=seminarios">Gestionar inscripción a seminarios</Link>}
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

      {errorCarga && <button type="button" onClick={() => setRevision(v => v + 1)}>Reintentar consulta</button>}
      {/* Tarjeta de resumen de avance */}
      <article hidden={gestion} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <header className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">Aprobación de seminarios inscriptos</h2>
          <span className="text-3xl font-extrabold text-blue-600">
            {cargando || errorCarga ? "—" : `${porcentajeAvance}%`}
          </span>
        </header>

        <div
          className="w-full bg-slate-100 rounded-full h-4 shadow-inner overflow-hidden"
          role="progressbar"
          aria-valuenow={cargando || errorCarga ? undefined : porcentajeAvance}
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
          {cargando || errorCarga ? "Datos no disponibles todavía." : `Aprobaste ${aprobados} de ${totalSeminarios} seminarios inscriptos. Este indicador no representa el avance total de la carrera.`}
        </p>
      </article>

      {/* Tabla del historial de seminarios */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <header className="bg-slate-50 border-b border-slate-200 p-4">
          <h2 className="text-md font-bold text-slate-800">Mis Seminarios Inscriptos</h2>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
              <tr>
                <th scope="col" className="p-4 font-bold">Seminario</th>
                <th scope="col" className="p-4 font-bold text-center w-36">Asistencia (BR-002)</th>
                <th scope="col" className="p-4 font-bold text-center w-36">Condición (BR-003)</th>
                <th scope="col" className="p-4 font-bold text-center w-32">Nota Final</th>
                {gestion && <th scope="col" className="p-4 font-bold text-center w-36">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {cargando && (
                <tr>
                  <td colSpan={gestion ? 5 : 4} className="p-6 text-center text-slate-500">
                    Cargando historial académico...
                  </td>
                </tr>
              )}

              {!cargando && !errorCarga && cursada.length === 0 && (
                <tr>
                  <td colSpan={gestion ? 5 : 4} className="p-6 text-center text-slate-500">
                    Aún no registrás inscripciones a seminarios.
                  </td>
                </tr>
              )}

              {!cargando && !errorCarga &&
                cursada.map((seminario) => {
                  const puedeDesinscribir =
                    seminario.nota_final === null && seminario.total_clases === 0;
                  return (
                    <tr
                      key={seminario.inscripcion_id}
                      className="hover:bg-blue-50 transition-colors"
                    >
                      <td className="p-4 font-semibold text-slate-700">
                        {seminario.seminario_nombre}
                      </td>

                      <td className="p-4 text-center font-medium text-slate-600">
                        {seminario.total_clases && seminario.porcentaje_asistencia !== null ? `${seminario.porcentaje_asistencia}% (${seminario.asistencias}/${seminario.total_clases})` : "Sin clases registradas"}
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

                      {gestion && <td className="p-4 text-center">
                        <button
                          type="button"
                          disabled={!puedeDesinscribir || confirmacion.procesando}
                          onClick={() => confirmacion.solicitar({titulo: "Desinscribirme", descripcion: `¿Confirmás la baja de ${seminario.seminario_nombre}?`, textoConfirmar: "Confirmar baja", peligroso: true, ejecutar: () => desinscribirme(seminario)})}
                          className="px-3 py-1 bg-red-100 hover:bg-red-200 disabled:bg-slate-100 disabled:text-slate-400 text-red-700 font-semibold rounded-md text-xs transition-colors"
                          title={
                            puedeDesinscribir
                              ? "Solicitar baja del seminario"
                              : "No podés desinscribirte porque ya tenés clases o nota registrada"
                          }
                        >
                          Desinscribirme
                        </button>
                      </td>}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tabla de seminarios disponibles para inscripción (Frontend F39) */}
      <section hidden={!gestion} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <header className="bg-slate-50 border-b border-slate-200 p-4">
          <h2 className="text-md font-bold text-slate-800">
            Seminarios Disponibles para Inscripción
          </h2>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
              <tr>
                <th scope="col" className="p-4 font-bold">Seminario</th>
                <th scope="col" className="p-4 font-bold">Carrera</th>
                <th scope="col" className="p-4 font-bold">Docente</th>
                <th scope="col" className="p-4 font-bold text-center">Inicio</th>
                <th scope="col" className="p-4 font-bold text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {!cargando && !errorCarga && seminariosParaInscribir.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    No hay nuevos seminarios disponibles para inscripción en este momento.
                  </td>
                </tr>
              )}

              {!cargando && !errorCarga &&
                seminariosParaInscribir.map((sem) => (
                  <tr key={sem.id} className="hover:bg-blue-50 transition-colors">
                    <td className="p-4 font-semibold text-slate-700">
                      {sem.nombre}
                    </td>
                    <td className="p-4 text-slate-600">{sem.carrera_nombre}</td>
                    <td className="p-4 text-slate-600">{sem.docente_nombre}</td>
                    <td className="p-4 text-center text-slate-600">
                      <time dateTime={sem.fecha_inicio}>
                        {new Date(sem.fecha_inicio).toLocaleDateString("es-AR")}
                      </time>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        disabled={confirmacion.procesando}
                        onClick={() => confirmacion.solicitar({titulo: "Inscribirme", descripcion: `¿Confirmás la inscripción a ${sem.nombre}?`, textoConfirmar: "Confirmar inscripción", ejecutar: () => inscribirme(sem.id)})}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md text-xs transition-colors"
                      >
                        Inscribirme
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
      <ConfirmacionModal abierto={confirmacion.abierto} titulo={confirmacion.titulo} descripcion={confirmacion.descripcion} textoConfirmar={confirmacion.textoConfirmar} alConfirmar={confirmacion.confirmar} alCancelar={confirmacion.cancelar} confirmando={confirmacion.procesando} peligroso={confirmacion.peligroso} />
    </section>
  );
}