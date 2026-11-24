// Administra trabajos prácticos vinculados a estudiantes matriculados desde CPR.
import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";
import ConfirmacionModal from "../../../../shared/componentes/ConfirmacionModal/ConfirmacionModal";
import MensajeSistema from "../../../../shared/componentes/MensajeSistema/MensajeSistema";
import { useConfirmacion } from "../../../../shared/hooks/useConfirmacion";
import "../../shared/estilos/Tutorias.css";
import "../estilos/CPR.css";

type Trabajo = { id: string; legajo_id: string; estudiante: string; carrera: string; titulo: string; descripcion: string; fecha: string; activo: boolean; version: number; estado_legajo: string };
type Estudiante = { legajo_id: string; estudiante: string; carrera: string; cohorte: string; estado: string };
const inicial = {legajo_id: "", titulo: "", descripcion: "", fecha: ""};
const errorTexto = (error: unknown) => error instanceof Error ? error.message : "No se pudo completar la operación.";

export default function TrabajosPracticosCPR() {
  const { user } = useAuth();
  const token = user?.token;
  const confirmacion = useConfirmacion();
  const [trabajos, setTrabajos] = useState<Trabajo[] | null>(null);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [buscar, setBuscar] = useState("");
  const [carrera, setCarrera] = useState("");
  const [estado, setEstado] = useState("");
  const [formulario, setFormulario] = useState(inicial);
  const [editando, setEditando] = useState<Trabajo | null>(null);
  const [mostrar, setMostrar] = useState(false);
  useEffect(() => {
    if (!token) return;
    let vigente = true;
    Promise.all([api.get<Trabajo[]>("/inscripcion/trabajos-practicos", token), api.get<Estudiante[]>("/inscripcion/tesis/estudiantes", token)])
      .then(([lista, alumnos]) => {if (vigente) {setTrabajos(lista); setEstudiantes(alumnos.filter(a => ["ACTIVO", "EN_RIESGO"].includes(a.estado)));}})
      .catch(e => {if (vigente) setError(errorTexto(e));});
    return () => {vigente = false;};
  }, [token, revision]);
  function recargar() {setTrabajos(null); setRevision(v => v + 1);}
  function abrir(t?: Trabajo) {
    setError(""); setExito(""); setEditando(t ?? null);
    setFormulario(t ? {legajo_id: t.legajo_id, titulo: t.titulo, descripcion: t.descripcion, fecha: t.fecha} : inicial);
    setMostrar(true);
  }
  function guardar(e: FormEvent) {
    e.preventDefault();
    if (!token || !formulario.legajo_id || !formulario.titulo.trim() || !formulario.descripcion.trim() || !formulario.fecha) {setError("Completá todos los campos."); return;}
    setError("");
    confirmacion.solicitar({titulo: editando ? "Confirmar modificación" : "Confirmar alta", descripcion: "¿Confirmás los datos del trabajo práctico?", ejecutar: async () => {
      try {
        const datos = {titulo: formulario.titulo.trim(), descripcion: formulario.descripcion.trim(), fecha: formulario.fecha};
        if (editando) await api.put(`/inscripcion/trabajos-practicos/${editando.id}`, {...datos, version: editando.version}, token);
        else await api.post("/inscripcion/trabajos-practicos", {...datos, legajo_id: formulario.legajo_id}, token);
        setMostrar(false); setExito("Trabajo práctico guardado."); recargar();
      } catch (err) {setError(errorTexto(err));}
    }});
  }
  function cambiarEstado(t: Trabajo) {
    if (!token) return;
    setError(""); setExito("");
    confirmacion.solicitar({titulo: t.activo ? "Confirmar baja" : "Confirmar reactivación", descripcion: `${t.activo ? "Dar de baja" : "Reactivar"} el trabajo ${t.titulo}.`, peligroso: t.activo, ejecutar: async () => {
      try {await api.patch(`/inscripcion/trabajos-practicos/${t.id}/estado`, {activo: !t.activo, version: t.version}, token); setExito("Estado actualizado."); recargar();}
      catch (err) {setError(errorTexto(err));}
    }});
  }
  const carreras = [...new Set((trabajos ?? []).map(t => t.carrera))].sort();
  const visibles = trabajos?.filter(t => (!carrera || t.carrera === carrera) && (!estado || t.activo === (estado === "activo")) && `${t.titulo} ${t.estudiante} ${t.carrera}`.toLocaleLowerCase().includes(buscar.trim().toLocaleLowerCase())) ?? [];
  return <section className="perfil-pagina tutorias cpr-gestion">
    <header className="perfil-pagina-encabezado tutorias-cabecera"><div><h1>{mostrar ? (editando ? "Modificar trabajo práctico" : "Registrar trabajo práctico") : "Gestión de trabajos prácticos"}</h1><p>Registrá y consultá los trabajos de estudiantes matriculados.</p></div>{!mostrar && trabajos && <button type="button" className="tutorias-primario" onClick={() => abrir()}>Registrar trabajo práctico</button>}</header>
    {error && <MensajeSistema tipo="error" texto={error} alCerrar={() => setError("")}/>}
    {exito && <MensajeSistema tipo="exito" texto={exito} alCerrar={() => setExito("")}/>}
    {mostrar ? <form className="tutorias-panel" onSubmit={guardar}>
      <h2>{editando ? "Modificar trabajo" : "Registrar trabajo"}</h2>
      <fieldset disabled={confirmacion.abierto}>
        <div className="tutorias-campos">
          {editando ? <div><h3>Estudiante</h3><p>{editando.estudiante}</p></div> : <div><label htmlFor="tp-estudiante">Estudiante</label><select id="tp-estudiante" required value={formulario.legajo_id} onChange={e => setFormulario({...formulario, legajo_id: e.target.value})}><option value="">Seleccioná un estudiante</option>{estudiantes.map(a => <option key={a.legajo_id} value={a.legajo_id}>{a.estudiante} · {a.carrera} · {a.cohorte}</option>)}</select></div>}
          {!editando && estudiantes.length === 0 && <p className="cpr-vacio">No hay estudiantes habilitados para registrar un trabajo práctico.</p>}
          <div><label htmlFor="tp-fecha">Fecha</label><input id="tp-fecha" type="date" required value={formulario.fecha} onChange={e => setFormulario({...formulario, fecha: e.target.value})}/></div>
        </div>
        <label htmlFor="tp-titulo">Título</label><input id="tp-titulo" required maxLength={300} value={formulario.titulo} onChange={e => setFormulario({...formulario, titulo: e.target.value})}/>
        <label htmlFor="tp-descripcion">Descripción</label><textarea id="tp-descripcion" rows={4} required maxLength={3000} value={formulario.descripcion} onChange={e => setFormulario({...formulario, descripcion: e.target.value})}/>
      </fieldset><footer className="tutorias-acciones"><button type="button" className="tutorias-secundario" disabled={confirmacion.abierto} onClick={() => setMostrar(false)}>Cancelar</button><button type="submit" className="tutorias-primario" disabled={confirmacion.abierto || (!editando && estudiantes.length === 0)}>Guardar</button></footer>
    </form> : trabajos === null ? error ? <button type="button" className="tutorias-secundario" onClick={() => {setError(""); recargar();}}>Reintentar</button> : <p role="status">Cargando trabajos prácticos…</p> : <section className="tutorias-panel">
      <h2>Filtros de búsqueda</h2>
      <div className="cpr-filtros">
        <label>Buscar<input id="tp-busqueda" type="search" placeholder="Estudiante, carrera o trabajo" value={buscar} onChange={e => setBuscar(e.target.value)} /></label>
        <label>Carrera<select value={carrera} onChange={e => setCarrera(e.target.value)}><option value="">Todas</option>{carreras.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Estado<select value={estado} onChange={e => setEstado(e.target.value)}><option value="">Todos</option><option value="activo">Activo</option><option value="baja">Baja</option></select></label>
      </div>
      <button type="button" className="tutorias-secundario" onClick={() => {setBuscar(""); setCarrera(""); setEstado("");}}>Limpiar filtros</button>
      <p role="status" className="cpr-conteo">{visibles.length} registros</p>
      {visibles.length === 0 ? <div className="cpr-vacio"><h3>No hay trabajos prácticos registrados para esta consulta.</h3><p>Podés registrar un trabajo o cambiar los filtros.</p></div> : <div className="tutorias-tabla"><table><thead><tr><th scope="col">Estudiante</th><th scope="col">Trabajo</th><th scope="col">Fecha</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead><tbody>{visibles.map(t => <tr key={t.id}><td>{t.estudiante}<br/>{t.carrera}</td><td><strong>{t.titulo}</strong><p>{t.descripcion}</p></td><td><time dateTime={t.fecha}>{t.fecha.split("-").reverse().join("/")}</time></td><td><span className={`cpr-estado ${t.activo ? "cpr-activo" : ""}`}>{t.activo ? "Activo" : "Baja"}</span></td><td>{["ACTIVO", "EN_RIESGO"].includes(t.estado_legajo) && <div className="flex flex-wrap gap-2">{t.activo && <button className="tutorias-secundario" type="button" onClick={() => abrir(t)}>Modificar</button>}<button className="tutorias-secundario" type="button" onClick={() => cambiarEstado(t)}>{t.activo ? "Dar de baja" : "Reactivar"}</button></div>}</td></tr>)}</tbody></table></div>}
    </section>}
    <ConfirmacionModal abierto={confirmacion.abierto} titulo={confirmacion.titulo} descripcion={confirmacion.descripcion} peligroso={confirmacion.peligroso} textoConfirmar="Confirmar" confirmando={confirmacion.procesando} alConfirmar={confirmacion.confirmar} alCancelar={confirmacion.cancelar}/>
  </section>;
}
