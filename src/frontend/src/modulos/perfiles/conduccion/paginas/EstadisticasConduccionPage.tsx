import GraficoIndicadores from "../../shared/componentes/GraficoIndicadores";
import { CabeceraConduccion, SelectorCohorteConduccion, useLegajosConduccion } from "../componentes/SeleccionLegajosConduccion";
import { Link } from "react-router-dom";
import { contarPorEstado, formatearEstado, construirCSV, descargarCSV } from "../datos/conduccionDatos";

export default function EstadisticasConduccionPage() {
  const datos = useLegajosConduccion();
  const cantidades = contarPorEstado(datos.legajos);
  const estados = Object.entries(cantidades).sort((a, b) => b[1] - a[1]);
  const resumenDisponible = !datos.cargando && !datos.error;
  const becas = datos.legajos.filter((item) => item.solicitud_beca != null).length;
  return <section className="cc-pagina">
    <CabeceraConduccion titulo="Estadísticas de Conducción" descripcion="Indicadores de inscripción con información real por cohorte." />
    <div className="cc-resumen" aria-busy={datos.cargando}>
      <div className="cc-metrica"><strong>{resumenDisponible ? datos.cohortes.length : "—"}</strong><span>Cohortes registradas</span></div>
      <div className="cc-metrica"><strong>{resumenDisponible ? datos.cohortes.filter((cohorte) => cohorte.abierta).length : "—"}</strong><span>Cohortes abiertas</span></div>
      <div className="cc-metrica"><strong>{resumenDisponible ? datos.carreras.filter((carrera) => carrera.activo).length : "—"}</strong><span>Carreras activas</span></div>
    </div>
    <div className="cc-tarjeta"><h2>Indicadores por cohorte</h2><SelectorCohorteConduccion datos={datos} /></div>
    {datos.cohorteId && !datos.cargandoLegajos && !datos.error && <>
      <div className="cc-resumen"><div className="cc-metrica"><strong>{datos.legajos.length}</strong><span>Inscripciones</span></div>
        <div className="cc-metrica"><strong>{becas}</strong><span>Solicitudes de beca</span></div>
        <div className="cc-metrica"><strong>{datos.legajos.length - becas}</strong><span>Sin solicitud de beca</span></div></div>
      <section className="cc-resumen" aria-label="Resumen de revisión de inscripciones">
        <article className="cc-metrica"><strong>{cantidades.PENDIENTE ?? 0}</strong><span>Pendientes de revisión</span></article>
        <article className="cc-metrica"><strong>{(cantidades.EN_REVISION ?? 0) + (cantidades.OBSERVADO ?? 0)}</strong><span>En revisión / observadas</span></article>
        <article className="cc-metrica"><strong>{(cantidades.COMPLETADO ?? 0) + (cantidades.ACTIVO ?? 0) + (cantidades.EN_RIESGO ?? 0)}</strong><span>Aprobadas / matriculadas</span></article>
      </section>
      <div className="indicadores-dashboard">
        <GraficoIndicadores titulo="Estados de las inscripciones" mostrarPorcentajes filas={estados.map(([estado,cantidad]) => [formatearEstado(estado),cantidad] as const)} />
        <GraficoIndicadores titulo="Solicitudes de beca" filas={[["Con solicitud",becas],["Sin solicitud",datos.legajos.length-becas]]} distribucion />
      </div>
      <button type="button" className="cc-btn" disabled={!estados.length} onClick={()=>descargarCSV("admisiones.csv", construirCSV(["Estado", "Cantidad"], estados.map(([estado,cantidad])=>[formatearEstado(estado),cantidad])))}>Descargar indicadores CSV</button>
    </>}
    <div className="cc-tarjeta"><h2>Reportes académicos</h2><p>Consultá calificaciones y asistencia con filtros por carrera, cohorte, seminario, docente y estudiante.</p><Link to="/dashboard/conduccion/seminarios">Ver seminarios y calificaciones</Link></div>
  </section>;
}
