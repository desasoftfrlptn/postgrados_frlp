import { Link } from "react-router-dom";
import "../estilos/ConduccionModulos.css";

const modulos = [
  { titulo: "Aspirantes y legajos", icono: "👥", descripcion: "Inscripciones, búsquedas, filtros, documentación y estados.", ruta: "aspirantes" },
  { titulo: "Períodos de inscripción", icono: "📅", descripcion: "Cohortes, alta y apertura o cierre de inscripciones.", ruta: "periodos-inscripcion" },
  { titulo: "Exportaciones", icono: "📤", descripcion: "Descargas CSV por cohorte y aspirante.", ruta: "exportaciones" },
  { titulo: "Perfiles académicos", icono: "🎓", descripcion: "Consulta de estudiante, carrera y estado del legajo.", ruta: "perfiles-academicos" },
  { titulo: "Tutorías", icono: "📚", descripcion: "Consulta de estudiantes y estructura de seguimiento tutorial.", ruta: "tutorias" },
  { titulo: "Trabajo final y tesis", icono: "📝", descripcion: "Seguimiento de TFI y tesis; datos académicos pendientes de integración.", ruta: "trabajos-finales" },
  { titulo: "Seminarios y notas", icono: "📖", descripcion: "Cursadas, asistencia, calificaciones y acreditación.", ruta: "seminarios" },
  { titulo: "Alertas académicas", icono: "🔔", descripcion: "Legajos pendientes de seguimiento por cohorte.", ruta: "alertas" },
  { titulo: "Estadísticas", icono: "📊", descripcion: "Indicadores reales de inscripciones y solicitudes de beca.", ruta: "estadisticas" },
];

export default function PanelConduccionPage() {
  return <section className="cc-pagina">
    <header className="cc-cabecera"><h1>Panel del Equipo de Conducción</h1>
      <p>Accedé a los módulos de gestión de inscripciones y seguimiento académico.</p></header>
    <div className="cc-grilla">
      {modulos.map((modulo) => <article className="cc-tarjeta" key={modulo.ruta}>
        <h2>{modulo.icono} {modulo.titulo}</h2><p>{modulo.descripcion}</p>
        <div className="cc-acciones" style={{marginTop:18}}>
          <Link className="cc-btn cc-btn-secundario" to={`/dashboard/conduccion/${modulo.ruta}`}>Ingresar al módulo</Link>
        </div>
      </article>)}
    </div>
    <p className="cc-aviso">Los módulos de seguimiento académico ya tienen navegación y consultas de inscripción; para registrar tutorías, tesis, asistencia y notas todavía es necesaria la integración de los endpoints académicos correspondientes.</p>
  </section>;
}
