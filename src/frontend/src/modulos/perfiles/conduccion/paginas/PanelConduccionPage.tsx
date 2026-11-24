import { Link } from "react-router-dom";
import { useLegajosConduccion, SelectorCohorteConduccion } from "../componentes/SeleccionLegajosConduccion";
import { formatearEstado } from "../datos/conduccionDatos";
import ListaAlertas from "../../shared/componentes/ListaAlertas";
import "../../shared/estilos/PerfilesCompartidos.css";

export default function PanelConduccionPage() {
  const datos = useLegajosConduccion();
  const listo = !!datos.cohorteId && !datos.cargandoLegajos && !datos.error;
  const seguimiento = datos.legajos.filter(l => ["PENDIENTE", "OBSERVADO", "EN_REVISION", "EN_RIESGO"].includes(l.estado));
  return <section className="perfil-pagina">
    <header className="perfil-pagina-encabezado"><h1>Panel del Equipo de Conducción</h1><p>Gestión de admisiones y seguimiento académico.</p></header>
    <article className="perfil-panel"><header><h2>Estadísticas</h2></header><div className="perfil-panel-interior"><p>Consultá los indicadores y reportes por cohorte en su sección.</p><Link className="perfil-enlace" to="/dashboard/conduccion/estadisticas">Ver estadísticas</Link></div></article>
    <div className="perfil-dashboard-filtro perfil-panel"><header><h2>Seguimiento por cohorte</h2></header><div className="perfil-panel-interior"><SelectorCohorteConduccion datos={datos}/></div></div>
    <div className="perfil-paneles perfil-dashboard-seguimiento">
      <article className="perfil-panel"><header><h2>Legajos que requieren seguimiento</h2></header>
        {!listo ? <p className="perfil-panel-interior">Seleccioná una cohorte para consultar sus legajos.</p> : seguimiento.length === 0 ? <p className="perfil-panel-interior">No hay legajos pendientes de seguimiento en esta cohorte.</p> : <ul className="perfil-lista">{seguimiento.slice(0,5).map(l => <li key={l.id}><span><strong>{`${l.apellido}, ${l.nombre}`}</strong><br/>{formatearEstado(l.estado)}</span><Link className="perfil-enlace" to={`/dashboard/conduccion/legajos/${encodeURIComponent(l.id)}`}>Consultar</Link></li>)}</ul>}
        <div className="perfil-panel-interior"><Link className="perfil-enlace" to="/dashboard/conduccion/alertas">Ver seguimiento académico →</Link></div>
      </article>
      <article className="perfil-panel"><header><h2>Últimas notificaciones</h2></header><div className="perfil-panel-interior"><ListaAlertas resumen/><Link className="perfil-enlace" to="/dashboard/alertas">Ver todas las notificaciones →</Link></div></article>
    </div>
  </section>;
}
