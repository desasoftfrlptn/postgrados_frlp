import { mostrarEstadoLegajo } from "../../../../shared/utils/estadosLegajo";
import { useState } from "react";
import { Link } from "react-router-dom";
import { CabeceraConduccion, SelectorCohorteConduccion, useLegajosConduccion } from "./SeleccionLegajosConduccion";

interface CampoPendiente { nombre: string; descripcion: string; }
interface Props {
  titulo: string;
  descripcion: string;
  campos: CampoPendiente[];
  aviso?: string;
}

/** Pantalla de consulta basada en datos disponibles; no simula escrituras sin persistencia. */
export default function ConsultaAcademicaConduccion({ titulo, descripcion, campos, aviso }: Props) {
  const datos = useLegajosConduccion();
  const [id, setId] = useState("");
  const legajo = datos.legajos.find((item) => item.id === id);
  return <section className="cc-pagina">
    <CabeceraConduccion titulo={titulo} descripcion={descripcion} />
    <div className="cc-tarjeta"><h2>Seleccionar estudiante</h2><SelectorCohorteConduccion datos={datos} />
      <div className="cc-campo"><label htmlFor="consulta-estudiante">Aspirante o estudiante</label>
        <select id="consulta-estudiante" value={id} onChange={(e) => setId(e.target.value)}>
          <option value="">Seleccioná una persona</option>
          {datos.legajos.map((item) => <option value={item.id} key={item.id}>{item.apellido}, {item.nombre} · {item.dni_pasaporte}</option>)}
        </select></div>
    </div>
    {legajo && <div className="cc-tarjeta">
      <h2>{legajo.apellido}, {legajo.nombre}</h2>
      <div className="cc-grilla">
        <div className="cc-panel-dato"><small>Carrera</small><strong>{legajo.carrera_elegida}</strong></div>
        <div className="cc-panel-dato"><small>Estado del legajo</small><strong>{mostrarEstadoLegajo(legajo.estado)}</strong></div>
      </div>
      <div className="cc-acciones" style={{marginTop: 16}}>
        <Link className="cc-btn cc-btn-secundario" to={`/dashboard/conduccion/legajos/${encodeURIComponent(legajo.id)}`}>Consultar legajo</Link>
      </div>
    </div>}
    <div className="cc-tarjeta"><h2>Información académica requerida</h2>
      <div className="cc-grilla">{campos.map((campo) => <div className="cc-panel-dato" key={campo.nombre}>
        <h3>{campo.nombre}</h3><p>{campo.descripcion}</p><small>Sin datos disponibles desde el Backend</small>
      </div>)}</div>
    </div>
    <div className="cc-aviso">{aviso}</div>
  </section>;
}

