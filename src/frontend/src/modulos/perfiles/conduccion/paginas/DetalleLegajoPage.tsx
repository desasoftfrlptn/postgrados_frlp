
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";

import "../estilos/Conduccion.css";

interface LegajoDetalle {
  id: string;
  carrera_elegida: string;
  apellido: string;
  nombre: string;
  nacionalidad: string;
  dni_pasaporte: string;
  telefono_movil: string | null;
  correo_electronico: string;
  correo_alternativo: string | null;
  domicilio: string | null;
  estado: string;
  pais: string;
  provincia: string;
  ciudad: string;
  titulo_anterior: string;
  universidad_anterior: string;
}

interface DocumentoLegajo {
  id: string;
  tipo: string;
  fecha: string;
}

interface CompletitudDocumental {
  porcentaje: number;
  documentos_requeridos: number;
  documentos_presentados: number;
  documentos_faltantes: string[];
  completo: boolean;
}

interface DocumentacionLegajo {
  legajo_id: string;
  documentos: DocumentoLegajo[];
  completitud: CompletitudDocumental | null;
}

const documentosObligatorios = [
  {
    tipo: "FORMULARIO_PREINSCRIPCION",
    nombre: "Formulario de preinscripción firmado",
  },
  {
    tipo: "DNI_PASAPORTE",
    nombre: "Copia de DNI o pasaporte",
  },
  {
    tipo: "TITULO_GRADO",
    nombre: "Copia del título de grado",
  },
  {
    tipo: "PARTIDA_NACIMIENTO",
    nombre: "Partida de nacimiento",
  },
  {
    tipo: "CONSTANCIA_CUIT_CUIL",
    nombre: "Constancia CUIT/CUIL",
  },
];

const nombresDocumentos: Record<string, string> = {
  FORMULARIO_PREINSCRIPCION: "Formulario de preinscripción firmado",
  DNI_PASAPORTE: "Copia de DNI o pasaporte",
  TITULO_GRADO: "Copia del título de grado",
  PARTIDA_NACIMIENTO: "Partida de nacimiento",
  CONSTANCIA_CUIT_CUIL: "Constancia CUIT/CUIL",
  TITULO_POSGRADO: "Copia del título de posgrado",
  FORMULARIO_BECA: "Formulario de beca firmado",
};

function mostrarDato(valor: string | null | undefined): string {
  return valor?.trim() || "No informado";
}

function mostrarFecha(fecha: string): string {
  const valor = new Date(fecha);

  return Number.isNaN(valor.getTime())
    ? "Fecha no disponible"
    : valor.toLocaleDateString("es-AR");
}

function claseEstado(estado: string): string {
  switch (estado) {
    case "PENDIENTE":
      return "conduccion-estado-pendiente";
    case "EN_REVISION":
      return "conduccion-estado-revision";
    case "COMPLETADO":
    case "ACTIVO":
    case "GRADUADO":
      return "conduccion-estado-completado";
    case "RECHAZADO":
    case "BAJA":
      return "conduccion-estado-rechazado";
    default:
      return "conduccion-estado-otro";
  }
}

function Campo({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: string | null | undefined;
}) {
  return (
    <div className="conduccion-campo">
      <dt>{etiqueta}</dt>
      <dd>{mostrarDato(valor)}</dd>
    </div>
  );
}

