import { useEffect, useState } from "react";
import { useAuth } from "../../../manejo-sesion/useAuth";
import { api } from "../../../../shared/api/client";
import MensajeSistema from "../../../../shared/componentes/MensajeSistema/MensajeSistema";
import "../../shared/estilos/PerfilesCompartidos.css";

type Alumno = { legajo_id: string; estudiante: string; carrera: string; tipo: string; cohorte: string; estado: string; trabajo: string };
type Docente = { id: string; docente: string; carrera: string; seminario: string };
type Fila = Alumno | Docente;
export default function ConsultaCPR({ modo }: { modo: "estudiantes" | "docentes" }) {
  const { user } = useAuth();
  const [filas, setFilas] = useState<Fila[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [carrera, setCarrera] = useState("");
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
  const [revision, setRevision] = useState(0);
  const token = user?.token;
  useEffect(() => {
    if (!token) return;
    let vigente = true;
    api.get<Fila[]>(`/inscripcion/tesis/${modo}`, token)
      .then(datos => { if (vigente) { setFilas(datos); setEstado("listo"); } })
      .catch(() => { if (vigente) { setFilas([]); setEstado("error"); } });
    return () => { vigente = false; };
  }, [token, modo, revision]);
  const carreras = [...new Set(filas.map(f => f.carrera))].sort();
  const visibles = filas.filter(f => (!carrera || f.carrera === carrera) && Object.values(f).join(" ").toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase()));
  const alumnos = modo === "estudiantes";
  return <section className="perfil-pagina">
    <header className="perfil-pagina-encabezado"><h1>{alumnos ? "Estudiantes matriculados" : "Docentes de posgrado"}</h1><p>{alumnos ? "Consulta de seguimiento de trabajos finales y tesis." : "Docentes activos con seminarios asignados."}</p></header>
    {estado === "cargando" && <p role="status">Cargando información académica…</p>}
    {estado === "error" && <><MensajeSistema tipo="error" texto="No se pudo cargar la consulta."/><button type="button" onClick={() => { setEstado("cargando"); setRevision(v => v + 1); }}>Reintentar</button></>}
    {estado === "listo" && <article className="perfil-panel"><header><h2>Listado académico</h2></header><div className="perfil-panel-interior">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"><label>Buscar<input className="block w-full border rounded p-2" value={busqueda} onChange={e => setBusqueda(e.target.value)}/></label><label>Carrera<select className="block w-full border rounded p-2" value={carrera} onChange={e => setCarrera(e.target.value)}><option value="">Todas</option>{carreras.map(c => <option key={c}>{c}</option>)}</select></label></div>
      <p role="status">{visibles.length} registros</p>
      {visibles.length ? <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr><th scope="col">{alumnos ? "Estudiante" : "Docente"}</th><th scope="col">Carrera</th><th scope="col">{alumnos ? "Cohorte" : "Seminario"}</th>{alumnos && <><th scope="col">Estado académico</th><th scope="col">Trabajo final</th></>}</tr></thead><tbody>{visibles.map((f,i) => "estudiante" in f ? <tr key={f.legajo_id} className="border-t"><td className="p-2">{f.estudiante}</td><td>{f.carrera}</td><td>{f.cohorte}</td><td>{f.estado}</td><td>{f.trabajo}</td></tr> : <tr key={`${f.id}-${i}`} className="border-t"><td className="p-2">{f.docente}</td><td>{f.carrera}</td><td>{f.seminario}</td></tr>)}</tbody></table></div> : <p>No se encontraron registros para los filtros seleccionados.</p>}
    </div></article>}
  </section>;
}
