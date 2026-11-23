import { useState } from "react";
import { Link } from "react-router-dom";
import { CabeceraConduccion, SelectorCohorteConduccion, useLegajosConduccion } from "../componentes/SeleccionLegajosConduccion";
import { formatearEstado } from "../datos/conduccionDatos";

export default function PerfilesAcademicosConduccionPage() {
  const datos = useLegajosConduccion();
  const [legajoId, setLegajoId] = useState("");
  const legajo = datos.legajos.find((item) => item.id === legajoId);
  return <section className="cc-pagina">
    <CabeceraConduccion titulo="Perfiles académicos" descripcion="Consulta individual de estudiantes y situación de sus legajos." />
    <div className="cc-tarjeta"><h2>Buscar perfil</h2><SelectorCohorteConduccion datos={datos} />
      <div className="cc-campo"><label htmlFor="perfil-legajo">Estudiante o aspirante</label>
        <select id="perfil-legajo" value={legajoId} onChange={(e) => setLegajoId(e.target.value)}>
          <option value="">Seleccioná una persona</option>
          {datos.legajos.map((item) => <option key={item.id} value={item.id}>{item.apellido}, {item.nombre} · {item.dni_pasaporte}</option>)}
        </select>
      </div>
    </div>
    {legajo && <div className="cc-tarjeta"><h2>{legajo.apellido}, {legajo.nombre}</h2>
      <div className="cc-grilla">
        <div className="cc-panel-dato"><small>Carrera</small><strong>{legajo.carrera_elegida}</strong></div>
        <div className="cc-panel-dato"><small>Estado del legajo</small><strong>{formatearEstado(legajo.estado)}</strong></div>
        <div className="cc-panel-dato"><small>Identificación</small><strong>{legajo.dni_pasaporte}</strong></div>
        <div className="cc-panel-dato"><small>Cohorte</small><strong>{datos.cohorte?.nombre ?? "No informada"}</strong></div>
      </div>
      <div className="cc-acciones" style={{marginTop:18}}><Link to={`/dashboard/conduccion/legajos/${encodeURIComponent(legajo.id)}`} className="cc-btn">Ver detalle de inscripción</Link></div>
    </div>}
   </section>;
}

