import ConsultaAcademicaConduccion from "../componentes/ConsultaAcademicaConduccion";

export default function TutoriasConduccionPage() {
  return (
    <ConsultaAcademicaConduccion
      titulo="Tutorías y seguimiento"
      descripcion="Consultá el estudiante y su carrera para registrar posteriormente el seguimiento tutorial."
      campos={[
        {
          nombre: "Tutor asignado",
          descripcion: "Docente responsable de acompañar la trayectoria del estudiante.",
        },
        {
          nombre: "Registro de encuentros",
          descripcion: "Fechas, temas abordados y acuerdos de tutoría.",
        },
        {
          nombre: "Próximo seguimiento",
          descripcion: "Compromisos, responsable y fecha tentativa.",
        },
      ]}
    />
  );
}
