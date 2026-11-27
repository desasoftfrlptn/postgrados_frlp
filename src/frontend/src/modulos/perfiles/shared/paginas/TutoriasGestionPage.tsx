import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../../manejo-sesion/useAuth";
import { api } from "../../../../shared/api/client";
import ConfirmacionModal from "../../../../shared/componentes/ConfirmacionModal/ConfirmacionModal";
import { useConfirmacion } from "../../../../shared/hooks/useConfirmacion";
import "../estilos/Tutorias.css";
import "../../conduccion/estilos/ConduccionInstitucional.css";
import "../../administrador/estilos/FiltrosAcademicos.css";
interface Legajo {
    legajo_id: string;
    estudiante: string;
    carrera: string;
    cohorte: string;
    estado_legajo: string;
}
interface Encuentro {
    id: string;
    fecha: string;
    estado: string;
    observaciones: string;
    version: number;
}
interface Tutoria extends Legajo {
    id: string;
    tutor: string;
    tutor_id: string | null;
    activa: boolean;
    editable: boolean;
    encuentros: Encuentro[];
}
interface Candidatos {
    legajos: Legajo[];
    docentes: {
        id: string;
        nombre: string;
    }[];
}
const mensajeError = (e: unknown) => e instanceof Error ? e.message : "No se pudo completar la operación.";
const fechaLocal = (fecha: string) => fecha.split("-").reverse().join("/");
function hoyLocal() {
    const partes = new Intl.DateTimeFormat("en", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    return ["year", "month", "day"].map(tipo => partes.find(p => p.type === tipo)?.value).join("-");
}
const etiquetas: Record<string, string> = { PENDIENTE: "Pendiente", REALIZADA: "Realizada", CANCELADA: "Cancelada" };
export default function TutoriasGestionPage() {
    const { user } = useAuth();
    const token = user?.token;
    const cpr = user?.rol === "CPR";
    const admin = user?.rol === "ADMIN";
    const coordinador = user?.rol === "COORDINADOR";
    const listadoInstitucional = admin || coordinador || cpr;
    const puedeGestionar = admin || cpr;
    const docente = user?.rol === "DOCENTE";
    const [datos, setDatos] = useState<Tutoria[] | null>(null);
    const [candidatos, setCandidatos] = useState<Candidatos | null>(null);
    const [revision, setRevision] = useState(0);
    const [error, setError] = useState("");
    const [exito, setExito] = useState("");
    const [buscar, setBuscar] = useState("");
    const [carrera, setCarrera] = useState("");
    const [vista, setVista] = useState<"lista" | "asignar" | "editar" | "encuentro">("lista");
    const [seleccion, setSeleccion] = useState<Tutoria | null>(null);
    const [legajo, setLegajo] = useState("");
    const [carreraAsignacion, setCarreraAsignacion] = useState("");
    const [cohorteAsignacion, setCohorteAsignacion] = useState("");
    const [cohorteFiltro, setCohorteFiltro] = useState("");
    const [tutorFiltro, setTutorFiltro] = useState("");
    const [estadoFiltro, setEstadoFiltro] = useState("");
    const [tutor, setTutor] = useState("");
    const [edicion, setEdicion] = useState<Encuentro | null>(null);
    const [fecha, setFecha] = useState("");
    const [estado, setEstado] = useState("PENDIENTE");
    const [observaciones, setObservaciones] = useState("");
    const confirmacion = useConfirmacion();
    useEffect(() => {
        if (!token)
            return;
        let vigente = true;
        Promise.all([api.get<Tutoria[]>("/tutorias", token), puedeGestionar ? api.get<Candidatos>("/tutorias/candidatos", token) : Promise.resolve(null)])
            .then(([lista, opciones]) => {
                if (vigente) {
                    setDatos(lista);
                    setCandidatos(opciones);
                }
            })
            .catch(e => {
                if (vigente)
                    setError(mensajeError(e));
            });
        return () => { vigente = false; };
    }, [token, puedeGestionar, revision]);
    function recargar() { setError(""); setDatos(null); setRevision(v => v + 1); }
    function volver() { setVista("lista"); recargar(); }
    function bajaTutoria(t: Tutoria) {
        if (!token)
            return;
        setError("");
        setExito("");
        confirmacion.solicitar({
            titulo: "Confirmar baja de tutoría", descripcion: `¿Dar de baja la tutoría de ${t.estudiante}? Se conservarán los encuentros registrados.`, peligroso: true, ejecutar: async () => {
                try {
                    await api.patch(`/tutorias/${t.id}/baja`, { tutor_id: t.tutor_id }, token);
                    setExito("Tutoría dada de baja.");
                    recargar();
                }
                catch (err) {
                    setError(mensajeError(err));
                }
            }
        });
    }
    function editarTutoria(t: Tutoria) {
        setSeleccion(t);
        setTutor(t.tutor_id ?? "");
        setError("");
        setExito("");
        setVista("editar");
    }
    function abrirEncuentro(t: Tutoria, e?: Encuentro) {
        setEdicion(e ?? null);
        setSeleccion(t);
        setFecha(e?.fecha ?? "");
        setEstado(e?.estado ?? "PENDIENTE");
        setObservaciones(e?.observaciones ?? "");
        setError("");
        setExito("");
        setVista("encuentro");
    }
    function guardar(e: FormEvent) {
        e.preventDefault();
        if (!token)
            return;
        if (vista === "asignar" && (!legajo || !tutor)) {
            setError("Seleccioná un estudiante y un tutor.");
            return;
        }
        if (vista === "editar" && (!seleccion || !tutor)) {
            setError("Seleccioná un tutor.");
            return;
        }
        if (vista === "encuentro" && (!seleccion || !fecha || !observaciones.trim())) {
            setError("Completá la fecha y las observaciones.");
            return;
        }
        if (vista === "encuentro" && estado === "REALIZADA" && fecha > hoyLocal()) {
            setError("Un encuentro realizado no puede tener fecha futura.");
            return;
        }
        const asignar = vista === "asignar";
        const editar = vista === "editar";
        setError("");
        confirmacion.solicitar({
            titulo: editar ? "Confirmar modificación" : asignar ? "Confirmar asignación" : "Confirmar encuentro", descripcion: "¿Confirmás los datos ingresados?", ejecutar: async () => {
                try {
                    if (asignar)
                        await api.post("/tutorias", { legajo_id: legajo, tutor_id: tutor }, token);
                    else if (editar && seleccion)
                        await api.put(`/tutorias/${seleccion.id}`, { tutor_id: tutor, tutor_anterior_id: seleccion.tutor_id }, token);
                    else if (edicion)
                        await api.put(`/tutorias/${seleccion?.id}/encuentros/${edicion.id}`, { fecha, estado, observaciones: observaciones.trim(), version: edicion.version }, token);
                    else
                        await api.post(`/tutorias/${seleccion?.id}/encuentros`, { fecha, estado, observaciones: observaciones.trim() }, token);
                    setExito(editar ? "Tutoría modificada correctamente." : asignar ? "Tutoría asignada correctamente." : "Encuentro guardado correctamente.");
                    volver();
                }
                catch (err) {
                    setError(mensajeError(err));
                }
            }
        });
    }
    const coincide = (l: Legajo) => (!carrera || l.carrera === carrera) && `${l.estudiante} ${l.cohorte} ${l.carrera} ${"tutor" in l ? l.tutor : ""}`.toLocaleLowerCase().includes(buscar.trim().toLocaleLowerCase());
    const filas = datos?.filter(t =>
        coincide(t) &&
        (!listadoInstitucional || (
            (!cohorteFiltro || t.cohorte === cohorteFiltro) &&
            (!tutorFiltro || t.tutor === tutorFiltro) &&
            (!estadoFiltro || t.activa === (estadoFiltro === "activa"))
        ))
    ) ?? [];

    const legajosDisponibles = candidatos?.legajos ?? [];
    const carrerasAsignacion = [...new Set(
        legajosDisponibles.map(l => l.carrera)
    )].sort();

    const cohortesAsignacion = [...new Set(
        legajosDisponibles
            .filter(l => l.carrera === carreraAsignacion)
            .map(l => l.cohorte)
    )].sort();

    const estudiantesAsignacion = legajosDisponibles.filter(l =>
        l.carrera === carreraAsignacion &&
        l.cohorte === cohorteAsignacion
    );

    const cohortesFiltro = [...new Set(
        (datos ?? [])
            .filter(t => !carrera || t.carrera === carrera)
            .map(t => t.cohorte)
    )].sort();

    const tutoresFiltro = [...new Set(
        (datos ?? []).map(t => t.tutor).filter(Boolean)
    )].sort();
    const carreras = [...new Set((datos ?? []).map(t => t.carrera))].sort();
    return <section className={coordinador
        ? "tutorias tutorias-admin conduccion-institucional"
        : admin || cpr
            ? "tutorias tutorias-admin"
            : "perfil-pagina tutorias"} aria-labelledby="titulo-tutorias">
        <header className={listadoInstitucional ? "tutorias-cabecera mb-8" : "tutorias-cabecera"}>
            <div>
                <h1 id="titulo-tutorias">
                    {vista === "editar" ? "Modificar tutoría" : vista === "asignar" ? (cpr ? "Registrar tutoría" : "Asignar tutoría") : vista === "encuentro" ? (edicion ? "Editar encuentro" : "Registrar encuentro") : user?.rol === "COORDINADOR" ? "Tutorías y seguimiento" : cpr ? "Gestión de tutorías" : "Tutorías"}
                </h1>
                <p>
                    {vista === "lista" ? "Consultá las asignaciones y los encuentros registrados." : "Completá los datos del registro."}
                </p>
            </div>
            {vista !== "lista" ? (!admin && <button type="button" className="tutorias-secundario" disabled={confirmacion.abierto} onClick={volver}>Volver al listado</button>) : puedeGestionar && datos && <button type="button" className="tutorias-primario" onClick={() => { setLegajo(""); setTutor(""); setCarreraAsignacion(""); setCohorteAsignacion(""); setError(""); setExito(""); setVista("asignar"); }}>
                {puedeGestionar ? "+ Nueva tutoría" : "Registrar tutoría"}
            </button>}
        </header>
        {exito && <p role="status" className="tutorias-exito">
            {exito}
        </p>}
        {vista !== "lista" ? <form className="tutorias-panel" onSubmit={guardar} aria-busy={confirmacion.procesando}>
            {admin && <h2>
                {vista === "asignar" ? "Nueva tutoría" : "Gestionar tutoría"}
            </h2>}
            <fieldset disabled={confirmacion.abierto}>
                {vista === "asignar" || vista === "editar" ? <div className="tutorias-campos">
                    {vista === "editar" ? <div>
                        <h2>
                            {seleccion?.estudiante}
                        </h2>
                        <p>{seleccion?.carrera} · {seleccion?.cohorte}</p>
                    </div> : puedeGestionar ? <>
                        <div>
                            <label htmlFor="asignacion-carrera">Carrera *</label>
                            <select
                                id="asignacion-carrera"
                                required
                                value={carreraAsignacion}
                                onChange={e => {
                                    setCarreraAsignacion(e.target.value);
                                    setCohorteAsignacion("");
                                    setLegajo("");
                                }}
                            >
                                <option value="">Seleccionar carrera</option>
                                {carrerasAsignacion.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="asignacion-cohorte">Cohorte *</label>
                            <select
                                id="asignacion-cohorte"
                                required
                                disabled={!carreraAsignacion}
                                value={cohorteAsignacion}
                                onChange={e => {
                                    setCohorteAsignacion(e.target.value);
                                    setLegajo("");
                                }}
                            >
                                <option value="">Seleccionar cohorte</option>
                                {cohortesAsignacion.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="asignacion-estudiante">Estudiante *</label>
                            <select
                                id="asignacion-estudiante"
                                required
                                disabled={!cohorteAsignacion}
                                value={legajo}
                                onChange={e => setLegajo(e.target.value)}
                            >
                                <option value="">Seleccionar estudiante</option>
                                {estudiantesAsignacion.map(l => (
                                    <option key={l.legajo_id} value={l.legajo_id}>
                                        {l.estudiante}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </> : <div>
                        <label htmlFor="tutoria-legajo">Estudiante y cohorte *</label>
                        <select id="tutoria-legajo" required value={legajo} onChange={e => setLegajo(e.target.value)}>
                            <option value="">Seleccioná un legajo</option>
                            {candidatos?.legajos.map(l => <option key={l.legajo_id} value={l.legajo_id}>{l.estudiante} · {l.carrera} · {l.cohorte}</option>)}
                        </select>
                    </div>}
                    <div>
                        <label htmlFor="tutoria-docente">Tutor *</label>
                        <select id="tutoria-docente" required value={tutor} onChange={e => setTutor(e.target.value)}>
                            <option value="">Seleccioná un docente</option>
                            {candidatos?.docentes.map(d => <option value={d.id} key={d.id}>
                                {d.nombre}
                            </option>)}
                        </select>
                    </div>
                    {puedeGestionar && vista === "asignar" && candidatos?.legajos.length === 0 && <p>No hay estudiantes habilitados sin tutoría activa.</p>}
                    {puedeGestionar && candidatos?.docentes.length === 0 && <p>No hay docentes activos disponibles para asignar.</p>}
                </div> : <>
                    <h2>
                        {seleccion?.estudiante}
                    </h2>
                    <p>{seleccion?.carrera} · {seleccion?.cohorte}</p>
                    <div className="tutorias-campos">
                        <div>
                            <label htmlFor="tutoria-fecha">Fecha *</label>
                            <input id="tutoria-fecha" type="date" required value={fecha} onChange={e => setFecha(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="tutoria-estado">Estado *</label>
                            <select id="tutoria-estado" value={estado} onChange={e => setEstado(e.target.value)}>
                                {Object.entries(etiquetas).map(([k, v]) => <option key={k} value={k}>
                                    {v}
                                </option>)}
                            </select>
                        </div>
                    </div>
                    <label htmlFor="tutoria-observaciones">Observaciones y acuerdos *</label>
                    <textarea id="tutoria-observaciones" required maxLength={3000} rows={5} value={observaciones} onChange={e => setObservaciones(e.target.value)} />
                </>}
            </fieldset>
            {error && <p role="alert" className="tutorias-error">
                {error}
            </p>}
            <footer className="tutorias-acciones">
                <button type="button" className="tutorias-secundario" disabled={confirmacion.abierto} onClick={volver}>Cancelar</button>
                <button type="submit" className="tutorias-primario" disabled={confirmacion.abierto || (
                    puedeGestionar && vista === "asignar" &&
                    (!carreraAsignacion || !cohorteAsignacion || !legajo || !tutor)
                )}>
                    {admin && vista === "asignar" ? "Asignar tutoría" : "Guardar"}
                </button>
            </footer>
        </form> : error ? <div role="alert" className="tutorias-error">
            {error}
            <button type="button" onClick={recargar}>Reintentar</button>
        </div> : !datos ? <p role="status">Cargando tutorías…</p> : <>
            <section
                className={listadoInstitucional ? "tutorias-filtros-admin" : "tutorias-panel"}
                aria-label="Filtros de tutorías"
            >
                {!listadoInstitucional && <h2>Filtros</h2>}
                <div className={listadoInstitucional ? "admin-filtros-academicos" : "tutorias-campos"}>
                    <div className={listadoInstitucional ? "admin-filtro-campo" : undefined}>
                        <label htmlFor="tutoria-busqueda">
                            {listadoInstitucional ? "Buscar tutoría" : cpr ? "Buscar por estudiante, cohorte o tutor" : "Buscar por estudiante o cohorte"}
                        </label>
                        <input id="tutoria-busqueda" type="search" value={buscar} onChange={e => setBuscar(e.target.value)} />
                    </div>
                    <div className={listadoInstitucional ? "admin-filtro-campo" : undefined}>
                        <label htmlFor="tutoria-carrera">Carrera</label>
                        <select id="tutoria-carrera" value={carrera} onChange={e => { setCarrera(e.target.value); setCohorteFiltro(""); }}>
                            <option value="">Todas</option>
                            {carreras.map(c => <option key={c}>
                                {c}
                            </option>)}
                        </select>
                    </div>
                {listadoInstitucional && <>
                        <div className={listadoInstitucional ? "admin-filtro-campo" : undefined}>
                            <label htmlFor="filtro-tutoria-cohorte">Cohorte</label>
                            <select id="filtro-tutoria-cohorte" value={cohorteFiltro} onChange={e => setCohorteFiltro(e.target.value)}>
                                <option value="">Todas</option>
                                {cohortesFiltro.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className={listadoInstitucional ? "admin-filtro-campo" : undefined}>
                            <label htmlFor="filtro-tutoria-tutor">Tutor</label>
                            <select id="filtro-tutoria-tutor" value={tutorFiltro} onChange={e => setTutorFiltro(e.target.value)}>
                                <option value="">Todos</option>
                                {tutoresFiltro.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className={listadoInstitucional ? "admin-filtro-campo" : undefined}>
                            <label htmlFor="filtro-tutoria-estado">Estado</label>
                            <select id="filtro-tutoria-estado" value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}>
                                <option value="">Todos</option>
                                <option value="activa">Activas</option>
                                <option value="baja">Bajas</option>
                            </select>
                        </div>
                    </>}
                <button type="button" className={listadoInstitucional ? "admin-limpiar-filtros" : "tutorias-secundario"} onClick={() => {
                    setBuscar("");
                    setCarrera("");
                    setCohorteFiltro("");
                    setTutorFiltro("");
                    setEstadoFiltro("");
                }}>Limpiar filtros</button>
                </div>
            </section>
            {listadoInstitucional ? <>
                <p role="status" className="tutorias-resultados">
                    {filas.length} de {datos.length} resultados
                </p>
                <div className="tutorias-tabla tutorias-listado-admin">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Estudiante</th>
                                <th scope="col">Carrera</th>
                                <th scope="col">Cohorte</th>
                                <th scope="col">Tutor</th>
                                <th scope="col">Estado</th>
                                <th scope="col">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filas.map(t => (
                                <tr key={t.id}>
                                    <td className="font-semibold">{t.estudiante}</td>
                                    <td>{t.carrera}</td>
                                    <td>{t.cohorte}</td>
                                    <td>{t.tutor || "Sin tutor"}</td>
                                    <td>
                                        <span className={t.activa
                                            ? "font-semibold text-green-700"
                                            : "font-semibold text-gray-500"}>
                                            {t.activa ? "Activa" : "Baja"}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="tutorias-acciones-tabla">
                                            {puedeGestionar && t.activa && ["ACTIVO", "EN_RIESGO"].includes(t.estado_legajo) &&
                                                <button type="button" className="tutorias-gestionar" onClick={() => editarTutoria(t)}>
                                                    Gestionar
                                                </button>
                                            }
                                            {cpr && t.activa && (
                                                <button
                                                    type="button"
                                                    className="cpr-accion cpr-accion-peligro"
                                                    onClick={() => bajaTutoria(t)}
                                                >
                                                    Dar de baja
                                                </button>
                                            )}
                                            <details>
                                                <summary>Encuentros ({t.encuentros.length})</summary>
                                                {t.encuentros.length === 0 ? (
                                                    <p>No hay encuentros registrados.</p>
                                                ) : t.encuentros.map(e => (
                                                    <div key={e.id} className="tutorias-encuentro-resumen">
                                                        <strong>{fechaLocal(e.fecha)}</strong>
                                                        <p>{etiquetas[e.estado] ?? e.estado}</p>
                                                        <p>{e.observaciones}</p>
                                                    </div>
                                                ))}
                                            </details>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filas.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center">
                                        No se encontraron tutorías.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </> : filas.length === 0 ? <p className="tutorias-panel">No hay tutorías que coincidan con la consulta.</p> : filas.map(t => <article key={t.id} className="tutorias-panel">
                <header className="tutorias-cabecera">
                    <div>
                        <h2>
                            {t.estudiante}
                        </h2>
                        <p>{t.carrera} · {t.cohorte}</p>
                        <p>Tutor: {t.tutor}</p>
                        {cpr && <p>Estado: {t.activa ? "Activa" : "Baja"}</p>}
                    </div>
                    {puedeGestionar && t.activa && ["ACTIVO", "EN_RIESGO"].includes(t.estado_legajo) && <button type="button" className="tutorias-secundario" onClick={() => editarTutoria(t)}>Modificar tutoría</button>}
                    {cpr && t.activa && <button type="button" className="tutorias-secundario" onClick={() => bajaTutoria(t)}>Dar de baja tutoría</button>}
                    {docente && t.editable && <button type="button" className="tutorias-primario" onClick={() => abrirEncuentro(t)}>Registrar encuentro</button>}
                </header>
                {!t.editable && <p>Seguimiento histórico (solo lectura).</p>}
                {t.encuentros.length === 0 ? <p>No hay encuentros registrados.</p> : <div className="tutorias-tabla">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Fecha</th>
                                <th scope="col">Estado</th>
                                <th scope="col">Observaciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {t.encuentros.map(e => <tr key={e.id}>
                                <td>
                                    <time dateTime={e.fecha}>
                                        {fechaLocal(e.fecha)}
                                    </time>
                                </td>
                                <td>
                                    {etiquetas[e.estado] ?? e.estado}
                                </td>
                                <td>
                                    {e.observaciones}
                                    {docente && t.editable && e.estado === "PENDIENTE" && <div>
                                        <button type="button" className="tutorias-secundario" onClick={() => abrirEncuentro(t, e)}>Editar encuentro</button>
                                    </div>}
                                </td>
                            </tr>)}
                        </tbody>
                    </table>
                </div>}
            </article>)}
        </>}
        <ConfirmacionModal abierto={confirmacion.abierto} titulo={confirmacion.titulo} descripcion={confirmacion.descripcion} confirmando={confirmacion.procesando} peligroso={confirmacion.peligroso} alConfirmar={confirmacion.confirmar} alCancelar={confirmacion.cancelar} />
    </section>;
}
