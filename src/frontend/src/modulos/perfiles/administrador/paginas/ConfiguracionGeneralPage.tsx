import { Link } from "react-router-dom";
import "../estilos/Administrador.css";

export default function ConfiguracionGeneralPage() {
  return <section className="admin-dashboard">
    <header className="admin-dashboard-encabezado">
      <h1>Configuración general</h1>
      <p>Administrá las opciones disponibles del sistema.</p>
    </header>
    <div className="admin-paneles">
      <article className="admin-panel">
        <header><h2>Inscripciones</h2><p>La apertura y cierre se administra por cohorte, no mediante un cierre global del sistema.</p></header>
        <div className="admin-configuracion-acceso"><Link to="/dashboard/administrador/cohortes">Gestionar cohortes e inscripciones</Link></div>
      </article>
      <article className="admin-panel">
        <header><h2>Contenido público</h2><p>Modificá la información institucional, el calendario y los contenidos publicados.</p></header>
        <div className="admin-configuracion-acceso"><Link to="/dashboard/administrador/home">Administrar contenido público</Link></div>
      </article>
    </div>
  </section>;
}
