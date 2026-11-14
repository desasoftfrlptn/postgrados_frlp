import { useState } from "react";
import "./paginaFAQ.css";

type ContenidoRespuesta =
  | {
      tipo: "parrafo";
      texto: string;
    }
  | {
      tipo: "subtitulo";
      texto: string;
    }
  | {
      tipo: "lista";
      items: string[];
    };

type Pregunta = {
  pregunta: string;
  respuesta: ContenidoRespuesta[];
};

type Categoria = {
  titulo: string;
  preguntas: Pregunta[];
};

const categorias: Categoria[] = [
  {
    titulo: "Modalidad",
    preguntas: [
      {
        pregunta: "¿Cómo es la modalidad de cursada?",
        respuesta: [
          {
            tipo: "parrafo",
            texto:
              "Toda nuestra propuesta académica se dicta completamente a distancia, a través del Campus Virtual. Podés estudiar cuándo y dónde quieras, construyendo tu propio aprendizaje.",
          },
          {
            tipo: "parrafo",
            texto:
              "El Aula virtual está disponible las 24 horas, lo que permite a los estudiantes organizar sus horarios y actividades cotidianas en relación a la cursada, y también elegir el ritmo, horarios y lugar de estudio de acuerdo a las preferencias personales.",
          },
          {
            tipo: "parrafo",
            texto:
              "En el Aula virtual se organizan foros de discusión y espacio de intercambio de experiencias, actividades de variada índole, trabajos prácticos, espacios de intercambio con los compañeros y docentes y clases impartidas por los especialistas, denominadas AVS.",
          },
          {
            tipo: "parrafo",
            texto:
              "El contenido está organizado en Módulos y Unidades, que se desarrollan semana a semana a través del material de estudio, de actividades prácticas optativas e intercambio de experiencias a través del Foro.",
          },
          {
            tipo: "parrafo",
            texto:
              "Dependiendo de la modalidad de la propuesta académica que elijas, la frecuencia de las clases y la obligatoriedad de participar en vivo de los encuentros varía. Verificá con qué modalidad se dicta el curso que elegiste para conocer qué requisitos deberás cumplir para cursar y obtener el certificado de aprobación. Esta información se muestra en la página de cada curso, junto con la fecha de inicio de cursada.",
          },
          {
            tipo: "subtitulo",
            texto:
              "Características particulares de cada modalidad de enseñanza",
          },
          {
            tipo: "subtitulo",
            texto: "Modalidad A distancia",
          },
          {
            tipo: "parrafo",
            texto:
              "Los cursos, carreras y seminarios de posgrado que se brindan bajo esta modalidad disponen de encuentros con los docentes que se llevan a cabo de forma semanal o quincenal y tienen una duración de entre una y dos horas. Los alumnos no están obligados a participar de las clases en vivo, y los encuentros quedan grabados en el Campus Virtual, para que pueda accederse a los mismos en cualquier momento. También se pueden descargar. Las fechas y horarios de las clases son pautados por el docente al inicio de la cursada. Para obtener su certificado de aprobación, los alumnos deben haber aprobado con 7 o más todas las actividades y tareas obligatorias de la cursada.",
          },
          {
            tipo: "subtitulo",
            texto: "Modalidad A distancia ágil",
          },
          {
            tipo: "parrafo",
            texto:
              "Los cursos que se brindan bajo esta modalidad disponen de encuentros con los docentes que se llevan a cabo de forma semanal o quincenal y tienen una duración de entre una y dos horas. Los alumnos no están obligados a participar de las clases en vivo, y los encuentros quedan grabados en el Campus Virtual, para que pueda accederse a los mismos en cualquier momento. También se pueden descargar. Las fechas y horarios de las clases son pautados por el docente al inicio de la cursada. Para obtener su certificado de aprobación, los alumnos deben haber aprobado con 7 o más todas las actividades y tareas obligatorias de la cursada.",
          },
          {
            tipo: "subtitulo",
            texto: "Modalidad Taller",
          },
          {
            tipo: "parrafo",
            texto:
              'Este modelo educativo está centrado en el "aprender-haciendo". El saber práctico se genera a través de instancias de trabajo que se desarrollan en base a la metodología de aprendizaje basado en proyectos, para que los alumnos adquieran las destrezas, competencias y habilidades planteadas en los objetivos del taller. Los talleres cuentan con clases virtuales de consulta con los tutores, de frecuencia semanal o quincenal. Son dinámicas y se centran en la participación activa de los alumnos y enfocadas al proyecto que se esté trabajando. Los alumnos no están obligados a participar de las clases en vivo. Los encuentros quedan grabados en el Campus Virtual, para que pueda accederse a los mismos en cualquier momento. También se pueden descargar. Cuentan con entregas de trabajos prácticos semanales, orientados a la elaboración del proyecto final. Para obtener su certificado de aprobación, los alumnos deben aprobar cada una de las etapas del proyecto, y aprobar con 7 o más el proyecto integrador final.',
          },
          {
            tipo: "subtitulo",
            texto: "Modalidad Vivo",
          },
          {
            tipo: "parrafo",
            texto:
              "Esta modalidad está conformada por clases en vivo con participación activa de los alumnos, acompañadas por material de estudio, foros de participación, trabajos prácticos y exámenes online disponibles en el Campus Virtual. Para mantener la regularidad y acceder al examen final, los estudiantes deben asistir al menos al 75% de las clases en vivo. Para obtener su certificado de aprobación, los alumnos deben acreditar un 75% de asistencia y aprobar la totalidad de las actividades obligatorias. Las fechas y horarios de las clases están indicados en la página web de cada curso.",
          },
          {
            tipo: "subtitulo",
            texto: "Modalidad Seminario",
          },
          {
            tipo: "parrafo",
            texto:
              "Este modelo educativo consta de uno o dos encuentros en vivo, de asistencia obligatoria, que se acompañan por material de estudio, foros de participación y una evaluación final. Para mantener la regularidad y acceder al examen final, los estudiantes deben asistir al 100% de las clases en vivo. Para obtener su certificado de aprobación, los alumnos deben acreditar 100% de asistencia y aprobar el trabajo práctico final obligatorio. Las fechas y horarios de las clases están indicados en la página web de cada curso.",
          },
        ],
      },
    ],
  },

  {
    titulo: "Inscripción",
    preguntas: [
      {
        pregunta: "¿Cómo hago para inscribirme a un curso?",
        respuesta: [
          {
            tipo: "parrafo",
            texto:
              'Para inscribirte deberás hacer click en el botón de "Inscripción" en la página web de tu curso de interés. Allí podrás registrarte y cargar tus datos o iniciar sesión con tu usuario existente.',
          },
          {
            tipo: "parrafo",
            texto:
              'La página te redireccionará a las opciones de pago. En caso de tener un cupón de descuento, ¡este es el momento de utilizarlo! Encontrarás el botón "Tengo un cupón de descuento" para cargar tu código.',
          },
          {
            tipo: "parrafo",
            texto:
              "Luego de confirmar la transacción, el pago puede demorar entre 48 y 72hs en impactar en el sistema. Te enviaremos un correo electrónico para informarte cuando el mismo haya sido acreditado.",
          },
          {
            tipo: "parrafo",
            texto:
              "En caso que el curso seleccionado cuente con un proceso de admisión, deberás enviar la documentación requerida para ser admitido y luego poder efectuar la inscripción.",
          },
        ],
      },
      {
        pregunta:
          "¿Cómo hago para inscribirme a una carrera o posgrado?",
        respuesta: [
          {
            tipo: "parrafo",
            texto:
              "Nuestras carreras y posgrados cuentan con un proceso de admisión en el que te solicitaremos que cargues en el Panel del Alumno la documentación requerida según cada caso.",
          },
          {
            tipo: "parrafo",
            texto:
              "Una vez revisada la documentación, te enviaremos un correo electrónico para informarte cuál es el estado de la misma y que puedas continuar con tu inscripción.",
          },
          {
            tipo: "parrafo",
            texto:
              "Podés conocer cuáles son los formularios y documentos solicitados en los temarios de tu carrera o posgrado de interés.",
          },
        ],
      },
      {
        pregunta: "¿Cuáles son los medios de pago y financiación?",
        respuesta: [
          {
            tipo: "parrafo",
            texto:
              "Podés abonar a través de Mercado Pago con tarjeta de débito, crédito o en efectivo.",
          },
          {
            tipo: "parrafo",
            texto:
              "En caso de abonar con cualquier tarjeta de crédito -independientemente del banco de emisión- podrás financiar el pago en 3 o 6 cuotas sin interés dependiendo del curso. También hay cursos con financiación específica, de tenerla se informa debajo de la presentación.",
          },
        ],
      },
      {
        pregunta:
          "¿Puedo inscribirme si soy extranjero o resido en el exterior?",
        respuesta: [
          {
            tipo: "parrafo",
            texto:
              "¡Sí! Nuestros cursos y modalidad te permiten cursar y participar de las cursadas online estés donde estés. Ponemos a tu disposición la plataforma de pago PayPal, con tarjeta de crédito, para garantizar la seguridad de tu pago.",
          },
          {
            tipo: "parrafo",
            texto:
              "En caso de querer inscribirte a las tecnicaturas o licenciatura, por favor revisá los requisitos de ingreso en el temario de cada carrera para conocer los pasos a seguir.",
          },
        ],
      },
    ],
  },

  {
    titulo: "Cursado",
    preguntas: [
      {
        pregunta: "Me inscribí al curso, ¿y ahora qué hago?",
        respuesta: [
          {
            tipo: "parrafo",
            texto:
              "El día de inicio de cursada -entre las 10 y 16hs- te enviaremos un correo electrónico para avisarte que el material ya está disponible en el Campus Virtual. A partir de ese día podrás visualizar los contenidos de la primera unidad, el programa de estudio y el cronograma de clases.",
          },
        ],
      },
      {
        pregunta: "¿Puedo inscribirme a un curso que ya comenzó?",
        respuesta: [
          {
            tipo: "parrafo",
            texto:
              "La inscripción de nuestros cursos se mantiene abierta hasta 7 días después de la fecha de inicio. Una vez abonado el curso, te solicitamos que envíes el comprobante de pago a administracion@centrodeelearning.com para que te brinden el acceso al aula y puedas comenzar a cursar.",
          },
        ],
      },
      {
        pregunta: "¿Hay cupos limitados para cursar?",
        respuesta: [
          {
            tipo: "parrafo",
            texto:
              "Dependiendo del curso, es posible que las vacantes se completen antes de que comiencen las clases.",
          },
          {
            tipo: "parrafo",
            texto:
              "¡No te preocupes! Nuestros cursos cuentan con múltiples fechas de inicio a lo largo del año para que puedas estudiar y certificarte con el Centro de eLearning UTN BA.",
          },
        ],
      },
    ],
  },

  {
    titulo: "Otros temas",
    preguntas: [
      {
        pregunta: "¿Cuánto tarda en acreditarse mi pago?",
        respuesta: [
          {
            tipo: "parrafo",
            texto:
              "Luego de confirmar la transacción, el pago puede demorar entre 6 y 12 horas. Cuando haya sido acreditado verás reflejado el pago en tu Panel del Alumno.",
          },
          {
            tipo: "parrafo",
            texto:
              "Si luego de las 12 horas de haber abonado lo ves en tu panel, contactanos a través de nuestro formulario de consultas para que podamos ayudarte. Una vez que lo hayas completado, aguardá la respuesta de nuestros asesores.",
          },
          {
            tipo: "parrafo",
            texto: "Ingresá al formulario de consultas aquí.",
          },
        ],
      },
      {
        pregunta: "¿Cómo solicito mi comprobante de pago?",
        respuesta: [
          {
            tipo: "parrafo",
            texto:
              "Si adquiriste un curso o carrera a través de nuestro Centro de e-Learning, podrás visualizar la factura correspondiente en el Panel del Alumno dentro de las 48 horas posteriores al pago. Si pasados ese tiempo encuentras la factura en tu panel, podés solicitarla a través de nuestro formulario de consultas. Ingresá al formulario de consultas aquí.",
          },
          {
            tipo: "parrafo",
            texto:
              "Si requerís atención personalizada sobre tu comprobante de pago, podés comunicarte con nuestros asesores de 9:00 a 19:00 hs (ARG).",
          },
          {
            tipo: "parrafo",
            texto: "Escribinos por WhatsApp aquí.",
          },
        ],
      },
      {
        pregunta:
          "¿Cómo presentar equivalencias de otra carrera o Universidad?",
        respuesta: [
          {
            tipo: "parrafo",
            texto:
              "Para iniciar el trámite de Solicitud de Equivalencias, debés tener asignado un número de legajo. Podés visualizar tu número de legajo en tus datos de perfil del Panel del Alumno.",
          },
          {
            tipo: "parrafo",
            texto:
              "La asignación del número de legajo se realiza entre la finalización del primer cuatrimestre de cursada y el inicio del segundo cuatrimestre. Si aún no tenés tu número de legajo asignado, deberás esperar a que se te asigne para iniciar el trámite.",
          },
          {
            tipo: "parrafo",
            texto:
              "Una vez que tengas tu número de legajo, debés completar el siguiente formulario.",
          },
          {
            tipo: "parrafo",
            texto:
              "Allí deberás adjuntar en mismo PDF unificado:",
          },
          {
            tipo: "parrafo",
            texto:
              "• Solicitud de trámite de puño y letra (descargar aquí)\n• Certificado analítico o de materias aprobadas con firma y sello de autoridad competente.\n• Programa foliado y sellado de la institución educativa donde cursaste la materia.",
          },
          {
            tipo: "parrafo",
            texto:
              "Si no contás con la documentación completa, no podremos iniciar la gestión.",
          },
          {
            tipo: "parrafo",
            texto:
              "El proceso de revisión y aprobación de equivalencias suele completarse en aproximadamente un mes, aunque este plazo puede variar según el caso.",
          },
        ],
      },
      {
        pregunta:
          "¿Los cursos y/o carreras otorgan puntaje docente?",
        respuesta: [
          {
            tipo: "parrafo",
            texto:
              "Únicamente otorga puntaje docente la Licenciatura en Tecnología Educativa.",
          },
          {
            tipo: "parrafo",
            texto:
              "De todas formas, podés consultar con el Ministerio de Educación de tu provincia sobre el curso que desees realizar y ellos te indicarán si reconocen el puntaje.",
          },
        ],
      },
      {
        pregunta: "Certificado y validación para LinkedIn",
        respuesta: [
          {
            tipo: "parrafo",
            texto:
              "Los certificados son extendidos en formato digital por el Centro de e-Learning de la Secretaría de Cultura y Extensión Universitaria de la Facultad Regional Buenos Aires de la Universidad Tecnológica Nacional, y podrás descargarlo desde el Panel del Alumno luego de 30 días de finalizada la cursada.",
          },
          {
            tipo: "parrafo",
            texto:
              "Contamos con un Sistema de Verificación de Certificados (SVC) a través del cual se pueden verificar los diplomas emitidos, tanto por parte de un alumno o un tercero que requiera validar el historial académico, brindándote la posibilidad de compartirlo en tu Currículum Vitae y LinkedIn.",
          },
        ],
      },
      {
        pregunta: "Quiero cambiar mi información registrada",
        respuesta: [
          {
            tipo: "parrafo",
            texto:
              "Podés modificar tus datos desde el Panel del Alumno, en el menú izquierdo e ir a Perfil. Allí tendrás acceso a tu información personal y podrás realizar los cambios necesarios, entre ellos tu correo electrónico, DNI o país de residencia.",
          },
        ],
      },
      {
        pregunta: "Olvidé mi usuario y/o contraseña",
        respuesta: [
          {
            tipo: "parrafo",
            texto:
              'Podés recuperar tu contraseña dando click a la opción "Olvidé contraseña" en la pantalla de login.',
          },
          {
            tipo: "parrafo",
            texto:
              "En caso de no recordar tu usuario, es decir, el correo electrónico con el que te registraste, podés ponerte en contacto con soporte@centrodeelearning.com o a través de nuestras redes sociales para que te ayudemos.",
          },
        ],
      },
      {
        pregunta:
          "¿Cuáles son los términos y condiciones de cursada?",
        respuesta: [
          {
            tipo: "parrafo",
            texto:
              "Podés leer nuestros términos y condiciones aquí.",
          },
        ],
      },
    ],
  },
];

