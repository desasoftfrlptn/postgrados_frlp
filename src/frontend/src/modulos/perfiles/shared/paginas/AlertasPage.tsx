import { useState } from "react";
import { useAlertas } from "../hooks/useAlertas";
import ListaAlertas from "../componentes/ListaAlertas";
import "../estilos/Alertas.css";
export default function AlertasPage() {
  const [soloNuevas, setSoloNuevas] = useState(false);
  const bandeja = useAlertas();
  return <section className="perfil-pagina alertas-pagina">
    <header className="perfil-pagina-encabezado"><h1>Alertas y notificaciones</h1><p>Consultá las novedades de tu perfil.</p></header>
    <div className="perfil-panel alertas-panel"><div className="alertas-toolbar">
      <strong>{bandeja?.datos ? `${bandeja.datos.sin_leer} sin leer` : "Notificaciones"}</strong>
      <label><input type="checkbox" checked={soloNuevas} onChange={e => setSoloNuevas(e.target.checked)} /> Solo sin leer</label>
      <button type="button" onClick={() => void bandeja?.refrescar()}>Actualizar</button>
      <button type="button" disabled={!bandeja?.datos?.sin_leer || bandeja.ocupado} onClick={() => void bandeja?.leer()}>Marcar todas como leídas</button>
    </div><ListaAlertas soloNuevas={soloNuevas} /><p className="alertas-nota">Se muestran hasta las 100 notificaciones más recientes.</p></div>
  </section>;
}
