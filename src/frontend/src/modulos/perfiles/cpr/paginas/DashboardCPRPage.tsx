import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../manejo-sesion/useAuth";
import { tesisApi, type RegistroTesis, type CandidatoTesis } from "../../../../shared/api/tesis";
import ListaAlertas from "../../shared/componentes/ListaAlertas";
import MensajeSistema from "../../../../shared/componentes/MensajeSistema/MensajeSistema";
import "../../shared/estilos/PerfilesCompartidos.css";

type Resumen = { registros: RegistroTesis[]; candidatos: CandidatoTesis[] };
const ruta = "/dashboard/cpr/tesis";

export default function DashboardCPRPage() {
  const { user } = useAuth();
  const token = user?.token;
  const [datos, setDatos] = useState<Resumen | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!token) return;
    let vigente = true;
    Promise.all([tesisApi.listar(token), tesisApi.candidatos(token)])
      .then(([registros, candidatos]) => {
        if (vigente) { setDatos({ registros, candidatos }); setError(""); }
      })
      .catch(() => { if (vigente) { setDatos(null); setError("No se pudo cargar el resumen de CPR."); } })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [token, revision]);

  const registros = datos?.registros ?? [];
  const pendientes = registros.filter(r => !r.fecha_aprobacion);
  const indicadores = [
    { titulo: "Tesis registradas", valor: registros.length, color: "azul" },
    { titulo: "Pendientes de aprobación", valor: pendientes.length, color: "amarilla" },
    { titulo: "Aprobadas por CPR", valor: registros.length - pendientes.length, color: "verde" },
    { titulo: "Estudiantes sin tesis registrada", valor: datos?.candidatos.length ?? 0, color: "celeste" },
    { titulo: "Tesis de maestría", valor: registros.filter(r => r.tipo === "Maestria").length, color: "azul" },
    { titulo: "Tesis de doctorado", valor: registros.filter(r => r.tipo === "Doctorado").length, color: "azul" },
  ];
  return <section className="perfil-pagina">
    <header className="perfil-pagina-encabezado"><h1>Panel de CPR</h1><p>Gestión y seguimiento de tesis de maestría y doctorado.</p></header>
    {cargando && <p role="status">Cargando resumen académico…</p>}
    {error && <><MensajeSistema tipo="error" texto={error} /><button type="button" onClick={() => { setCargando(true); setError(""); setRevision(v => v + 1); }}>Reintentar</button></>}
    <div className="perfil-resumen" aria-busy={cargando}>
      {indicadores.map(i => <article key={i.titulo} className={`perfil-tarjeta-resumen perfil-tarjeta-${i.color}`}><h2>{i.titulo}</h2><div className="perfil-tarjeta-contenido"><strong>{datos && !cargando ? i.valor : "—"}</strong><Link className="perfil-enlace" to={ruta}>Consultar →</Link></div></article>)}
    </div>
    <div className="perfil-paneles perfil-dashboard-seguimiento">
      <article className="perfil-panel"><header><h2>Tesis pendientes de aprobación</h2></header>
        {datos && !cargando && (pendientes.length ? <ul className="perfil-lista">{pendientes.slice(0, 5).map(r => <li key={r.id}><span><strong>{r.estudiante}</strong><br/>{r.titulo}<br/>{r.carrera} · {r.cohorte}</span></li>)}</ul> : <p className="perfil-panel-interior">No hay tesis pendientes de aprobación.</p>)}
        <div className="perfil-panel-interior"><Link className="perfil-enlace" to={ruta}>Gestionar tesis →</Link></div>
      </article>
      <article className="perfil-panel"><header><h2>Últimas notificaciones</h2></header><div className="perfil-panel-interior"><ListaAlertas resumen/><Link className="perfil-enlace" to="/dashboard/alertas">Ver todas las notificaciones →</Link></div></article>
    </div>
    <article className="perfil-panel"><header><h2>Estudiantes habilitados para registrar tesis</h2></header>
      {datos && !cargando && (datos.candidatos.length ? <ul className="perfil-lista">{datos.candidatos.slice(0, 5).map(c => <li key={c.legajo_id}><span><strong>{c.estudiante}</strong><br/>{c.carrera} · {c.cohorte}</span></li>)}</ul> : <p className="perfil-panel-interior">No hay estudiantes matriculados de maestría o doctorado sin tesis registrada.</p>)}
      <div className="perfil-panel-interior"><Link className="perfil-enlace" to={ruta}>Consultar estudiantes y registrar tesis →</Link></div>
    </article>
  </section>;
}
