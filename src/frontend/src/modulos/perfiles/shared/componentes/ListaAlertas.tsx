import { Link } from "react-router-dom";
import { useAlertas } from "../hooks/useAlertas";
export default function ListaAlertas({ resumen = false, soloNuevas = false }: { resumen?: boolean; soloNuevas?: boolean }) {
  const bandeja = useAlertas();
  if (!bandeja) return null;
  const { datos, error, ocupado, refrescar, leer } = bandeja;
  const alertas = (datos?.alertas ?? []).filter(a => !soloNuevas || !a.leida);
  return <div className="alertas-lista">
    {error && <div role="alert">{error} <button type="button" onClick={() => void refrescar()}>Reintentar</button></div>}
    {!datos && !error && <p role="status">Cargando notificaciones…</p>}
    {datos && !error && !alertas.length && <p>No tenés notificaciones {soloNuevas ? "sin leer" : "para mostrar"}.</p>}
    {alertas.slice(0, resumen ? 5 : 100).map(a => <article key={a.id} className={`alerta-item${a.leida ? "" : " alerta-nueva"}`}>
      <strong>{a.titulo}</strong><p>{a.mensaje}</p>
      <small>{new Date(a.fecha).toLocaleString("es-AR")} · {a.leida ? "Leída" : "Sin leer"}</small>
      <div className="alerta-acciones"><Link to={a.ruta}>Consultar</Link>{!a.leida && <button disabled={ocupado} type="button" onClick={() => void leer(a.id)}>Marcar como leída</button>}</div>
    </article>)}
  </div>;
}
