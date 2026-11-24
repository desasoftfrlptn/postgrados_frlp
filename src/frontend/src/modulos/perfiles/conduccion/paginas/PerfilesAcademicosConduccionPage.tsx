import { useEffect, useState } from "react";
import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";
import { SelectorCohorteConduccion, useLegajosConduccion } from "../componentes/SeleccionLegajosConduccion";
import { formatearEstado } from "../datos/conduccionDatos";
import "../../shared/estilos/PerfilesCompartidos.css";
import "../estilos/ConduccionModulos.css";

type Perfil = "estudiantes" | "docentes" | "cpr" | "aspirantes";
type Persona = { id: string; nombre: string; apellido: string; correo_electronico: string; rol: string; activo: boolean };
const opciones: { id: Perfil; texto: string }[] = [{id:"estudiantes",texto:"Estudiantes"},{id:"docentes",texto:"Docentes"},{id:"cpr",texto:"CPR"},{id:"aspirantes",texto:"Aspirantes"}];
const estadosAcademicos = ["ACTIVO", "EN_RIESGO", "GRADUADO"];

export default function PerfilesAcademicosConduccionPage() {
  const datos = useLegajosConduccion();
  const { user } = useAuth();
  const token = user?.token;
  const [perfil, setPerfil] = useState<Perfil>("estudiantes");
  const [busqueda, setBusqueda] = useState("");
  const [seleccion, setSeleccion] = useState("");
  const [resultado, setResultado] = useState<{ personas?: Persona[]; error?: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const personal = perfil === "docentes" || perfil === "cpr";
  useEffect(() => {
    if (!token || !personal) return;
    let vigente = true;
    api.get<Persona[]>("/conduccion/perfiles-academicos", token).then(personas => { if (vigente) setResultado({personas}); }).catch(() => { if (vigente) setResultado({error:"No se pudo cargar el personal académico."}); });
    return () => { vigente = false; };
  }, [token, personal, revision]);
  const coincide = (texto: string) => texto.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase());
  const legajos = datos.legajos.filter(l => (perfil === "estudiantes" ? estadosAcademicos.includes(l.estado) : ![...estadosAcademicos,"BORRADOR"].includes(l.estado)) && coincide(`${l.nombre} ${l.apellido} ${l.dni_pasaporte}`));
  const personas = (resultado?.personas ?? []).filter(p => p.rol === (perfil === "docentes" ? "DOCENTE" : "CPR") && coincide(`${p.nombre} ${p.apellido} ${p.correo_electronico}`));
  const detalle = personal ? personas.find(p=>p.id===seleccion) : legajos.find(l=>l.id===seleccion);
  return <section className="perfil-pagina">
    <header className="perfil-pagina-encabezado"><h1>Perfiles académicos</h1><p>Consulta de estudiantes, docentes, CPR y aspirantes. Solo lectura.</p></header>
    <nav className="cc-acciones perfiles-consulta-pestanas" aria-label="Tipos de perfil">{opciones.map(o=><button type="button" key={o.id} className={`cc-btn ${perfil===o.id?"":"cc-btn-secundario"}`} aria-pressed={perfil===o.id} onClick={()=>{setPerfil(o.id);setSeleccion("");setBusqueda("");}}>{o.texto}</button>)}</nav>
    <article className="perfil-panel"><header><h2>Filtros de consulta</h2></header><div className="perfil-panel-interior">
      {!personal && <SelectorCohorteConduccion datos={datos}/>}
      <div className="cc-campo"><label htmlFor="perfil-busqueda">Buscar perfil</label><input id="perfil-busqueda" type="search" value={busqueda} onChange={e=>{setBusqueda(e.target.value);setSeleccion("");}} placeholder="Nombre, apellido o identificación"/></div>
    </div></article>
    <article className="perfil-panel perfiles-consulta-listado"><header><h2>{opciones.find(o=>o.id===perfil)?.texto}</h2></header><div className="perfil-panel-interior">
      {personal && !resultado && <p role="status">Cargando perfiles…</p>}
      {personal && resultado?.error && <><p role="alert">{resultado.error}</p><button className="cc-btn cc-btn-secundario" type="button" onClick={()=>{setResultado(null);setRevision(v=>v+1);}}>Reintentar</button></>}
      {!personal && !datos.cohorteId && <p>Seleccioná una cohorte para consultar los perfiles.</p>}
      {(personal ? !!resultado?.personas : !!datos.cohorteId && !datos.cargandoLegajos && !datos.error) && ((personal ? personas : legajos).length ? <div className="cc-tabla-scroll"><table className="cc-tabla"><thead><tr><th scope="col">Apellido y nombre</th><th scope="col">{personal?"Correo":"Carrera"}</th><th scope="col">Estado</th><th scope="col">Acción</th></tr></thead><tbody>{(personal?personas:legajos).map(p=><tr key={p.id}><td>{p.apellido}, {p.nombre}</td><td>{"rol" in p?p.correo_electronico:p.carrera_elegida}</td><td>{"rol" in p?(p.activo?"Activo":"Inactivo"):formatearEstado(p.estado)}</td><td><button type="button" className="cc-btn cc-btn-secundario" onClick={()=>setSeleccion(p.id)} aria-label={`Consultar ${p.apellido}, ${p.nombre}`}>Consultar</button></td></tr>)}</tbody></table></div>:<p>No hay perfiles para los filtros seleccionados.</p>)}
    </div></article>
    {detalle && <article className="perfil-panel perfiles-consulta-listado"><header><h2>{detalle.apellido}, {detalle.nombre}</h2></header><div className="perfil-panel-interior"><dl className="cc-grilla"><div><dt>Correo electrónico</dt><dd>{detalle.correo_electronico}</dd></div>{"rol" in detalle?<><div><dt>Rol</dt><dd>{detalle.rol}</dd></div><div><dt>Estado</dt><dd>{detalle.activo?"Activo":"Inactivo"}</dd></div></>:<><div><dt>Documento</dt><dd>{detalle.dni_pasaporte}</dd></div><div><dt>Carrera</dt><dd>{detalle.carrera_elegida}</dd></div><div><dt>Estado</dt><dd>{formatearEstado(detalle.estado)}</dd></div><div><dt>Cohorte</dt><dd>{datos.cohorte?.nombre}</dd></div></>}</dl><button className="cc-btn cc-btn-secundario" type="button" onClick={()=>setSeleccion("")}>Cerrar detalle</button></div></article>}
  </section>;
}
