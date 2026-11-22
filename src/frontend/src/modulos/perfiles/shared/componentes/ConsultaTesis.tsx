import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { tesisApi, type CandidatoTesis, type DatosTesis, type RegistroTesis } from "../../../../shared/api/tesis";
import { ApiError } from "../../../../shared/api/client";
import ConfirmacionModal from "../../../../shared/componentes/ConfirmacionModal/ConfirmacionModal";
import MensajeSistema from "../../../../shared/componentes/MensajeSistema/MensajeSistema";
import { useConfirmacion } from "../../../../shared/hooks/useConfirmacion";
import { useAuth } from "../../../manejo-sesion/useAuth";
import "../estilos/Tesis.css";

const inicial = { legajo_id: "", titulo: "", director: "", codirector: "", fecha_aprobacion: "", numero_resolucion: "" };
const errorTexto = (error: unknown) => error instanceof Error ? error.message : "No se pudo completar la operación.";

// La misma consulta se utiliza en CPR, Conducción y Estudiante.
export default function ConsultaTesis({ editable = false, titulo = "Gestión de tesis", resumen = false }: { editable?: boolean; titulo?: string; resumen?: boolean }) {
  const { user } = useAuth();
  const token = user?.token;
  const puedeEditar = editable && user?.rol === "CPR";
  const confirmacion = useConfirmacion();
  const [registros, setRegistros] = useState<RegistroTesis[]>([]);
  const [candidatos, setCandidatos] = useState<CandidatoTesis[]>([]);
  const [carga, setCarga] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [revision, setRevision] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");
  const [carrera, setCarrera] = useState("");
  const [formulario, setFormulario] = useState(inicial);
  const [editando, setEditando] = useState<RegistroTesis | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [conflicto, setConflicto] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const recargar = useCallback(() => { setCarga(true); setRevision(v => v + 1); }, []);

  useEffect(() => {
    if (!token) return;
    let vigente = true;
    Promise.all([tesisApi.listar(token), puedeEditar ? tesisApi.candidatos(token) : Promise.resolve([])])
      .then(([datos, opciones]) => {
        if (!vigente) return;
        setRegistros(datos); setCandidatos(opciones); setErrorCarga("");
      })
      .catch(error => { if (vigente) setErrorCarga(errorTexto(error)); })
      .finally(() => { if (vigente) setCarga(false); });
    return () => { vigente = false; };
  }, [token, puedeEditar, revision]);

  function nuevo() {
    setEditando(null); setFormulario(inicial); setConflicto(false); setAbierto(true); setMensaje(null);
  }
  function editar(registro: RegistroTesis) {
    setEditando(registro); setConflicto(false); setAbierto(true); setMensaje(null);
    setFormulario({ legajo_id: registro.legajo_id, titulo: registro.titulo, director: registro.director,
      codirector: registro.codirector ?? "", fecha_aprobacion: registro.fecha_aprobacion ?? "", numero_resolucion: registro.numero_resolucion ?? "" });
  }
  function cambiar(campo: keyof typeof inicial, valor: string) {
    setFormulario(actual => ({ ...actual, [campo]: valor }));
  }
  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!token || !puedeEditar || conflicto || confirmacion.abierto || confirmacion.procesando) return;
    const datos: DatosTesis = {
      titulo: formulario.titulo.trim(), director: formulario.director.trim(), codirector: formulario.codirector.trim() || null,
      fecha_aprobacion: formulario.fecha_aprobacion || null, numero_resolucion: formulario.numero_resolucion.trim() || null,
    };
    if (datos.titulo.length < 5 || datos.director.length < 2 || (!editando && !formulario.legajo_id) ||
        Boolean(datos.fecha_aprobacion) !== Boolean(datos.numero_resolucion) ||
        (datos.codirector !== null && (datos.codirector.length < 2 || datos.codirector.toLowerCase() === datos.director.toLowerCase()))) {
      setMensaje({ tipo: "error", texto: "Revisá los campos. La fecha de aprobación y la resolución deben completarse juntas, y los directores deben ser diferentes." });
      return;
    }
    const actual = editando;
    const legajo = formulario.legajo_id;
    confirmacion.solicitar({ titulo: actual ? "Confirmar modificación" : "Confirmar registro", descripcion: actual?.fecha_aprobacion && !datos.fecha_aprobacion ? "Se quitarán la fecha de aprobación y el número de resolución registrados. ¿Querés guardar estos cambios?" : "¿Querés guardar los datos de esta tesis?", peligroso: Boolean(actual?.fecha_aprobacion && !datos.fecha_aprobacion), textoConfirmar: "Guardar", ejecutar: async () => {
      try {
        if (actual) await tesisApi.modificar(actual.id, { ...datos, version: actual.version }, token);
        else await tesisApi.crear({ ...datos, legajo_id: legajo }, token);
        setAbierto(false); setMensaje({ tipo: "exito", texto: "Tesis guardada correctamente." }); recargar();
      } catch (error) {
        setMensaje({ tipo: "error", texto: errorTexto(error) });
        if (error instanceof ApiError && error.status === 409) { setConflicto(true); recargar(); }
      }
    }});
  }
  const filtrados = registros.filter(r => (!tipo || tipo === r.tipo) && (!carrera || carrera === r.carrera) &&
    (!estado || (estado === "aprobada") === Boolean(r.fecha_aprobacion)) &&
    [r.estudiante, r.titulo, r.director, r.codirector, r.carrera, r.cohorte, r.numero_resolucion].some(v => v?.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase())));
  const ocupado = confirmacion.abierto || confirmacion.procesando;
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return <section className="perfil-pagina tesis-pagina">
    <header className="perfil-pagina-encabezado tesis-cabecera">
      <div><h1>{titulo}</h1><p>{resumen ? "Seguimiento de tesis de maestría y doctorado." : puedeEditar ? "Administrá los registros, directores y resoluciones de aprobación." : "Consulta de registros de tesis de maestría y doctorado."}</p></div>
      {puedeEditar && !carga && !errorCarga && <button className="tesis-btn tesis-btn-primario" type="button" disabled={abierto || ocupado || !candidatos.length} onClick={nuevo}>Registrar tesis</button>}
    </header>
    {mensaje && <MensajeSistema {...mensaje} alCerrar={() => setMensaje(null)} />}
    {carga ? <p role="status">Cargando tesis…</p> : errorCarga ? <><MensajeSistema tipo="error" texto={errorCarga} /><button className="tesis-btn" type="button" onClick={recargar}>Reintentar</button></> : <>
      <div className="perfil-resumen tesis-indicadores">
        {[
          { etiqueta: "Tesis registradas", valor: registros.length, estilo: "azul", icono: "📄" },
          { etiqueta: "Sin aprobación registrada", valor: registros.filter(r => !r.fecha_aprobacion).length, estilo: "amarilla", icono: "🕒" },
          { etiqueta: "Aprobadas por CPR", valor: registros.filter(r => r.fecha_aprobacion).length, estilo: "verde", icono: "✓" },
        ].map(item => <article key={item.etiqueta} className={`perfil-tarjeta-resumen perfil-tarjeta-${item.estilo}`}>
          <h2>{item.etiqueta}</h2><div className="perfil-tarjeta-contenido"><strong>{item.valor}</strong><span className="tesis-icono" aria-hidden="true">{item.icono}</span></div>
        </article>)}
      </div>
      {resumen && <div className="perfil-paneles">
        <article className="perfil-panel"><header><h2>Gestión académica</h2></header><div className="tesis-panel-cuerpo"><h3>Gestión de tesis</h3><p>Registrá y consultá títulos, directores, codirectores y resoluciones.</p><Link className="tesis-btn tesis-btn-primario" to="/dashboard/cpr/tesis">Ingresar a Gestión de tesis</Link></div></article>
        <article className="perfil-panel"><header><h2>Registros de tesis</h2></header>{registros.length ? <ul className="perfil-lista">{registros.slice(0, 5).map(r => <li key={r.id}><div><strong>{r.estudiante}</strong><small className="tesis-secundario">{r.titulo}</small></div><span>{r.fecha_aprobacion ? "Aprobada" : "Sin aprobación"}</span></li>)}</ul> : <div className="tesis-panel-cuerpo"><p>Todavía no hay tesis registradas.</p><p>Las tesis que registres estarán disponibles también para Conducción y el estudiante correspondiente.</p></div>}</article>
      </div>}
      {!resumen && <>
      {puedeEditar && <div className="tesis-aviso" role="status"><strong>{candidatos.length ? `${candidatos.length} estudiante(s) habilitado(s) para registrar una tesis` : "No hay estudiantes habilitados para registrar una tesis"}</strong><p>{candidatos.length ? "Seleccioná Registrar tesis para iniciar el registro." : "Para registrar una tesis debe existir un legajo activo o en riesgo de una maestría o doctorado que aún no tenga tesis. La matrícula se gestiona desde Equipo de Conducción."}</p><button className="tesis-btn" type="button" onClick={recargar} disabled={ocupado || abierto}>Actualizar listado</button></div>}
      <article className="perfil-panel tesis-panel"><header><h2>Consulta de tesis</h2><p className="tesis-secundario">Buscá por estudiante, título, director o resolución.</p></header><div className="tesis-panel-cuerpo"><div className="tesis-filtros">
        <label>Buscar<input placeholder="Estudiante, título…" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></label>
        <label>Carrera<select value={carrera} onChange={e => setCarrera(e.target.value)}><option value="">Todas</option>{[...new Set(registros.map(r => r.carrera))].sort().map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Tipo<select value={tipo} onChange={e => setTipo(e.target.value)}><option value="">Todos</option><option value="Maestria">Maestría</option><option value="Doctorado">Doctorado</option></select></label>
        <label>Estado<select value={estado} onChange={e => setEstado(e.target.value)}><option value="">Todos</option><option value="pendiente">Sin aprobación registrada</option><option value="aprobada">Aprobada por CPR</option></select></label>
        <button className="tesis-btn" type="button" onClick={() => { setBusqueda(""); setCarrera(""); setTipo(""); setEstado(""); }}>Limpiar filtros</button>
      </div>
      {filtrados.length ? <div className="tesis-tabla" tabIndex={0} role="region" aria-label="Listado de tesis"><table><caption>Tesis registradas ({filtrados.length})</caption><thead><tr><th scope="col">Estudiante / carrera</th><th scope="col">Título</th><th scope="col">Dirección</th><th scope="col">Aprobación CPR</th>{puedeEditar && <th scope="col">Acciones</th>}</tr></thead><tbody>{filtrados.map(r => <tr key={r.id}><td>{r.estudiante}<small>{r.carrera} · {r.cohorte}</small></td><td>{r.titulo}</td><td>{r.director}{r.codirector && <small>Codirector: {r.codirector}</small>}</td><td>{r.fecha_aprobacion ? <><span className="tesis-estado tesis-estado-aprobada">{r.fecha_aprobacion.split("-").reverse().join("/")}</span><small>Resolución: {r.numero_resolucion}</small></> : <span className="tesis-estado">Sin aprobación registrada</span>}</td>{puedeEditar && <td><button className="tesis-btn" type="button" disabled={abierto || ocupado} onClick={() => editar(r)}>Editar</button></td>}</tr>)}</tbody></table></div> : <div className="tesis-vacio"><span aria-hidden="true">📄</span><strong>{registros.length ? "No se encontraron resultados" : "Todavía no hay tesis registradas"}</strong><p>No hay tesis que coincidan con la consulta.</p>{registros.length > 0 && <p>Probá modificando los filtros.</p>}</div>}
      </div></article>
      </>}
    </>}
    {puedeEditar && abierto && <form className="perfil-panel tesis-formulario" onSubmit={guardar}>
      <header><h2>{editando ? "Modificar tesis" : "Registrar tesis"}</h2><p className="tesis-secundario">Completá los datos académicos y confirmá para guardar.</p></header>
      <fieldset disabled={ocupado}><legend>Datos académicos</legend>
        {editando ? <p>{editando.estudiante} — {editando.carrera}</p> : <label>Estudiante y cohorte<select required value={formulario.legajo_id} onChange={e => cambiar("legajo_id", e.target.value)}><option value="">Seleccionar estudiante</option>{candidatos.map(c => <option key={c.legajo_id} value={c.legajo_id}>{c.estudiante} — {c.carrera} — {c.cohorte}</option>)}</select></label>}
        <label>Título de la tesis<input required minLength={5} maxLength={300} value={formulario.titulo} onChange={e => cambiar("titulo", e.target.value)} /></label>
        <label>Director<input required minLength={2} maxLength={200} value={formulario.director} onChange={e => cambiar("director", e.target.value)} /></label>
        <label>Codirector (opcional)<input maxLength={200} value={formulario.codirector} onChange={e => cambiar("codirector", e.target.value)} /></label>
        <label>Fecha de aprobación CPR<input type="date" max={hoy} value={formulario.fecha_aprobacion} onChange={e => cambiar("fecha_aprobacion", e.target.value)} /></label>
        <label>Número de resolución<input maxLength={100} value={formulario.numero_resolucion} onChange={e => cambiar("numero_resolucion", e.target.value)} /></label>
        <p>Dejá ambos campos de aprobación vacíos si aún no corresponde registrar la resolución.</p>
        {conflicto && <p role="alert">Cerrá este formulario y seleccioná nuevamente el registro actualizado antes de guardar.</p>}
        <div className="tesis-acciones"><button className="tesis-btn" type="button" onClick={() => setAbierto(false)}>Cancelar</button><button className="tesis-btn tesis-btn-primario" type="submit" disabled={conflicto}>Guardar</button></div>
      </fieldset>
    </form>}
    <ConfirmacionModal abierto={confirmacion.abierto} titulo={confirmacion.titulo} descripcion={confirmacion.descripcion} textoConfirmar={confirmacion.textoConfirmar} alCancelar={confirmacion.cancelar} alConfirmar={confirmacion.confirmar} confirmando={confirmacion.procesando} peligroso={confirmacion.peligroso} />
  </section>;
}
