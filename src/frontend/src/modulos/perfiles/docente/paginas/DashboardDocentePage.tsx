import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";
import ListaAlertas from "../../shared/componentes/ListaAlertas";
import "../../shared/estilos/PerfilesCompartidos.css";

interface Seminario { id: string; nombre: string; carrera_nombre: string; fecha_inicio: string; }
interface Alumno { legajo_id: string; dni_pasaporte: string; total_clases: number; nota_final: number | null; }
interface Resumen { seminarios: Seminario[]; estudiantes: number; notas: number; sinClases: number; }

export default function DashboardDocentePage() {
  const { user } = useAuth();
  const token = user?.token;
  const [resultado, setResultado] = useState<{ token: string; resumen?: Resumen; error?: string } | null>(null);
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    if (!token) return;
    let vigente = true;
    async function cargar() {
      try {
        const seminarios = await api.get<Seminario[]>("/seminarios/mis-seminarios", token);
        const listas = await Promise.all(seminarios.map(s => api.get<Alumno[]>(`/seminarios/${s.id}/estudiantes`, token)));
        const alumnos = listas.flat();
        if (vigente) setResultado({ token: token!, resumen: {
          seminarios, estudiantes: new Set(alumnos.map(a => a.dni_pasaporte || a.legajo_id)).size,
          notas: alumnos.filter(a => a.nota_final === null).length,
          sinClases: listas.filter(l => l.length > 0 && l.every(a => a.total_clases === 0)).length,
        }});
      } catch (e) {
        if (vigente) setResultado({ token: token!, error: e instanceof Error ? e.message : "No se pudo cargar el resumen docente." });
      }
    }
    void cargar();
    return () => { vigente = false; };
  }, [token, intento]);
  const actual = resultado?.token === token ? resultado : null;
  const resumen = actual?.resumen;
  const metricas = [
    { titulo: "Seminarios asignados", valor: resumen?.seminarios.length, color: "azul", ruta: "seminarios" },
    { titulo: "Estudiantes a cargo", valor: resumen?.estudiantes, color: "gris", ruta: "estudiantes" },
    { titulo: "Calificaciones pendientes", valor: resumen?.notas, color: "verde", ruta: "calificaciones" },
  ];
  return <section className="perfil-pagina">
    <header className="perfil-pagina-encabezado"><h1>Hola, {user?.nombre ?? "Docente"}!</h1><p>Bienvenido/a a tu panel docente.</p></header>
    {token && !actual && <p role="status">Cargando resumen docente…</p>}
    {actual?.error && <div role="alert">{actual.error} <button type="button" onClick={() => { setResultado(null); setIntento(i => i + 1); }}>Reintentar</button></div>}
    <section className="perfil-resumen" aria-label="Resumen docente">
      {metricas.map(m => <article key={m.titulo} className={`perfil-tarjeta-resumen perfil-tarjeta-${m.color}`}><h2>{m.titulo}</h2><div className="perfil-tarjeta-contenido"><strong>{m.valor ?? "—"}</strong><Link className="perfil-enlace" to={`/dashboard/docente/${m.ruta}`}>Ver detalle →</Link></div></article>)}
    </section>
    <div className="perfil-paneles">
      <article className="perfil-panel"><header><h2>Seminarios asignados</h2></header>
        {resumen && (resumen.seminarios.length ? <ul className="perfil-lista">{resumen.seminarios.slice(0, 5).map(s => <li key={s.id}><span><strong>{s.nombre}</strong><br/>{s.carrera_nombre}</span><time dateTime={s.fecha_inicio}>{s.fecha_inicio.split("-").reverse().join("/")}</time></li>)}</ul> : <p className="perfil-panel-interior">No tenés seminarios asignados.</p>)}
        <div className="perfil-panel-interior"><Link className="perfil-enlace" to="/dashboard/docente/seminarios">Ver mis seminarios →</Link></div>
      </article>
      <article className="perfil-panel"><header><h2>Últimas notificaciones</h2></header><div className="perfil-panel-interior"><ListaAlertas resumen/><Link className="perfil-enlace" to="/dashboard/alertas">Ver todas las notificaciones →</Link></div></article>
    </div>
    <article className="perfil-panel"><header><h2>Seguimiento académico</h2></header><div className="perfil-panel-interior"><p>Seminarios con estudiantes y sin clases registradas: <strong>{resumen?.sinClases ?? "—"}</strong></p><Link className="perfil-enlace" to="/dashboard/docente/asistencia">Gestionar asistencias →</Link></div></article>
  </section>;
}