export default function PaginaFAQ() {
  const [preguntaAbierta, setPreguntaAbierta] =
    useState<string | null>(null);

  const alternarPregunta = (idPregunta: string) => {
    setPreguntaAbierta((actual) =>
      actual === idPregunta ? null : idPregunta
    );
  };

  return (
    <main className="faq">
      <section
        className="faq-hero"
        aria-labelledby="titulo-faq"
      >
        <div className="faq-hero-contenido">
          <h1 id="titulo-faq">Preguntas frecuentes</h1>

          <p>
            Sabemos que al momento de inscribirte tenés muchas consultas por
            responder, por eso te compartimos las preguntas frecuentes que
            recibimos para ayudarte en el proceso.
          </p>
        </div>
      </section>

      <section
        className="faq-contenido"
        aria-label="Preguntas frecuentes"
      >
        {categorias.map((categoria) => (
          <section
            className="faq-categoria"
            key={categoria.titulo}
          >
            <div className="faq-categoria-titulo">
              <span aria-hidden="true">→</span>
              <h2>{categoria.titulo}</h2>
            </div>

            <div className="faq-lista">
              {categoria.preguntas.map((item, indice) => {
                const idPregunta =
                  `${categoria.titulo}-${indice}`;

                const estaAbierta =
                  preguntaAbierta === idPregunta;

                return (
                  <div
                    className="faq-item"
                    key={idPregunta}
                  >
                    <button
                      type="button"
                      className="faq-pregunta"
                      aria-expanded={estaAbierta}
                      aria-controls={`respuesta-${idPregunta}`}
                      onClick={() =>
                        alternarPregunta(idPregunta)
                      }
                    >
                      <span>{item.pregunta}</span>

                      <span
                        className={`faq-icono ${
                          estaAbierta ? "abierta" : ""
                        }`}
                        aria-hidden="true"
                      >
                        ⌄
                      </span>
                    </button>

                    {estaAbierta && (
                      <div
                        id={`respuesta-${idPregunta}`}
                        className="faq-respuesta"
                      >
                        {item.respuesta.map(
                          (contenido, indiceContenido) => {
                            if (
                              contenido.tipo === "subtitulo"
                            ) {
                              return (
                                <h3 key={indiceContenido}>
                                  {contenido.texto}
                                </h3>
                              );
                            }

                            if (
                              contenido.tipo === "lista"
                            ) {
                              return (
                                <ul key={indiceContenido}>
                                  {contenido.items.map(
                                    (itemLista, indiceItem) => (
                                      <li key={indiceItem}>
                                        {itemLista}
                                      </li>
                                    )
                                  )}
                                </ul>
                              );
                            }

                            return (
                              <p key={indiceContenido}>
                                {contenido.texto}
                              </p>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}