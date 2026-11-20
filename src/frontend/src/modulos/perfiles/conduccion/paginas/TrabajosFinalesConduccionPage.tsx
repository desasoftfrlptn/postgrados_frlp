import ConsultaAcademicaConduccion from "../componentes/ConsultaAcademicaConduccion";

export default function TrabajosFinalesConduccionPage() {
  return <ConsultaAcademicaConduccion
    titulo="Trabajo final y tesis"
    descripcion="Seguimiento del TFI de especializaciones y de las tesis de maestría y doctorado."
    campos={[
      { nombre: "Tipo de trabajo", descripcion: "Trabajo Final Integrador o tesis, según el tipo de carrera." },
      { nombre: "Título y dirección", descripcion: "Título, director/a y codirector/a, cuando corresponda." },
      { nombre: "Aprobación CPR y resolución", descripcion: "Fechas y número de resolución, cargados por el rol autorizado." },
      { nombre: "Avances y evaluación", descripcion: "Estado del proyecto, entregas, observaciones y aprobación." },
    ]}
    aviso=""
  />;
}

