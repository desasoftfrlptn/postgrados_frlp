import { useEffect, useState } from "react";
import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";
import { CabeceraConduccion, SelectorCohorteConduccion, useLegajosConduccion } from "../componentes/SeleccionLegajosConduccion";
import { construirCSV, descargarCSV } from "../datos/conduccionDatos";

interface Cursada {
  id: string; seminario: string; docente: string; estudiante: string; documento: string;
  estado: string; nota: number | null; asistencias: number; total_clases: number;
}
const porcentaje = (fila: Cursada) => fila.total_clases ? `${(100 * fila.asistencias / fila.total_clases).toFixed(1)} %` : "Sin clases";
const columnas = ["Seminario", "Docente", "Estudiante", "Documento", "Asistencia", "Nota", "Estado"];
const valores = (fila: Cursada) => [fila.seminario, fila.docente, fila.estudiante, fila.documento, porcentaje(fila), fila.nota ?? "Sin nota", fila.estado];

export default function SeminariosConduccionPage() {
  const datos = useLegajosConduccion();
  const { user } = useAuth();
  const token = user?.token;
  const cohorteId = datos.cohorteId;
  const [resultado, setResultado] = useState<{ cohorte: string; filas: Cursada[]; error: string } | null>(null);
  const [intento, setIntento] = useState(0);
  const [carrera, setCarrera] = useState("");
  const [seminario, setSeminario] = useState("");
  const [docente, setDocente] = useState("");
  const [estado, setEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  useEffect(() => {
    if (!cohorteId || !token) return;
    let vigente = true;
    api.get<Cursada[]>(`/seminarios/consulta-conduccion?cohorte_id=${encodeURIComponent(cohorteId)}`, token)
      .then(filas => { if (vigente) setResultado({cohorte: cohorteId, filas, error: ""}); })
      .catch((e: unknown) => { if (vigente) setResultado({cohorte: cohorteId, filas: [], error: e instanceof Error ? e.message : "No se pudo consultar la cursada."}); });
    return () => { vigente = false; };
  }, [cohorteId, token, intento]);
  const actual = resultado?.cohorte === cohorteId ? resultado : null;
  const filas = actual?.filas ?? [];
  const candidatos = filas.filter(f => (!seminario || f.seminario === seminario) && (!docente || f.docente === docente) && (!estado || f.estado === estado));
  const visibles = candidatos.filter(f => !busqueda || f.documento === busqueda);
  const estudiantes = [...new Map(candidatos.map(f => [f.documento, f.estudiante])).entries()].sort((a,b) => a[1].localeCompare(b[1]));
  function limpiar() { setSeminario(""); setDocente(""); setEstado(""); setBusqueda(""); }
  return <section className="cc-pagina">
    <CabeceraConduccion titulo="Seminarios y calificaciones" descripcion="Consulta de cursadas, asistencia y notas por cohorte." />
    <div className="cc-tarjeta"><h2>Filtros académicos</h2><div className="cc-campo"><label htmlFor="consulta-carrera">Carrera</label><select id="consulta-carrera" value={carrera} onChange={e=>{setCarrera(e.target.value); limpiar(); setResultado(null); datos.setCohorteId("");}}><option value="">Todas</option>{datos.carreras.map(c=><option value={c.id} key={c.id}>{c.nombre}</option>)}</select></div><SelectorCohorteConduccion datos={{...datos, cohortes: datos.cohortes.filter(c=>!carrera || c.carrera_id===carrera), setCohorteId: id => { limpiar(); setResultado(null); datos.setCohorteId(id); }}} />
      <div className="cc-filtros">
        {([{id:"seminario", etiqueta:"Seminario", valor:seminario, cambiar:setSeminario, opciones:filas.map(f=>f.seminario)}, {id:"docente", etiqueta:"Docente", valor:docente, cambiar:setDocente, opciones:filas.map(f=>f.docente)}, {id:"estado", etiqueta:"Estado académico", valor:estado, cambiar:setEstado, opciones:filas.map(f=>f.estado)}]).map(o=><div className="cc-campo" key={o.id}><label htmlFor={`consulta-${o.id}`}>{o.etiqueta}</label><select id={`consulta-${o.id}`} value={o.valor} onChange={e=>{o.cambiar(e.target.value); setBusqueda("");}}><option value="">Todos</option>{[...new Set(o.opciones)].sort().map(v=><option key={v}>{v}</option>)}</select></div>)}
        <div className="cc-campo"><label htmlFor="consulta-busqueda">Estudiante</label><select id="consulta-busqueda" value={busqueda} disabled={!actual || !!actual.error} onChange={e=>setBusqueda(e.target.value)}><option value="">Todos</option>{estudiantes.map(([documento,nombre]) => <option key={documento} value={documento}>{nombre} · {documento}</option>)}</select></div>
      </div><div className="cc-acciones" style={{marginTop:16}}><button className="cc-btn cc-btn-secundario" onClick={limpiar}>Limpiar filtros</button></div>
    </div>
    {!cohorteId ? <p>Seleccioná una cohorte para consultar las cursadas.</p> : !actual ? <p role="status">Cargando cursadas…</p> : actual.error ? <div role="alert">{actual.error} <button className="cc-btn" onClick={()=>{setResultado(null);setIntento(n=>n+1);}}>Reintentar</button></div> : <div className="cc-tarjeta">
      <h2>Cursadas ({visibles.length})</h2><div className="cc-resumen">
        <div className="cc-metrica"><strong>{new Set(visibles.map(f=>f.documento)).size}</strong><span>Estudiantes</span></div>
        <div className="cc-metrica"><strong>{visibles.filter(f=>f.estado === "APROBADO").length}</strong><span>Cursadas aprobadas</span></div>
        <div className="cc-metrica"><strong>{visibles.some(f=>f.nota !== null) ? (visibles.reduce((s,f)=>s+(f.nota ?? 0),0)/visibles.filter(f=>f.nota !== null).length).toFixed(2) : "Sin notas"}</strong><span>Nota promedio</span></div>
        <div className="cc-metrica"><strong>{visibles.reduce((s,f)=>s+f.total_clases,0) ? (100*visibles.reduce((s,f)=>s+f.asistencias,0)/visibles.reduce((s,f)=>s+f.total_clases,0)).toFixed(1)+" %" : "Sin clases"}</strong><span>Asistencia registrada</span></div>
      </div>
      {visibles.length ? <><div className="cc-tabla-scroll"><table className="cc-tabla"><thead><tr>{columnas.map(c=><th scope="col" key={c}>{c}</th>)}</tr></thead><tbody>{visibles.map(f=><tr key={f.id}>{valores(f).map((v,i)=><td key={i}>{v}</td>)}</tr>)}</tbody></table></div><button className="cc-btn" onClick={()=>descargarCSV("cursadas.csv", construirCSV(columnas, visibles.map(valores)))}>Descargar CSV</button></> : <p>No hay cursadas para los filtros seleccionados.</p>}
    </div>}
  </section>;
}
