import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../../manejo-sesion/useAuth";
import { api } from "../../../../shared/api/client";
import ConfirmacionModal from "../../../../shared/componentes/ConfirmacionModal/ConfirmacionModal";
import { useConfirmacion } from "../../../../shared/hooks/useConfirmacion";
import "../estilos/Tutorias.css";

interface Legajo {
  legajo_id: string;
  estudiante: string;
  carrera: string;
  cohorte: string;
  estado_legajo: string;
}
interface Encuentro { id: string; fecha: string; estado: string; observaciones: string; version: number }
interface Tutoria extends Legajo { id: string; tutor: string; activa: boolean; editable: boolean; encuentros: Encuentro[] }
interface Candidatos { legajos: Legajo[]; docentes: { id: string; nombre: string }[] }
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
  const admin = user?.rol === "ADMIN";
  const docente = user?.rol === "DOCENTE";
  const [datos, setDatos] = useState<Tutoria[] | null>(null);
  const [candidatos, setCandidatos] = useState<Candidatos | null>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [buscar, setBuscar] = useState("");
  const [carrera, setCarrera] = useState("");
  const [vista, setVista] = useState<"lista" | "asignar" | "encuentro">("lista");
  const [seleccion, setSeleccion] = useState<Tutoria | null>(null);
  const [legajo, setLegajo] = useState("");
  const [tutor, setTutor] = useState("");
  const [edicion, setEdicion] = useState<Encuentro | null>(null);
  const [fecha, setFecha] = useState("");
  const [estado, setEstado] = useState("PENDIENTE");
  const [observaciones, setObservaciones] = useState("");
  const confirmacion = useConfirmacion();
  useEffect(() => {
    if (!token) return;
    let vigente = true;
    Promise.all([api.get<Tutoria[]>("/tutorias", token), admin ? api.get<Candidatos>("/tutorias/candidatos", token) : Promise.resolve(null)])
      .then(([lista, opciones]) => { if (vigente) { setDatos(lista); setCandidatos(opciones); } })
      .catch(e => { if (vigente) setError(mensajeError(e)); });
    return () => { vigente = false; };
  }, [token, admin, revision]);
  function recargar() { setError(""); setDatos(null); setRevision(v => v + 1); }
  function volver() { setVista("lista"); recargar(); }
  function abrirEncuentro(t: Tutoria, e?: Encuentro) {
    setEdicion(e ?? null); setSeleccion(t); setFecha(e?.fecha ?? ""); setEstado(e?.estado ?? "PENDIENTE"); setObservaciones(e?.observaciones ?? ""); setError(""); setExito(""); setVista("encuentro");
  }
  function guardar(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (vista === "asignar" && (!legajo || !tutor)) { setError("Seleccioná un estudiante y un tutor."); return; }
    if (vista === "encuentro" && (!seleccion || !fecha || !observaciones.trim())) { setError("Completá la fecha y las observaciones."); return; }
    if (vista === "encuentro" && estado === "REALIZADA" && fecha > hoyLocal()) { setError("Un encuentro realizado no puede tener fecha futura."); return; }
    const asignar = vista === "asignar";
    setError("");
    confirmacion.solicitar({ titulo: asignar ? "Confirmar asignación" : "Confirmar encuentro", descripcion: "¿Confirmás los datos ingresados?", ejecutar: async () => {
      try {
        if (asignar) await api.post("/tutorias", { legajo_id: legajo, tutor_id: tutor }, token);
        else if (edicion) await api.put(`/tutorias/${seleccion?.id}/encuentros/${edicion.id}`, { fecha, estado, observaciones: observaciones.trim(), version: edicion.version }, token);
        else await api.post(`/tutorias/${seleccion?.id}/encuentros`, { fecha, estado, observaciones: observaciones.trim() }, token);
        setExito(asignar ? "Tutoría asignada correctamente." : "Encuentro guardado correctamente."); volver(); recargar();
      } catch (err) { setError(mensajeError(err)); }
    }});
  }
  const coincide = (l: Legajo) => (!carrera || l.carrera === carrera) && `${l.estudiante} ${l.cohorte} ${l.carrera}`.toLocaleLowerCase().includes(buscar.trim().toLocaleLowerCase());
  const filas = datos?.filter(coincide) ?? [];
  const carreras = [...new Set((datos ?? []).map(t => t.carrera))].sort();
  return <section className="perfil-pagina tutorias" aria-labelledby="titulo-tutorias">
    <header className="tutorias-cabecera">
      <div><h1 id="titulo-tutorias">{vista === "asignar" ? "Asignar tutoría" : vista === "encuentro" ? (edicion ? "Editar encuentro" : "Registrar encuentro") : user?.rol === "COORDINADOR" ? "Tutorías y seguimiento" : "Tutorías"}</h1><p>{vista === "lista" ? "Consultá las asignaciones y los encuentros registrados." : "Completá los datos del registro."}</p></div>
      {vista !== "lista" ? <button type="button" className="tutorias-secundario" disabled={confirmacion.abierto} onClick={volver}>Volver al listado</button> : admin && datos && <button type="button" className="tutorias-primario" onClick={() => { setLegajo(""); setTutor(""); setError(""); setExito(""); setVista("asignar"); }}>Asignar tutoría</button>}
    </header>
    {exito && <p role="status" className="tutorias-exito">{exito}</p>}
    {vista !== "lista" ? <form className="tutorias-panel" onSubmit={guardar} aria-busy={confirmacion.procesando}>
      <fieldset disabled={confirmacion.abierto}>
        {vista === "asignar" ? <div className="tutorias-campos">
          <div><label htmlFor="tutoria-legajo">Estudiante y cohorte *</label><select id="tutoria-legajo" required value={legajo} onChange={e => setLegajo(e.target.value)}><option value="">Seleccioná un legajo</option>{candidatos?.legajos.map(l => <option key={l.legajo_id} value={l.legajo_id}>{l.estudiante} · {l.carrera} · {l.cohorte}</option>)}</select></div>
          <div><label htmlFor="tutoria-docente">Tutor *</label><select id="tutoria-docente" required value={tutor} onChange={e => setTutor(e.target.value)}><option value="">Seleccioná un docente</option>{candidatos?.docentes.map(d => <option value={d.id} key={d.id}>{d.nombre}</option>)}</select></div>
        </div> : <><h2>{seleccion?.estudiante}</h2><p>{seleccion?.carrera} · {seleccion?.cohorte}</p><div className="tutorias-campos">
          <div><label htmlFor="tutoria-fecha">Fecha *</label><input id="tutoria-fecha" type="date" required value={fecha} onChange={e => setFecha(e.target.value)} /></div>
          <div><label htmlFor="tutoria-estado">Estado *</label><select id="tutoria-estado" value={estado} onChange={e => setEstado(e.target.value)}>{Object.entries(etiquetas).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        </div><label htmlFor="tutoria-observaciones">Observaciones y acuerdos *</label><textarea id="tutoria-observaciones" required maxLength={3000} rows={5} value={observaciones} onChange={e => setObservaciones(e.target.value)} /></>}
      </fieldset>
      {error && <p role="alert" className="tutorias-error">{error}</p>}
      <footer className="tutorias-acciones"><button type="button" className="tutorias-secundario" disabled={confirmacion.abierto} onClick={volver}>Cancelar</button><button type="submit" className="tutorias-primario" disabled={confirmacion.abierto}>Guardar</button></footer>
    </form> : error ? <div role="alert" className="tutorias-error">{error} <button type="button" onClick={recargar}>Reintentar</button></div> : !datos ? <p role="status">Cargando tutorías…</p> : <>
      <section className="tutorias-panel" aria-label="Filtros de tutorías"><h2>Filtros</h2><div className="tutorias-campos"><div><label htmlFor="tutoria-busqueda">Buscar por estudiante o cohorte</label><input id="tutoria-busqueda" type="search" value={buscar} onChange={e => setBuscar(e.target.value)} /></div><div><label htmlFor="tutoria-carrera">Carrera</label><select id="tutoria-carrera" value={carrera} onChange={e => setCarrera(e.target.value)}><option value="">Todas</option>{carreras.map(c => <option key={c}>{c}</option>)}</select></div></div><button type="button" className="tutorias-secundario" onClick={() => { setBuscar(""); setCarrera(""); }}>Limpiar filtros</button></section>
      {filas.length === 0 ? <p className="tutorias-panel">No hay tutorías que coincidan con la consulta.</p> : filas.map(t => <article key={t.id} className="tutorias-panel"><header className="tutorias-cabecera"><div><h2>{t.estudiante}</h2><p>{t.carrera} · {t.cohorte}</p><p>Tutor: {t.tutor}</p></div>{docente && t.editable && <button type="button" className="tutorias-primario" onClick={() => abrirEncuentro(t)}>Registrar encuentro</button>}</header>{!t.editable && <p>Seguimiento histórico (solo lectura).</p>}{t.encuentros.length === 0 ? <p>No hay encuentros registrados.</p> : <div className="tutorias-tabla"><table><thead><tr><th scope="col">Fecha</th><th scope="col">Estado</th><th scope="col">Observaciones</th></tr></thead><tbody>{t.encuentros.map(e => <tr key={e.id}><td><time dateTime={e.fecha}>{fechaLocal(e.fecha)}</time></td><td>{etiquetas[e.estado] ?? e.estado}</td><td>{e.observaciones}{docente && t.editable && e.estado === "PENDIENTE" && <div><button type="button" className="tutorias-secundario" onClick={() => abrirEncuentro(t, e)}>Editar encuentro</button></div>}</td></tr>)}</tbody></table></div>}</article>)}
    </>}
    <ConfirmacionModal abierto={confirmacion.abierto} titulo={confirmacion.titulo} descripcion={confirmacion.descripcion} confirmando={confirmacion.procesando} alConfirmar={confirmacion.confirmar} alCancelar={confirmacion.cancelar} />
  </section>;
}
