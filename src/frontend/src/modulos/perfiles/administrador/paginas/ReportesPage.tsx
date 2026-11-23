import { useResumenAdmin } from "../hooks/useResumenAdmin";
import MensajeSistema from "../../../../shared/componentes/MensajeSistema/MensajeSistema";
import { useState } from "react";
import "../estilos/Administrador.css";

const estados = [
  ["PENDIENTE", "Pendientes"], ["EN_REVISION", "En revisión"],
  ["OBSERVADO", "Observadas"], ["COMPLETADO", "Aprobadas"],
  ["RECHAZADO", "Rechazadas"], ["ACTIVO", "Matriculadas"],
  ["EN_RIESGO", "En riesgo"], ["VENCIDO", "Vencidas"],
  ["BAJA", "De baja"], ["GRADUADO", "Graduadas"], ["BORRADOR", "Borradores"],
];
export default function ReportesPage() {
  const { datos, cargando, error, reintentar } = useResumenAdmin();
  const [tipo, setTipo] = useState("general");
  const generales = [
    ["Usuarios activos", datos.usuarios?.filter(u => u.activo).length],
    ["Usuarios inactivos", datos.usuarios?.filter(u => !u.activo).length],
    ["Estudiantes activos", datos.usuarios?.filter(u => u.activo && u.tipo_usuario === "ALUMNO").length],
    ["Docentes activos", datos.usuarios?.filter(u => u.activo && u.tipo_usuario === "DOCENTE").length],
    ["Carreras activas", datos.carreras?.filter(c => c.activo).length],
    ["Carreras inactivas", datos.carreras?.filter(c => !c.activo).length],
    ["Seminarios activos", datos.seminarios?.filter(s => s.activo).length],
    ["Seminarios inactivos", datos.seminarios?.filter(s => !s.activo).length],
    ["Cohortes abiertas", datos.cohortes?.filter(c => c.abierta).length],
    ["Cohortes cerradas", datos.cohortes?.filter(c => !c.abierta).length],
  ] as const;
  const admisiones = estados.map(([estado, nombre]) => [nombre, datos.admisiones === null ? undefined : datos.admisiones[estado] ?? 0] as const);
  const otros = datos.admisiones === null ? undefined : Object.entries(datos.admisiones).filter(([estado]) => !estados.some(([codigo]) => codigo === estado)).reduce((total, [,cantidad]) => total + cantidad, 0);
  const filas = tipo === "general" ? generales : [...admisiones, ["Otros estados", otros] as const];
  const disponible = !cargando && filas.every(([, cantidad]) => cantidad !== undefined);

  // Exporta solamente indicadores agregados, sin datos personales.
  function descargar() {
    if (!disponible) return;
    const csv = "\ufeffIndicador;Cantidad\r\n" + filas.map(([nombre, cantidad]) => `${nombre};${cantidad}`).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `reporte-${tipo}.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <section className="admin-dashboard">
    <header className="admin-dashboard-encabezado">
      <h1>Estadísticas y reportes</h1>
      <p>Consultá indicadores generales y de admisión del sistema.</p>
    </header>
    {error && <><MensajeSistema tipo="error" texto="Algunos indicadores no están disponibles." /><button type="button" onClick={reintentar}>Reintentar</button></>}
    {cargando && <p role="status">Cargando indicadores...</p>}
    <div className="admin-panel admin-reporte">
      <label htmlFor="tipo-reporte">Tipo de reporte</label>
      <select id="tipo-reporte" value={tipo} onChange={e => setTipo(e.target.value)}>
        <option value="general">Indicadores generales</option>
        <option value="admision">Estado de admisiones</option>
      </select>
      <table className="admin-reporte-tabla">
        <caption>Vista previa del reporte seleccionado</caption>
        <thead><tr><th scope="col">Indicador</th><th scope="col">Cantidad</th></tr></thead>
        <tbody>{filas.map(([nombre, cantidad]) => <tr key={nombre}><th scope="row">{nombre}</th><td>{cargando ? "..." : cantidad ?? "No disponible"}</td></tr>)}</tbody>
      </table>
      <button type="button" disabled={!disponible} onClick={descargar}>Descargar CSV</button>
      <p>Archivo CSV compatible con Excel.</p>
    </div>
  </section>;
}
