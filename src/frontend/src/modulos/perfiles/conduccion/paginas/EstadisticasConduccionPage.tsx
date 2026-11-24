import "../estilos/ConduccionModulos.css";
import { useMemo, useState } from "react"
import "../../shared/estilos/PerfilesCompartidos.css"
import "../../administrador/estilos/Administrador.css"
import GraficoIndicadores from "../../shared/componentes/GraficoIndicadores"
import { SelectorCohorteConduccion, useLegajosConduccion } from "../componentes/SeleccionLegajosConduccion"
import { contarPorEstado, formatearEstado, construirCSV, descargarCSV } from "../datos/conduccionDatos"

type FilaGrafico = readonly [string, number]
type OpcionGrafico = "estados" | "becas" | "seguimiento" | "resultado"

const ESTADOS_SEGUIMIENTO = ["PENDIENTE", "EN_REVISION", "OBSERVADO", "EN_RIESGO"]
const ESTADOS_APROBADOS = ["COMPLETADO", "ACTIVO"]
const ESTADOS_CIERRE = ["RECHAZADO", "BAJA"]

function total(filas: readonly FilaGrafico[]) {
  return filas.reduce((acumulado, [, cantidad]) => acumulado + cantidad, 0)
}

function valorEstado(cantidades: Record<string, number>, estados: string[]) {
  return estados.reduce((acumulado, estado) => acumulado + (cantidades[estado] ?? 0), 0)
}

