import { CabeceraConduccion, SelectorCohorteConduccion, TablaLegajos, useLegajosConduccion } from "../componentes/SeleccionLegajosConduccion";

const estadosPendientes = new Set(["PENDIENTE", "EN_REVISION", "OBSERVADO", "OBSERVADA"]);

export default function AlertasConduccionPage() {
  const datos = useLegajosConduccion();
  const pendientes = datos.legajos.filter((legajo) => estadosPendientes.has(legajo.estado));
  return <section className="cc-pagina">
    <CabeceraConduccion titulo="Alertas académicas" descripcion="Identificá los legajos que requieren seguimiento." />
    <div className="cc-tarjeta"><SelectorCohorteConduccion datos={datos} /></div>
    {datos.cohorteId && <>
      <div className="cc-resumen"><div className="cc-metrica"><strong>{pendientes.length}</strong><span>Inscripciones pendientes de seguimiento</span></div>
        <div className="cc-metrica"><strong>{datos.legajos.length - pendientes.length}</strong><span>Otros estados de inscripción</span></div></div>
      <div className="cc-tarjeta"><h2>Legajos que requieren atención</h2><TablaLegajos legajos={pendientes} /></div>
    </>}
    <div className="cc-aviso"></div>
  </section>;
}

