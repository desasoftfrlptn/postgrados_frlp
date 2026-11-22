import { Link } from "react-router-dom";
import { useLegajosConduccion, SelectorCohorteConduccion } from "../componentes/SeleccionLegajosConduccion";
import { contarPorEstado, formatearEstado } from "../datos/conduccionDatos";
import ListaAlertas from "../../shared/componentes/ListaAlertas";
import MensajeSistema from "../../../../shared/componentes/MensajeSistema/MensajeSistema";
import "../../shared/estilos/PerfilesCompartidos.css";

const modulos = [
  { titulo: "Aspirantes y legajos", icono: "👥", descripcion: "Inscripciones, búsquedas, filtros, documentación y estados.", ruta: "aspirantes" },
  { titulo: "Períodos de inscripción", icono: "📅", descripcion: "Cohortes, alta y apertura o cierre de inscripciones.", ruta: "periodos-inscripcion" },
  { titulo: "Exportaciones", icono: "📤", descripcion: "Descargas CSV por cohorte y aspirante.", ruta: "exportaciones" },
  { titulo: "Perfiles académicos", icono: "🎓", descripcion: "Consulta de estudiante, carrera y estado del legajo.", ruta: "perfiles-academicos" },
  { titulo: "Tutorías", icono: "📚", descripcion: "Seguimiento académico de estudiantes.", ruta: "tutorias" },
  { titulo: "Trabajo final y tesis", icono: "📝", descripcion: "Consulta de tesis y trabajos finales.", ruta: "trabajos-finales" },
  { titulo: "Seminarios y notas", icono: "📖", descripcion: "Cursadas, asistencia, calificaciones y acreditación.", ruta: "seminarios" },
  { titulo: "Alertas académicas", icono: "🔔", descripcion: "Legajos pendientes de seguimiento por cohorte.", ruta: "alertas" },
  { titulo: "Estadísticas", icono: "📊", descripcion: "Indicadores reales de inscripciones y solicitudes de beca.", ruta: "estadisticas" },
];

export default function PanelConduccionPage() {
  const datos = useLegajosConduccion();
  const indicadores = [
    { titulo: "Cohortes registradas", valor: datos.cohortes.length, color: "azul" },
    { titulo: "Inscripciones abiertas", valor: datos.cohortes.filter(c => c.abierta).length, color: "verde" },
    { titulo: "Carreras activas", valor: datos.carreras.filter(c => c.activo).length, color: "celeste" },
  ];
  const estados = contarPorEstado(datos.legajos);
  const listo = !!datos.cohorteId && !datos.cargandoLegajos && !datos.error;
  const seguimiento = datos.legajos.filter(l => ["PENDIENTE", "OBSERVADO", "EN_REVISION", "EN_RIESGO"].includes(l.estado));
  const metricas = [
    { titulo: "Pendientes de revisión", valor: estados.PENDIENTE ?? 0, color: "amarilla" },
    { titulo: "En revisión / observadas", valor: (estados.EN_REVISION ?? 0) + (estados.OBSERVADO ?? 0), color: "roja" },
    { titulo: "Aprobadas / matriculadas", valor: (estados.COMPLETADO ?? 0) + (estados.ACTIVO ?? 0) + (estados.EN_RIESGO ?? 0), color: "verde" },
  ];
  return <section className="perfil-pagina">
    <header className="perfil-pagina-encabezado"><h1>Panel del Equipo de Conducción</h1><p>Gestión de admisiones y seguimiento académico.</p></header>
    {datos.error && <MensajeSistema tipo="error" texto={datos.error} />}
    <div className="perfil-resumen" aria-busy={datos.cargando}>
      {indicadores.map(i => <article key={i.titulo} className={`perfil-tarjeta-resumen perfil-tarjeta-${i.color}`}><h2>{i.titulo}</h2><div className="perfil-tarjeta-contenido"><strong>{datos.cargando || datos.error ? "—" : i.valor}</strong><Link className="perfil-enlace" to="/dashboard/conduccion/periodos-inscripcion">Ver períodos →</Link></div></article>)}
    </div>
    <div className="perfil-dashboard-filtro perfil-panel"><header><h2>Resumen de admisiones por cohorte</h2></header><div className="perfil-panel-interior"><SelectorCohorteConduccion datos={datos}/></div></div>
    <div className="perfil-resumen" aria-busy={datos.cargandoLegajos}>
      {metricas.map(i => <article key={i.titulo} className={`perfil-tarjeta-resumen perfil-tarjeta-${i.color}`}><h2>{i.titulo}</h2><div className="perfil-tarjeta-contenido"><strong>{listo ? i.valor : "—"}</strong><Link className="perfil-enlace" to="/dashboard/conduccion/aspirantes">Ver legajos →</Link></div></article>)}
    </div>
    <div className="perfil-paneles perfil-dashboard-seguimiento">
      <article className="perfil-panel"><header><h2>Legajos que requieren seguimiento</h2></header>
        {!listo ? <p className="perfil-panel-interior">Seleccioná una cohorte para consultar sus legajos.</p> : seguimiento.length === 0 ? <p className="perfil-panel-interior">No hay legajos pendientes de seguimiento en esta cohorte.</p> : <ul className="perfil-lista">{seguimiento.slice(0,5).map(l => <li key={l.id}><span><strong>{`${l.apellido}, ${l.nombre}`}</strong><br/>{formatearEstado(l.estado)}</span><Link className="perfil-enlace" to={`/dashboard/conduccion/legajos/${encodeURIComponent(l.id)}`}>Consultar</Link></li>)}</ul>}
        <div className="perfil-panel-interior"><Link className="perfil-enlace" to="/dashboard/conduccion/alertas">Ver seguimiento académico →</Link></div>
      </article>
      <article className="perfil-panel"><header><h2>Últimas notificaciones</h2></header><div className="perfil-panel-interior"><ListaAlertas resumen/><Link className="perfil-enlace" to="/dashboard/alertas">Ver todas las notificaciones →</Link></div></article>
    </div>
    <section className="perfil-panel perfil-dashboard-accesos"><header><h2>Accesos de gestión</h2></header><ul className="perfil-lista">
      {modulos.map(m => <li key={m.ruta}><span><strong>{m.icono} {m.titulo}</strong><br/>{m.descripcion}</span><Link className="perfil-enlace" to={`/dashboard/conduccion/${m.ruta}`}>Ingresar al módulo</Link></li>)}
    </ul></section>
  </section>;
}
