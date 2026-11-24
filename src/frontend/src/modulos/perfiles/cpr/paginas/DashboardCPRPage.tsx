import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../manejo-sesion/useAuth";
import { api } from "../../../../shared/api/client";
import { tesisApi, type RegistroTesis, type CandidatoTesis } from "../../../../shared/api/tesis";
import ListaAlertas from "../../shared/componentes/ListaAlertas";
import MensajeSistema from "../../../../shared/componentes/MensajeSistema/MensajeSistema";
import "../../shared/estilos/PerfilesCompartidos.css";

type Resumen = {
  registros: RegistroTesis[] | null;
  candidatos: CandidatoTesis[] | null;
  estudiantes: number | null;
  docentes: number | null;
  trabajos: number | null;
  tutorias: number | null;
};
const rutaTesis = "/dashboard/cpr/tesis";
function resultado<T>(consulta: PromiseSettledResult<T>): T | null {
  return consulta.status === "fulfilled" ? consulta.value : null;
}

export default function DashboardCPRPage() {
  const { user } = useAuth();
  const token = user?.token;
  const [datos, setDatos] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!token) return;
    let vigente = true;
    Promise.allSettled([
      tesisApi.listar(token),
      tesisApi.candidatos(token),
      api.get<{ legajo_id: string }[]>("/inscripcion/tesis/estudiantes", token),
      api.get<{ id: string }[]>("/inscripcion/tesis/docentes", token),
      api.get<{ activo: boolean }[]>("/inscripcion/trabajos-practicos", token),
      api.get<{ activa: boolean }[]>("/tutorias", token),
    ] as const).then(([tesis, candidatos, estudiantes, docentes, trabajos, tutorias]) => {
      if (!vigente) return;
      const alumnos = resultado(estudiantes);
      const profesores = resultado(docentes);
      setDatos({
        registros: resultado(tesis), candidatos: resultado(candidatos),
        estudiantes: alumnos === null ? null : new Set(alumnos.map(a => a.legajo_id)).size,
        docentes: profesores === null ? null : new Set(profesores.map(d => d.id)).size,
        trabajos: resultado(trabajos)?.filter(t => t.activo).length ?? null,
        tutorias: resultado(tutorias)?.filter(t => t.activa).length ?? null,
      });
      setCargando(false);
    });
    return () => { vigente = false; };
  }, [token, revision]);

  const pendientes = datos?.registros?.filter(r => !r.fecha_aprobacion);
  const error = datos !== null && Object.values(datos).some(v => v === null);
  const indicadores = [
    { titulo: "Estudiantes matriculados", valor: datos?.estudiantes, color: "azul", ruta: "/dashboard/cpr/estudiantes", enlace: "Ver estudiantes" },
    { titulo: "Docentes con seminarios", valor: datos?.docentes, color: "celeste", ruta: "/dashboard/cpr/docentes", enlace: "Ver docentes" },
    { titulo: "Tesis registradas", valor: datos?.registros?.length, color: "gris", ruta: rutaTesis, enlace: "Ver tesis" },
    { titulo: "Tesis pendientes", valor: pendientes?.length, color: "amarilla", ruta: rutaTesis, enlace: "Consultar" },
    { titulo: "Trabajos prácticos activos", valor: datos?.trabajos, color: "azul", ruta: "/dashboard/cpr/trabajos-practicos", enlace: "Ver trabajos" },
    { titulo: "Tutorías activas", valor: datos?.tutorias, color: "verde", ruta: "/dashboard/cpr/tutorias", enlace: "Ver tutorías" },
  ];

  return (
    <section className="perfil-pagina animate-fade-in">
      <header className="perfil-pagina-encabezado">
        <h1>Hola, {user?.nombre ?? "CPR"}!</h1>
        <p>Bienvenido/a a tu panel de CPR.</p>
      </header>
      {cargando && <p role="status">Cargando resumen académico…</p>}
      {error && <div className="perfil-dashboard-seguimiento">
        <MensajeSistema tipo="error" texto="No se pudo cargar el resumen de CPR." />
        <button type="button" className="perfil-enlace" onClick={() => { setCargando(true); setDatos(null); setRevision(v => v + 1); }}>Reintentar</button>
      </div>}
      <section className="perfil-resumen" aria-label="Resumen académico" aria-busy={cargando}>
        {indicadores.map(i => (
          <article key={i.titulo} className={`perfil-tarjeta-resumen perfil-tarjeta-${i.color}`}>
            <h2>{i.titulo}</h2>
            <div className="perfil-tarjeta-contenido">
              <strong>{cargando ? "…" : i.valor ?? "—"}</strong>
              <Link className="perfil-enlace" to={i.ruta}>{i.enlace} →</Link>
            </div>
          </article>
        ))}
      </section>
      <div className="perfil-paneles perfil-dashboard-seguimiento">
        <article className="perfil-panel">
          <header><h2>Tesis pendientes de aprobación</h2></header>
          {!cargando && (pendientes === undefined ? <p className="perfil-panel-interior">No se pudo consultar las tesis.</p> : pendientes.length ? <ul className="perfil-lista">{pendientes.slice(0, 5).map(r => <li key={r.id}><span><strong>{r.estudiante}</strong><br />{r.titulo}<br />{r.carrera} · {r.cohorte}</span></li>)}</ul> : <p className="perfil-panel-interior">No hay tesis pendientes de aprobación.</p>)}
          <div className="perfil-panel-interior"><Link className="perfil-enlace" to={rutaTesis}>Gestionar tesis →</Link></div>
        </article>
        <article className="perfil-panel">
          <header><h2>Últimas notificaciones</h2></header>
          <div className="perfil-panel-interior"><ListaAlertas resumen /><Link className="perfil-enlace" to="/dashboard/alertas">Ver todas las notificaciones →</Link></div>
        </article>
      </div>
      <article className="perfil-panel">
        <header><h2>Estudiantes habilitados para registrar tesis{datos?.candidatos ? ` (${datos.candidatos.length})` : ""}</h2></header>
        {!cargando && (datos?.candidatos == null ? <p className="perfil-panel-interior">No se pudo consultar los estudiantes habilitados.</p> : datos.candidatos.length ? <ul className="perfil-lista">{datos.candidatos.slice(0, 5).map(c => <li key={c.legajo_id}><span><strong>{c.estudiante}</strong><br />{c.carrera} · {c.cohorte}</span></li>)}</ul> : <p className="perfil-panel-interior">No hay estudiantes matriculados de maestría o doctorado sin tesis registrada.</p>)}
        <div className="perfil-panel-interior"><Link className="perfil-enlace" to={rutaTesis}>Consultar estudiantes y registrar tesis →</Link></div>
      </article>
    </section>
  );
}