export default function DetalleLegajoPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [legajo, setLegajo] = useState<LegajoDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [documentacion, setDocumentacion] =
    useState<DocumentacionLegajo | null>(null);
  const [cargandoDocumentacion, setCargandoDocumentacion] =
    useState(true);
  const [errorDocumentacion, setErrorDocumentacion] =
    useState<string | null>(null);

  const [actualizandoEstado, setActualizandoEstado] =
    useState(false);
  const [mensajeEstado, setMensajeEstado] =
    useState<string | null>(null);
  const [errorEstado, setErrorEstado] =
    useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function cargarLegajo() {
      setCargando(true);
      setLegajo(null);
      setError(null);
      setMensajeEstado(null);
      setErrorEstado(null);

      if (!id || !user?.token) {
        setError("No se pudo identificar el legajo o la sesión.");
        setCargando(false);
        return;
      }

      try {
        const resultado = await api.get<LegajoDetalle>(
          `/inscripcion/${encodeURIComponent(id)}`,
          user.token
        );

        if (activo) {
          setLegajo(resultado);
        }
      } catch (err) {
        if (activo) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo consultar el legajo."
          );
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    void cargarLegajo();

    return () => {
      activo = false;
    };
  }, [id, user?.token]);

  useEffect(() => {
    let activo = true;

    async function cargarDocumentacion() {
      setCargandoDocumentacion(true);
      setDocumentacion(null);
      setErrorDocumentacion(null);

      if (!id || !user?.token) {
        setErrorDocumentacion(
          "No se pudo identificar el legajo o la sesión."
        );
        setCargandoDocumentacion(false);
        return;
      }

      try {
        const resultado = await api.get<DocumentacionLegajo>(
          `/inscripcion/${encodeURIComponent(id)}/documentos`,
          user.token
        );

        if (activo) {
          setDocumentacion(resultado);
        }
      } catch {
        if (activo) {
          setErrorDocumentacion(
            "La documentación todavía no está disponible. " +
              "Debe habilitarse su consulta desde el Backend."
          );
        }
      } finally {
        if (activo) {
          setCargandoDocumentacion(false);
        }
      }
    }

    void cargarDocumentacion();

    return () => {
      activo = false;
    };
  }, [id, user?.token]);

  async function iniciarRevision() {
    if (
      !legajo ||
      !user?.token ||
      legajo.estado !== "PENDIENTE" ||
      actualizandoEstado
    ) {
      return;
    }

    setActualizandoEstado(true);
    setMensajeEstado(null);
    setErrorEstado(null);

    try {
      const resultado = await api.patch<LegajoDetalle>(
        `/inscripcion/${encodeURIComponent(legajo.id)}/iniciar-revision`,
        {},
        user.token
      );

      setLegajo(resultado);
      setMensajeEstado(
        "La revisión del legajo se inició correctamente."
      );
    } catch (err) {
      setErrorEstado(
        err instanceof Error
          ? err.message
          : "No se pudo iniciar la revisión."
      );
    } finally {
      setActualizandoEstado(false);
    }
  }

  const documentosRegistrados =
    documentacion?.documentos ?? [];

  const tiposPresentados = new Set(
    documentosRegistrados.map((documento) => documento.tipo)
  );

  return (
    <section
      className="perfil-pagina conduccion-detalle"
      aria-labelledby="titulo-detalle-legajo"
    >
      <Link
        to="/dashboard/conduccion/aspirantes"
        className="conduccion-volver"
      >
        ← Volver al listado de aspirantes
      </Link>

      <header className="perfil-pagina-encabezado">
        <h1 id="titulo-detalle-legajo">Detalle del legajo</h1>
        <p>Información y seguimiento de la inscripción.</p>
      </header>

      {cargando && (
        <p role="status">Cargando información del legajo...</p>
      )}

      {!cargando && error && (
        <div
          className="conduccion-mensaje conduccion-mensaje-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {!cargando && !error && legajo && (
        <>
          {/* RESUMEN */}
          <section
            className="conduccion-resumen"
            aria-labelledby="titulo-resumen-legajo"
          >
            <div className="conduccion-resumen-superior">
              <div>
                <h2
                  id="titulo-resumen-legajo"
                  className="conduccion-nombre"
                >
                  {legajo.nombre} {legajo.apellido}
                </h2>

                <p className="conduccion-subtitulo">
                  {legajo.carrera_elegida}
                </p>
              </div>

              <span
                className={`conduccion-estado ${claseEstado(
                  legajo.estado
                )}`}
              >
                {legajo.estado.replaceAll("_", " ")}
              </span>
            </div>

            <dl className="conduccion-resumen-datos">
              <Campo
                etiqueta="DNI o pasaporte"
                valor={legajo.dni_pasaporte}
              />
              <Campo
                etiqueta="Correo electrónico"
                valor={legajo.correo_electronico}
              />
            </dl>
          </section>

          {/* DATOS DEL ASPIRANTE */}
          <div className="conduccion-grid">
            <section
              className="conduccion-tarjeta"
              aria-labelledby="titulo-personales"
            >
              <header className="conduccion-tarjeta-encabezado">
                <h2 id="titulo-personales">
                  Datos personales
                </h2>
              </header>

              <div className="conduccion-tarjeta-cuerpo">
                <dl className="conduccion-datos">
                  <Campo etiqueta="Nombre" valor={legajo.nombre} />
                  <Campo etiqueta="Apellido" valor={legajo.apellido} />
                  <Campo
                    etiqueta="Nacionalidad"
                    valor={legajo.nacionalidad}
                  />
                  <Campo
                    etiqueta="DNI / Pasaporte"
                    valor={legajo.dni_pasaporte}
                  />
                </dl>
              </div>
            </section>

            <section
              className="conduccion-tarjeta"
              aria-labelledby="titulo-contacto"
            >
              <header className="conduccion-tarjeta-encabezado">
                <h2 id="titulo-contacto">
                  Información de contacto
                </h2>
              </header>

              <div className="conduccion-tarjeta-cuerpo">
                <dl className="conduccion-datos">
                  <Campo
                    etiqueta="Correo electrónico"
                    valor={legajo.correo_electronico}
                  />
                  <Campo
                    etiqueta="Correo alternativo"
                    valor={legajo.correo_alternativo}
                  />
                  <Campo
                    etiqueta="Teléfono móvil"
                    valor={legajo.telefono_movil}
                  />
                </dl>
              </div>
            </section>

            <section
              className="conduccion-tarjeta"
              aria-labelledby="titulo-domicilio"
            >
              <header className="conduccion-tarjeta-encabezado">
                <h2 id="titulo-domicilio">Domicilio</h2>
              </header>

              <div className="conduccion-tarjeta-cuerpo">
                <dl className="conduccion-datos">
                  <Campo etiqueta="País" valor={legajo.pais} />
                  <Campo
                    etiqueta="Provincia"
                    valor={legajo.provincia}
                  />
                  <Campo etiqueta="Ciudad" valor={legajo.ciudad} />
                  <Campo
                    etiqueta="Dirección"
                    valor={legajo.domicilio}
                  />
                </dl>
              </div>
            </section>

            <section
              className="conduccion-tarjeta"
              aria-labelledby="titulo-formacion"
            >
              <header className="conduccion-tarjeta-encabezado">
                <h2 id="titulo-formacion">
                  Formación académica previa
                </h2>
              </header>

              <div className="conduccion-tarjeta-cuerpo">
                <dl className="conduccion-datos">
                  <Campo
                    etiqueta="Título obtenido"
                    valor={legajo.titulo_anterior}
                  />
                  <Campo
                    etiqueta="Universidad de origen"
                    valor={legajo.universidad_anterior}
                  />
                </dl>
              </div>
            </section>
          </div>

          {/* DOCUMENTACIÓN */}
          <section
            className="conduccion-tarjeta conduccion-seccion-documental"
            aria-labelledby="titulo-documentacion"
          >
            <header className="conduccion-tarjeta-encabezado">
              <h2 id="titulo-documentacion">
                Documentación del aspirante
              </h2>
            </header>

            <div className="conduccion-tarjeta-cuerpo">
              {cargandoDocumentacion && (
                <p role="status">
                  Cargando documentación...
                </p>
              )}

              {!cargandoDocumentacion &&
                errorDocumentacion && (
                  <div
                    className="conduccion-mensaje conduccion-mensaje-error"
                    role="alert"
                  >
                    {errorDocumentacion}
                  </div>
                )}

              {!cargandoDocumentacion &&
                !errorDocumentacion &&
                documentacion && (
                  <>
                    <div className="conduccion-seccion-documental">
                      <h3>Documentos obligatorios</h3>

                      <ul className="conduccion-documentos">
                        {documentosObligatorios.map((documento) => (
                          <li
                            key={documento.tipo}
                            className="conduccion-documento"
                          >
                            <strong>{documento.nombre}</strong>
                            <span className="conduccion-documento-estado">
                              {tiposPresentados.has(documento.tipo)
                                ? "Presentado"
                                : "Faltante"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="conduccion-seccion-documental">
                      <h3>Documentos registrados</h3>

                      {documentosRegistrados.length === 0 ? (
                        <p>No hay documentos registrados.</p>
                      ) : (
                        <ul className="conduccion-documentos">
                          {documentosRegistrados.map((documento) => (
                            <li
                              key={documento.id}
                              className="conduccion-documento"
                            >
                              <strong>
                                {nombresDocumentos[documento.tipo] ??
                                  documento.tipo}
                              </strong>
                              <span className="conduccion-documento-estado">
                                {mostrarFecha(documento.fecha)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="conduccion-seccion-documental">
                      <h3>Completitud documental</h3>

                      {documentacion.completitud === null ? (
                        <p>
                          El porcentaje todavía no está disponible.
                          Deben verificarse los requisitos
                          particulares del aspirante.
                        </p>
                      ) : (
                        <div>
                          <p>
                            <strong>
                              {documentacion.completitud.porcentaje}%
                              completo
                            </strong>
                          </p>

                          <progress
                            className="conduccion-progreso"
                            max={100}
                            value={
                              documentacion.completitud.porcentaje
                            }
                            aria-label="Porcentaje de documentación completa"
                          />

                          <p>
                            {
                              documentacion.completitud
                                .documentos_presentados
                            }{" "}
                            de{" "}
                            {
                              documentacion.completitud
                                .documentos_requeridos
                            }{" "}
                            documentos requeridos.
                          </p>

                          {documentacion.completitud.documentos_faltantes
                            .length > 0 && (
                            <>
                              <h3 className="mt-4">
                                Documentos faltantes
                              </h3>
                              <ul className="list-disc pl-5">
                                {documentacion.completitud.documentos_faltantes.map(
                                  (nombre) => (
                                    <li key={nombre}>
                                      {nombre}
                                    </li>
                                  )
                                )}
                              </ul>
                            </>
                          )}

                          {documentacion.completitud.completo && (
                            <p className="mt-3">
                              La documentación requerida está completa.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
            </div>
          </section>

          {/* INICIO DE REVISIÓN */}
          {legajo.estado === "PENDIENTE" && (
            <section
              className="conduccion-acciones"
              aria-labelledby="titulo-acciones"
            >
              <div>
                <h2 id="titulo-acciones">
                  Iniciar revisión de inscripción
                </h2>
                <p>
                  Cambiar el estado del legajo a EN REVISIÓN.
                </p>
              </div>

              <button
                type="button"
                className="conduccion-boton"
                onClick={() => void iniciarRevision()}
                disabled={actualizandoEstado}
              >
                {actualizandoEstado
                  ? "Iniciando revisión..."
                  : "Iniciar revisión"}
              </button>
            </section>
          )}

          {mensajeEstado && (
            <p
              className="conduccion-mensaje conduccion-mensaje-exito"
              role="status"
            >
              {mensajeEstado}
            </p>
          )}

          {errorEstado && (
            <p
              className="conduccion-mensaje conduccion-mensaje-error"
              role="alert"
            >
              {errorEstado}
            </p>
          )}
        </>
      )}
    </section>
  );
}
