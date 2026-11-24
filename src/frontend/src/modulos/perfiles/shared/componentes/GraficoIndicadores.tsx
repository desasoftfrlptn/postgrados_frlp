// Gráfico de indicadores agregados, reutilizado en los reportes de los perfiles.
import "../estilos/GraficoIndicadores.css";

type Indicador = readonly [string, number | undefined];
const colores = ["#375a9e", "#16877b", "#a76519", "#8055a7", "#b64f56", "#397d9e"];
export default function GraficoIndicadores({ titulo, filas, distribucion = false, mostrarPorcentajes = distribucion }: { titulo: string; filas: readonly Indicador[]; distribucion?: boolean; mostrarPorcentajes?: boolean }) {
  const disponibles = filas.filter((fila): fila is readonly [string, number] => typeof fila[1] === "number");
  const total = disponibles.reduce((suma, [, valor]) => suma + valor, 0);
  const porcentajesDisponibles = mostrarPorcentajes && disponibles.length === filas.length;
  const maximo = Math.max(1, ...disponibles.map(([, valor]) => valor));
  const segmentos = disponibles.map(([, valor], i) => {
    const anteriores = disponibles.slice(0, i).reduce((suma, [, cantidad]) => suma + cantidad, 0);
    const inicio = total ? anteriores / total * 100 : 0;
    const fin = total ? (anteriores + valor) / total * 100 : 0;
    return `${colores[i % colores.length]} ${inicio}% ${fin}%`;
  });
  return <section className={`indicadores-grafico${distribucion ? " indicadores-grafico-distribucion" : ""}`}>
    <h2>{titulo}</h2>
    {disponibles.length === 0 ? <p>No hay datos disponibles.</p> : <>
      <div className="indicadores-contenido">
      {distribucion && total > 0 && disponibles.length === filas.length && <div className="indicadores-anillo" aria-hidden="true" style={{background: `conic-gradient(${segmentos.join(",")})`}}><span>{total}<small>Total</small></span></div>}
      <ul className="indicadores-barras">
        {filas.map(([nombre, valor], i) => <li key={nombre}>
          <span>{nombre}</span>
          <strong>
            {valor ?? "—"}
            {porcentajesDisponibles && valor !== undefined && total > 0 && (
              <> · <span>{new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(valor / total * 100)} %</span></>
            )}
          </strong>
          <span className="indicadores-pista" aria-hidden="true"><span style={{width: `${(valor ?? 0) / (distribucion ? Math.max(1, total) : maximo) * 100}%`, backgroundColor: colores[i % colores.length]}} /></span>
        </li>)}
      </ul>
      </div>
    </>}
  </section>;
}
