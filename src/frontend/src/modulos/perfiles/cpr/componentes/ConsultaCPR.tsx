import { useEffect, useState } from "react";
import { useAuth } from "../../../manejo-sesion/useAuth";
import { api } from "../../../../shared/api/client";
import MensajeSistema from "../../../../shared/componentes/MensajeSistema/MensajeSistema";
import "../../shared/estilos/PerfilesCompartidos.css";
import "../estilos/CPR.css";

type Alumno = {
  legajo_id: string; estudiante: string; carrera: string; tipo: string;
  cohorte: string; estado: string; trabajo: string;
};
type Docente = { id: string; docente: string; carrera: string; seminario: string };
type Fila = Alumno | Docente;

export default function ConsultaCPR({ modo }: { modo: "estudiantes" | "docentes" }) {
  const { user } = useAuth();
  const token = user?.token;
  const [filas, setFilas] = useState<Fila[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [carrera, setCarrera] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!token) return;
    let vigente = true;
    api.get<Fila[]>(`/inscripcion/tesis/${modo}`, token)
      .then(datos => { if (vigente) { setFilas(datos); setEstado("listo"); } })
      .catch(() => { if (vigente) { setFilas([]); setEstado("error"); } });
    return () => { vigente = false; };
  }, [token, modo, revision]);

  const alumnos = modo === "estudiantes";
  const carreras = [...new Set(filas.map(f => f.carrera))].sort();
  const estados = [...new Set(filas.flatMap(f => "estudiante" in f ? [f.estado] : []))].sort();
  const visibles = filas.filter(f =>
    (!carrera || f.carrera === carrera) &&
    (!filtroEstado || ("estudiante" in f && f.estado === filtroEstado)) &&
    Object.values(f).join(" ").toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase())
  );
  const etiqueta = (valor: string) => valor.replace(/_/g, " ").toLocaleLowerCase();

  return <section className="perfil-pagina cpr-consulta">
    <header className="perfil-pagina-encabezado">
      <h1>{alumnos ? "Estudiantes matriculados" : "Docentes de posgrado"}</h1>
      <p>{alumnos ? "Consultá la información académica de los estudiantes matriculados." : "Consultá los docentes activos y sus seminarios asignados."}</p>
    </header>
    {estado === "cargando" && <p role="status">Cargando información académica…</p>}
    {estado === "error" && <>
      <MensajeSistema tipo="error" texto="No se pudo cargar la consulta." />
      <button className="cpr-boton" type="button" onClick={() => { setEstado("cargando"); setRevision(v => v + 1); }}>Reintentar</button>
    </>}
    {estado === "listo" && <>
      <section className="perfil-panel">
        <header><h2>Filtros de búsqueda</h2></header>
        <div className="perfil-panel-interior">
          <div className="cpr-filtros">
            <label>Buscar<input type="search" placeholder={alumnos ? "Nombre, carrera o cohorte" : "Nombre, carrera o seminario"} value={busqueda} onChange={e => setBusqueda(e.target.value)} /></label>
            <label>Carrera<select value={carrera} onChange={e => setCarrera(e.target.value)}><option value="">Todas</option>{carreras.map(c => <option key={c}>{c}</option>)}</select></label>
            {alumnos && <label>Estado académico<select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}><option value="">Todos</option>{estados.map(e => <option key={e} value={e}>{etiqueta(e)}</option>)}</select></label>}
          </div>
          <button className="cpr-boton" type="button" onClick={() => { setBusqueda(""); setCarrera(""); setFiltroEstado(""); }}>Limpiar filtros</button>
        </div>
      </section>
      <section className="perfil-panel">
        <header className="cpr-listado-cabecera"><h2>{alumnos ? "Listado de estudiantes" : "Listado de docentes"}</h2><span role="status">{visibles.length} registros</span></header>
        <div className="perfil-panel-interior">
          {visibles.length ? <div className="cpr-tabla" tabIndex={0} role="region" aria-label={alumnos ? "Listado de estudiantes" : "Listado de docentes"}>
            <table>
              <thead><tr><th scope="col">{alumnos ? "Estudiante" : "Docente"}</th><th scope="col">Carrera</th><th scope="col">{alumnos ? "Cohorte" : "Seminario"}</th>{alumnos && <><th scope="col">Estado académico</th><th scope="col">Trabajo final</th></>}</tr></thead>
              <tbody>{visibles.map((f, i) => "estudiante" in f ?
                <tr key={f.legajo_id}><td><strong>{f.estudiante}</strong></td><td>{f.carrera}</td><td>{f.cohorte}</td><td><span className={`cpr-estado ${f.estado === "ACTIVO" ? "cpr-activo" : f.estado === "EN_RIESGO" ? "cpr-riesgo" : ""}`}>{etiqueta(f.estado)}</span></td><td>{f.trabajo}</td></tr> :
                <tr key={`${f.id}-${i}`}><td><strong>{f.docente}</strong></td><td>{f.carrera}</td><td>{f.seminario}</td></tr>)}</tbody>
            </table>
          </div> : <div className="cpr-vacio"><h3>No se encontraron registros</h3><p>Probá con otros filtros o consultá nuevamente.</p></div>}
        </div>
      </section>
    </>}
  </section>;
}
