import { CabeceraConduccion, SelectorCohorteConduccion, useLegajosConduccion } from "../componentes/SeleccionLegajosConduccion";
import { Link } from "react-router-dom";
import { contarPorEstado, formatearEstado, construirCSV, descargarCSV } from "../datos/conduccionDatos";

export default function EstadisticasConduccionPage() {
  const datos = useLegajosConduccion();
  const estados = Object.entries(contarPorEstado(datos.legajos)).sort((a, b) => b[1] - a[1]);
  const becas = datos.legajos.filter((item) => item.solicitud_beca != null).length;
  return <section className="cc-pagina">
    <CabeceraConduccion titulo="Estadísticas de Conducción" descripcion="Indicadores de inscripción con información real por cohorte." />
    <div className="cc-resumen">
      <div className="cc-metrica"><strong>{datos.cohortes.length}</strong><span>Cohortes registradas</span></div>
      <div className="cc-metrica"><strong>{datos.cohortes.filter((cohorte) => cohorte.abierta).length}</strong><span>Cohortes abiertas</span></div>
      <div className="cc-metrica"><strong>{datos.carreras.filter((carrera) => carrera.activo).length}</strong><span>Carreras activas</span></div>
    </div>
    <div className="cc-tarjeta"><h2>Indicadores por cohorte</h2><SelectorCohorteConduccion datos={datos} /></div>
    {datos.cohorteId && !datos.cargandoLegajos && !datos.error && <>
      <div className="cc-resumen"><div className="cc-metrica"><strong>{datos.legajos.length}</strong><span>Inscripciones</span></div>
        <div className="cc-metrica"><strong>{becas}</strong><span>Solicitudes de beca</span></div>
        <div className="cc-metrica"><strong>{datos.legajos.length - becas}</strong><span>Sin solicitud de beca</span></div></div>
      <div className="cc-tarjeta"><h2>Estados de las inscripciones</h2>
        <button type="button" className="cc-btn" disabled={!estados.length} onClick={()=>descargarCSV("admisiones.csv", construirCSV(["Estado", "Cantidad"], estados.map(([estado,cantidad])=>[formatearEstado(estado),cantidad])))}>Descargar indicadores CSV</button>
        {estados.length === 0 ? <p className="cc-vacio">No hay registros para esta cohorte.</p> :
          <div className="cc-tabla-scroll"><table className="cc-tabla"><thead><tr><th>Estado</th><th>Legajos</th><th>Porcentaje</th></tr></thead><tbody>
            {estados.map(([estado, cantidad]) => <tr key={estado}><td>{formatearEstado(estado)}</td><td>{cantidad}</td><td>{Math.round((cantidad / datos.legajos.length) * 100)} %</td></tr>)}
          </tbody></table></div>}
      </div>
    </>}
    <div className="cc-tarjeta"><h2>Reportes académicos</h2><p>Consultá calificaciones y asistencia con filtros por carrera, cohorte, seminario, docente y estudiante.</p><Link to="/dashboard/conduccion/seminarios">Ver seminarios y calificaciones</Link></div>
  </section>;
}