export default function EstadisticasConduccionPage() {
  const datos = useLegajosConduccion()
  const [grafico, setGrafico] = useState<OpcionGrafico>("estados")

  const resumenDisponible = !datos.cargando && !datos.error
  const legajos = datos.legajos
  const cantidades = contarPorEstado(legajos)
  const becas = legajos.filter((item) => item.solicitud_beca != null).length
  const sinBeca = Math.max(0, legajos.length - becas)
  const seguimiento = valorEstado(cantidades, ESTADOS_SEGUIMIENTO)
  const aprobadas = valorEstado(cantidades, ESTADOS_APROBADOS)
  const cerradas = valorEstado(cantidades, ESTADOS_CIERRE)

  const filasEstados = useMemo<readonly FilaGrafico[]>(
    () => Object.entries(cantidades)
      .sort((a, b) => b[1] - a[1])
      .map(([estado, cantidad]) => [formatearEstado(estado), cantidad] as const),
    [cantidades],
  )

  const filasBecas = useMemo<readonly FilaGrafico[]>(
    () => [["Con solicitud", becas], ["Sin solicitud", sinBeca]] as const,
    [becas, sinBeca],
  )

  const filasSeguimiento = useMemo<readonly FilaGrafico[]>(
    () => [
      ["Pendientes", cantidades.PENDIENTE ?? 0],
      ["En revisión", cantidades.EN_REVISION ?? 0],
      ["Observadas", cantidades.OBSERVADO ?? 0],
      ["En riesgo", cantidades.EN_RIESGO ?? 0],
    ] as const,
    [cantidades],
  )

  const filasResultado = useMemo<readonly FilaGrafico[]>(
    () => [
      ["Aprobadas / matriculadas", aprobadas],
      ["En seguimiento", seguimiento],
      ["Cerradas", cerradas],
    ] as const,
    [aprobadas, seguimiento, cerradas],
  )

  const opcionesGraficos: Record<OpcionGrafico, { titulo: string; filas: readonly FilaGrafico[]; distribucion?: boolean }> = {
    estados: { titulo: "Estados de las inscripciones", filas: filasEstados },
    becas: { titulo: "Solicitudes de beca", filas: filasBecas, distribucion: true },
    seguimiento: { titulo: "Seguimiento de legajos", filas: filasSeguimiento },
    resultado: { titulo: "Resultado general", filas: filasResultado, distribucion: true },
  }

  const graficoPrincipal = opcionesGraficos[grafico]
  const adicionales = (["estados", "becas", "seguimiento", "resultado"] as const)
    .filter((clave) => clave !== grafico)
    .map((clave) => opcionesGraficos[clave])
    .filter((item) => total(item.filas) > 0)

  const metricasSuperiores = [
    { etiqueta: "Cohortes registradas", valor: resumenDisponible ? datos.cohortes.length : "—" },
    { etiqueta: "Cohortes abiertas", valor: resumenDisponible ? datos.cohortes.filter((cohorte) => cohorte.abierta).length : "—" },
    { etiqueta: "Carreras activas", valor: resumenDisponible ? datos.carreras.filter((carrera) => carrera.activo).length : "—" },
    { etiqueta: "Legajos de la cohorte", valor: datos.cohorteId && !datos.cargandoLegajos && !datos.error ? legajos.length : "—" },
  ]

  function descargar() {
    if (!datos.cohorteId || datos.cargandoLegajos || datos.error || !filasEstados.length) return
    descargarCSV(
      `estadisticas_conduccion_${datos.cohorte?.anio ?? "cohorte"}.csv`,
      construirCSV(["Grupo", "Indicador", "Cantidad"], [
        ...filasEstados.map(([nombre, cantidad]) => ["Estados de inscripción", nombre, cantidad]),
        ...filasBecas.map(([nombre, cantidad]) => ["Solicitudes de beca", nombre, cantidad]),
        ...filasSeguimiento.map(([nombre, cantidad]) => ["Seguimiento", nombre, cantidad]),
        ...filasResultado.map(([nombre, cantidad]) => ["Resultado general", nombre, cantidad]),
      ]),
    )
  }

  return <section className="admin-dashboard">
    <header className="admin-dashboard-encabezado admin-reportes-cabecera">
      <div>
        <h1>Estadísticas de Conducción</h1>
        <p>Indicadores de inscripción con información real y una visualización más clara por cohorte.</p>
      </div>
      <button
        type="button"
        className="conduccion-descargar-csv"
        disabled={!datos.cohorteId || datos.cargandoLegajos || !!datos.error || !filasEstados.length}
        onClick={descargar}
      >
        Descargar CSV
      </button>
    </header>

    <section className="admin-reporte-metricas" aria-label="Indicadores generales" aria-busy={datos.cargando}>
      {metricasSuperiores.map((metrica) => <div key={metrica.etiqueta}><span>{metrica.etiqueta}</span><strong>{metrica.valor}</strong></div>)}
    </section>

    <div className="admin-panel admin-reportes-filtros">
      <h2>Filtros de consulta</h2>
      <div className="admin-filtros-academicos">
        <div className="admin-filtro-campo" style={{ gridColumn: "1 / -1" }}>
          <SelectorCohorteConduccion datos={datos} />
        </div>
      </div>
      <p className="text-sm text-gray-600">
        Seleccioná una cohorte para cargar el resumen de inscripciones, seguimiento y solicitudes de beca.
        Los gráficos y métricas se actualizan con la cohorte elegida.
      </p>
    </div>

    {!datos.cohorteId && <section className="admin-reporte-analisis"><div className="admin-seccion-encabezado"><h2>Seleccioná una cohorte</h2><p>Elegí una cohorte para visualizar las estadísticas y descargar el reporte correspondiente.</p></div></section>}

    {datos.cohorteId && datos.cargandoLegajos && <p role="status">Cargando estadísticas de la cohorte…</p>}
    {datos.cohorteId && datos.error && <p role="alert">{datos.error}</p>}

    {datos.cohorteId && !datos.cargandoLegajos && !datos.error && <>
      <section className="admin-reporte-metricas" aria-label="Indicadores principales de la cohorte">
        <div><span>Inscripciones</span><strong>{legajos.length}</strong></div>
        <div><span>Solicitudes de beca</span><strong>{becas}</strong></div>
        <div><span>Legajos en seguimiento</span><strong>{seguimiento}</strong></div>
        <div><span>Aprobadas / matriculadas</span><strong>{aprobadas}</strong></div>
      </section>

      <section className="admin-reporte-analisis" aria-label="Análisis visual por cohorte">
        <div className="admin-reporte-control">
          <h2>{datos.cohorte?.nombre ? `Análisis de ${datos.cohorte.nombre}` : "Análisis de la cohorte"}</h2>
          <label htmlFor="grafico-conduccion">Indicador</label>
          <select id="grafico-conduccion" value={grafico} onChange={(event) => setGrafico(event.target.value as OpcionGrafico)}>
            <option value="estados">Estados de las inscripciones</option>
            <option value="becas">Solicitudes de beca</option>
            <option value="seguimiento">Seguimiento de legajos</option>
            <option value="resultado">Resultado general</option>
          </select>
        </div>
        <GraficoIndicadores
          titulo={graficoPrincipal.titulo}
          filas={graficoPrincipal.filas}
          distribucion={graficoPrincipal.distribucion}
          mostrarPorcentajes
        />
      </section>

      <div className="admin-reportes-graficos">
        {adicionales.map((item) => <GraficoIndicadores
          key={item.titulo}
          titulo={item.titulo}
          filas={item.filas}
          distribucion={item.distribucion}
          mostrarPorcentajes
        />)}
      </div>


    </>}
  </section>
}
