import ConsultaAcademicaConduccion from "../componentes/ConsultaAcademicaConduccion";

export default function SeminariosConduccionPage() {
  return <ConsultaAcademicaConduccion
    titulo="Seminarios y calificaciones"
    descripcion="Trayectoria de cursadas, asistencia, condición académica, actas y notas finales."
    campos={[
      { nombre: "Seminarios cursados", descripcion: "Seminario, cohorte, docente y ciclo lectivo." },
      { nombre: "Asistencia", descripcion: "Porcentaje de asistencia y condición de regularidad del estudiante." },
      { nombre: "Calificación y acta", descripcion: "Nota final, fecha y referencia del acta." },
      { nombre: "Acreditación", descripcion: "Seminarios aprobados, pendientes y plazos de vencimiento." },
    ]}
    aviso="El listado administrativo de seminarios no equivale a la trayectoria individual y puede requerir permisos ADMIN. Hace falta una API de seminarios cursados por estudiante para informar resultados reales a Conducción."
  />;
}

