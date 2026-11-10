// Formulario público de preinscripción para aspirantes a carreras de posgrado.

import { useState } from "react";
import "./FormularioInscripcion.css";

const etapas = [
  "Datos Personales",
  "Documentación",
  "Beca (Opcional)",
  "Confirmación",
];

const provincias = [
  "Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Ciudad Autónoma de Buenos Aires",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego, Antártida e Islas del Atlántico Sur",
  "Tucumán",
];

export default function FormularioInscripcion() {
  const [etapa, setEtapa] = useState(1);
  const [otroPais, setOtroPais] = useState("");
  const [mensaje, setMensaje] = useState("");
  
  const [documentos, setDocumentos] = useState({
    formularioPreinscripcion: null as File | null,
    formularioInscripcion: null as File | null,
    partidaNacimiento: null as File | null,
    constanciaCuitCuil: null as File | null,
    tituloGrado: null as File | null,
    tituloPosgrado: null as File | null,
  });

  const [datos, setDatos] = useState({
    dni: "",
    apellido: "",
    nombre: "",
    email: "",
    tipo_carrera: "Especializacion",
    nacionalidad: "",
    telefono: "",
    domicilio: "",
    pais: "",
    provincia: "",
    ciudad: "",
    titulo_anterior: "",
    universidad_anterior: "",
    correo_alternativo: "",
    forma_conocio_ofertas: "",
    motivos_cursar: "",
    solicitud_beca: "",
  });

  const siguienteEtapa = () => {
    if (etapa === 2) {
      const documentosObligatorios = [
        documentos.formularioPreinscripcion,
        documentos.formularioInscripcion,
        documentos.partidaNacimiento,
        documentos.constanciaCuitCuil,
        documentos.tituloGrado,
      ];

      const faltaDocumento = documentosObligatorios.some(
        (documento) => documento === null
      );

      if (faltaDocumento) {
        setMensaje(
          "Debés adjuntar todos los documentos obligatorios para continuar."
        );
        return;
      }
    }

    if (etapa < 4) {
      setEtapa(etapa + 1);
      setMensaje("");
    }
  };

  const etapaAnterior = () => {
    if (etapa > 1) {
      setEtapa(etapa - 1);
      setMensaje("");
    }
  };

  const avanzarDesdeDatosPersonales = (e: React.FormEvent) => {
    e.preventDefault();
    siguienteEtapa();
  };

  const enviarFormulario = async (e: React.FormEvent) => {
    e.preventDefault();

    const datosFormulario = {
      ...datos,
      pais: datos.pais === "Otro" ? otroPais : datos.pais,
    };

    try {
      const respuesta = await fetch(
        "http://localhost:8000/api/v1/inscripcion/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(datosFormulario),
        }
      );

      setMensaje(
        respuesta.ok
          ? "¡Inscripción enviada con éxito! Revisá tu email."
          : "Error al enviar la inscripción. Verificá tus datos."
      );
    } catch {
      setMensaje("Error de conexión con el servidor.");
    }
  };

  return (
    <section className="inscripcion" aria-labelledby="titulo-inscripcion">
      <section className="inscripcion-formulario">
        <h1 id="titulo-inscripcion">Formulario de Inscripción</h1>

        <ol
          className="inscripcion-etapas"
          aria-label="Etapas de inscripción"
        >
          {etapas.map((nombreEtapa, indice) => {
            const numeroEtapa = indice + 1;

            return (
              <li
                key={nombreEtapa}
                className={
                  etapa === numeroEtapa
                    ? "inscripcion-etapa activa"
                    : "inscripcion-etapa"
                }
                aria-current={
                  etapa === numeroEtapa ? "step" : undefined
                }
              >
                <span aria-hidden="true">{numeroEtapa}</span>
                <p>{nombreEtapa}</p>
              </li>
            );
          })}
        </ol>

        {mensaje && (
          <p className="inscripcion-mensaje" role="status">
            <span className="inscripcion-aviso-icono" aria-hidden="true" />
            <span>{mensaje}</span>
          </p>
        )}

        {etapa === 1 && (
          <form onSubmit={avanzarDesdeDatosPersonales}>
            <fieldset>
              <legend>Datos Personales</legend>

              <div className="inscripcion-campo">
                <label htmlFor="carrera">
                  Carrera Elegida <span>*</span>
                </label>

                <select
                  id="carrera"
                  name="carrera"
                  required
                  value={datos.tipo_carrera}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      tipo_carrera: e.target.value,
                    })
                  }
                >
                  <option value="Especializacion">
                    Especialización
                  </option>
                  <option value="Maestria">Maestría</option>
                  <option value="Doctorado">Doctorado</option>
                </select>
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="apellido">
                  Apellido/s <span>*</span>
                </label>

                <input
                  id="apellido"
                  name="apellido"
                  required
                  pattern="[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+"
                  title="El apellido solo puede contener letras."
                  placeholder="Ingresá tu apellido"
                  value={datos.apellido}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      apellido: e.target.value,
                    })
                  }
                />
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="nombre">
                  Nombre/s <span>*</span>
                </label>

                <input
                  id="nombre"
                  name="nombre"
                  required
                  pattern="[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+"
                  title="El nombre solo puede contener letras."
                  placeholder="Ingresá tu nombre"
                  value={datos.nombre}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      nombre: e.target.value,
                    })
                  }
                />
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="nacionalidad">
                  Nacionalidad <span>*</span>
                </label>

                <input
                  id="nacionalidad"
                  name="nacionalidad"
                  required
                  pattern="[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+"
                  title="La nacionalidad solo puede contener letras."
                  placeholder="Ingresá tu nacionalidad"
                  value={datos.nacionalidad}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      nacionalidad: e.target.value,
                    })
                  }
                />
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="dni">
                  DNI o Pasaporte <span>*</span>
                </label>

                <input
                  id="dni"
                  name="dni"
                  type="text"
                  required
                  inputMode="numeric"
                  pattern="[0-9]+"
                  title="El DNI solo puede contener números."
                  placeholder="Ingresá tu DNI o Pasaporte"
                  value={datos.dni}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      dni: e.target.value,
                    })
                  }
                />
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="telefono">Teléfono Móvil</label>

                <input
                  id="telefono"
                  name="telefono"
                  pattern="[0-9\s-]+"
                  title="El teléfono solo puede contener números, espacios y guiones."
                  placeholder="Ej: 221-221-2221"
                  value={datos.telefono}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      telefono: e.target.value,
                    })
                  }
                />
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="email">
                  Correo Electrónico <span>*</span>
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="ejemplo@correo.com"
                  value={datos.email}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      email: e.target.value,
                    })
                  }
                />
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="correo_alternativo">
                  Correo Electrónico Alternativo
                </label>

                <input
                  id="correo_alternativo"
                  name="correo_alternativo"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={datos.correo_alternativo}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      correo_alternativo: e.target.value,
                    })
                  }
                />
              </div>

              <div className="inscripcion-campo inscripcion-campo-ancho-completo">
                <label htmlFor="domicilio">Domicilio</label>

                <input
                  id="domicilio"
                  name="domicilio"
                  placeholder="Ingresá tu domicilio actual"
                  value={datos.domicilio}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      domicilio: e.target.value,
                    })
                  }
                />
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="pais">
                  País <span>*</span>
                </label>

                <select
                  id="pais"
                  name="pais"
                  required
                  value={datos.pais}
                  onChange={(e) => {
                    setDatos({
                      ...datos,
                      pais: e.target.value,
                    });

                    if (e.target.value !== "Otro") {
                      setOtroPais("");
                    }
                  }}
                >
                  <option value="">Seleccionar</option>
                  <option value="Argentina">Argentina</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {datos.pais === "Otro" && (
                <div className="inscripcion-campo">
                  <label htmlFor="otro-pais">
                    Especificá el país <span>*</span>
                  </label>

                  <input
                    id="otro-pais"
                    name="otro-pais"
                    required
                    placeholder="Ingresá tu país"
                    value={otroPais}
                    onChange={(e) =>
                      setOtroPais(e.target.value)
                    }
                  />
                </div>
              )}

              <div className="inscripcion-campo">
                <label htmlFor="provincia">
                  Provincia <span>*</span>
                </label>

                <select
                  id="provincia"
                  name="provincia"
                  required
                  value={datos.provincia}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      provincia: e.target.value,
                    })
                  }
                >
                  <option value="">Seleccionar</option>

                  {provincias.map((provincia) => (
                    <option key={provincia} value={provincia}>
                      {provincia}
                    </option>
                  ))}
                </select>
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="ciudad">
                  Ciudad <span>*</span>
                </label>

                <input
                  id="ciudad"
                  name="ciudad"
                  required
                  pattern="[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+"
                  title="La ciudad solo puede contener letras."
                  placeholder="Ingresá tu ciudad"
                  value={datos.ciudad}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      ciudad: e.target.value,
                    })
                  }
                />
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="titulo_anterior">
                  Título anterior <span>*</span>
                </label>

                <input
                  id="titulo_anterior"
                  name="titulo_anterior"
                  required
                  placeholder="Ingresá tu titulación anterior"
                  value={datos.titulo_anterior}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      titulo_anterior: e.target.value,
                    })
                  }
                />
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="universidad_anterior">
                  Universidad Anterior <span>*</span>
                </label>

                <input
                  id="universidad_anterior"
                  name="universidad_anterior"
                  required
                  placeholder="Ingresá tu institución anterior"
                  value={datos.universidad_anterior}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      universidad_anterior: e.target.value,
                    })
                  }
                />
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="forma_conocio_ofertas">
                  ¿Cómo conociste la oferta de posgrado? <span>*</span>
                </label>
                <select
                  id="forma_conocio_ofertas"
                  name="forma_conocio_ofertas"
                  required
                  value={datos.forma_conocio_ofertas}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      forma_conocio_ofertas: e.target.value,
                    })
                  }
                >
                  <option value="">Seleccionar</option>
                  <option value="Sitio web">Sitio web</option>
                  <option value="Otros sitios web">Otros sitios web</option>
                  <option value="Egresados de la UTN FRLP">
                    Egresados de la UTN FRLP
                  </option>
                  <option value="Comentarios de colegas u otros">
                    Comentarios de colegas u otros
                  </option>
                </select>           
              </div>

              <div className="inscripcion-campo inscripcion-campo-ancho-completo">
                <label htmlFor="motivos_cursar">
                  Motivos por los cuales desea cursar la carrera <span>*</span>
                </label>

                <textarea
                  id="motivos_cursar"
                  name="motivos_cursar"
                  required
                  rows={4}
                  placeholder="Contanos brevemente tus motivos"
                  value={datos.motivos_cursar}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      motivos_cursar: e.target.value,
                    })
                  }
                />
              </div>

            </fieldset>

            <div className="inscripcion-botones">
              <button type="submit">
                Siguiente
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </form>
        )}

        {etapa === 2 && (
          <section className="inscripcion-contenido-etapa">
            <h2>Documentación</h2>

            <p>
              Adjuntá la documentación requerida para completar la inscripción.
            </p>

            <p className="inscripcion-aviso-documentacion">
              <span className="inscripcion-aviso-icono" aria-hidden="true"/>
              <span>Solo se admiten archivos en formato PDF.</span>
            </p>

            <fieldset className="inscripcion-documentacion">
              <legend>Documentación requerida</legend>

              <div className="inscripcion-documento">
                <label htmlFor="formulario-preinscripcion">
                  Formulario de preinscripción con firma analógica
                  <span>*</span>
                </label>

                <input
                  id="formulario-preinscripcion"
                  name="formulario-preinscripcion"
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={(e) =>
                    setDocumentos({
                      ...documentos,
                      formularioPreinscripcion: e.target.files?.[0] ?? null,
                    })
                  }
                />

              </div>

              <div className="inscripcion-documento">
                <label htmlFor="formulario-inscripcion">
                  Formulario de inscripción con firma analógica
                  <span>*</span>
                </label>

                <input
                  id="formulario-inscripcion"
                  name="formulario-inscripcion"
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={(e) =>
                    setDocumentos({
                      ...documentos,
                      formularioInscripcion: e.target.files?.[0] ?? null,
                    })
                  }
                />
              </div>

              <div className="inscripcion-documento">
                <label htmlFor="partida-nacimiento">
                  Copia de la partida de nacimiento
                  <span>*</span>
                </label>

                <input
                  id="partida-nacimiento"
                  name="partida-nacimiento"
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={(e) =>
                    setDocumentos({
                      ...documentos,
                      partidaNacimiento: e.target.files?.[0] ?? null,
                    })
                  }
                />
              </div>

              <div className="inscripcion-documento">
                <label htmlFor="constancia-cuit-cuil">
                  Constancia de CUIT-CUIL
                  <span>*</span>
                </label>

                <input
                  id="constancia-cuit-cuil"
                  name="constancia-cuit-cuil"
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={(e) =>
                  setDocumentos({
                    ...documentos,
                    constanciaCuitCuil: e.target.files?.[0] ?? null,
                  })
                }
                />
              </div>

              <div className="inscripcion-documento">
                <label htmlFor="titulo-grado">
                  Copia del título de grado
                  <span>*</span>
                </label>

                <input
                  id="titulo-grado"
                  name="titulo-grado"
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={(e) =>
                    setDocumentos({
                      ...documentos,
                      tituloGrado: e.target.files?.[0] ?? null,
                    })
                  }
                />
              </div>

              <div className="inscripcion-documento">
                <label htmlFor="titulo-posgrado">
                  Copia del título de posgrado
                </label>

                <input
                  id="titulo-posgrado"
                  name="titulo-posgrado"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) =>
                    setDocumentos({
                      ...documentos,
                      tituloPosgrado: e.target.files?.[0] ?? null,
                    })
                  }
                />
              </div>
            </fieldset>

            <div className="inscripcion-botones">
              <button type="button" onClick={etapaAnterior}>
                <span aria-hidden="true">←</span>
                Anterior
              </button>

              <button type="button" onClick={siguienteEtapa}>
                Siguiente
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </section>
        )}

       {etapa === 3 && (
          <section className="inscripcion-contenido-etapa">
            <h2>Beca (Opcional)</h2>

            <p>
              Seleccioná el porcentaje de beca que corresponde a tu situación.
            </p>

            <fieldset className="inscripcion-beca">
              <legend>Solicitud de beca</legend>

              <div className="inscripcion-opcion-beca">
                <input
                  id="beca-30"
                  name="solicitud_beca"
                  type="radio"
                  value="30"
                  checked={datos.solicitud_beca === "30"}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      solicitud_beca: e.target.value,
                    })
                  }
                />

                <label htmlFor="beca-30">
                  Solicitar beca del 30%
                </label>
              </div>

              <div className="inscripcion-opcion-beca">
                <input
                  id="beca-100"
                  name="solicitud_beca"
                  type="radio"
                  value="100"
                  checked={datos.solicitud_beca === "100"}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      solicitud_beca: e.target.value,
                    })
                  }
                />

                <label htmlFor="beca-100">
                  Solicitar beca del 100%
                </label>
              </div>
            </fieldset>

            <p className="inscripcion-aviso-beca">
              <span className="inscripcion-aviso-icono" aria-hidden="true" />
              <span>
                La beca del 30% corresponde a graduados de la UTN y la beca del 100%
                corresponde a docentes de la UTN.
              </span>
            </p>

            <div className="inscripcion-botones">
              <button type="button" onClick={etapaAnterior}>
                <span aria-hidden="true">←</span>
                Anterior
              </button>

              <button type="button" onClick={siguienteEtapa}>
                Siguiente
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </section>
        )}

        {etapa === 4 && (
          <form
            className="inscripcion-contenido-etapa"
            onSubmit={enviarFormulario}
          >
            <h2 className="inscripcion-titulo-confirmacion">
              Confirmación
            </h2>

            <p>
              Revisá la información ingresada antes de confirmar la inscripción.
            </p>

            <div className="inscripcion-resumen-grid">
              <section className="inscripcion-resumen">
                <div className="inscripcion-resumen-encabezado">
                  <h3>Datos personales</h3>

                  <button
                    type="button"
                    onClick={() => setEtapa(1)}
                  >
                    Modificar
                  </button>
                </div>

                <p><strong>Carrera:</strong> {datos.tipo_carrera}</p>
                <p><strong>Apellido/s:</strong> {datos.apellido}</p>
                <p><strong>Nombre/s:</strong> {datos.nombre}</p>
                <p><strong>Nacionalidad:</strong> {datos.nacionalidad}</p>
                <p><strong>DNI o Pasaporte:</strong> {datos.dni}</p>
                <p><strong>Teléfono:</strong> {datos.telefono || "No informado"}</p>
                <p><strong>Correo electrónico:</strong> {datos.email}</p>
                <p>
                  <strong>Correo electrónico alternativo:</strong>{" "}
                  {datos.correo_alternativo || "No informado"}
                </p>
                <p>
                  <strong>Domicilio:</strong> {datos.domicilio || "No informado"}
                </p>
                <p><strong>País:</strong> {datos.pais === "Otro" ? otroPais : datos.pais}</p>
                <p><strong>Provincia:</strong> {datos.provincia}</p>
                <p><strong>Ciudad:</strong> {datos.ciudad}</p>
                <p><strong>Título anterior:</strong> {datos.titulo_anterior}</p>
                <p>
                  <strong>Universidad anterior:</strong>{" "}
                  {datos.universidad_anterior}
                </p>
                <p>
                  <strong>¿Cómo conociste la oferta de posgrado?:</strong>{" "}
                  {datos.forma_conocio_ofertas}
                </p>
                <p>
                  <strong>Motivos para cursar la carrera:</strong>{" "}
                  {datos.motivos_cursar}
                </p>
              </section>

              <section className="inscripcion-resumen">
                <div className="inscripcion-resumen-encabezado">
                  <h3>Documentación</h3>

                  <button
                    type="button"
                    onClick={() => setEtapa(2)}
                  >
                    Modificar
                  </button>
                </div>

                <p>
                  <strong>Formulario de preinscripción:</strong>{" "}
                  {documentos.formularioPreinscripcion?.name || "No adjuntado"}
                </p>

                <p>
                  <strong>Formulario de inscripción:</strong>{" "}
                  {documentos.formularioInscripcion?.name || "No adjuntado"}
                </p>

                <p>
                  <strong>Partida de nacimiento:</strong>{" "}
                  {documentos.partidaNacimiento?.name || "No adjuntado"}
                </p>

                <p>
                  <strong>Constancia de CUIT-CUIL:</strong>{" "}
                  {documentos.constanciaCuitCuil?.name || "No adjuntado"}
                </p>

                <p>
                  <strong>Título de grado:</strong>{" "}
                  {documentos.tituloGrado?.name || "No adjuntado"}
                </p>

                <p>
                  <strong>Título de posgrado:</strong>{" "}
                  {documentos.tituloPosgrado?.name || "No adjuntado"}
                </p>
              </section>

              <section className="inscripcion-resumen">
                <div className="inscripcion-resumen-encabezado">
                  <h3>Beca</h3>

                  <button
                    type="button"
                    onClick={() => setEtapa(3)}
                  >
                    Modificar
                  </button>
                </div>

                <p>
                  <strong>Solicitud de beca:</strong>{" "}
                  {datos.solicitud_beca
                    ? `Beca del ${datos.solicitud_beca}%`
                    : "No solicita beca"}
                </p>
              </section>
            </div>

            <div className="inscripcion-botones">
              <button type="button" onClick={etapaAnterior}>
                <span aria-hidden="true">←</span>
                Anterior
              </button>

              <button type="submit">
                Confirmar inscripción
              </button>
            </div>
          </form>
        )}
        
      </section>
    </section>
  );
}