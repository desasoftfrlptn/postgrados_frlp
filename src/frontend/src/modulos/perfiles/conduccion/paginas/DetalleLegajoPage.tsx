import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";
import GestionInscripcion from "../componentes/GestionInscripcion";
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
  numero_seguimiento?: string;
}

interface DocumentoLegajo {
  id: string;
  tipo: string;
  fecha: string;
}

interface DocumentacionLegajo {
  legajo_id: string;
  documentos: DocumentoLegajo[];
}

const nombresDocumentos: Record<string, string> = {
  FORMULARIO_PREINSCRIPCION: "Formulario de preinscripción firmado",
  DNI_PASAPORTE: "Copia de DNI o pasaporte",
  TITULO_GRADO: "Copia del título de grado",
  PARTIDA_NACIMIENTO: "Partida de nacimiento",
  CONSTANCIA_CUIT_CUIL: "Constancia CUIT/CUIL",
  TITULO_POSGRADO: "Copia del título de posgrado",
  FORMULARIO_BECA: "Formulario de beca firmado",
};

function mostrarDato(valor: string | null | undefined) {
  return valor?.trim() || "No informado";
}

function mostrarFecha(fecha: string) {
  const valor = new Date(fecha);

  return Number.isNaN(valor.getTime())
    ? "Fecha no disponible"
    : valor.toLocaleDateString("es-AR");
}

function claseEstado(estado: string) {
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

function ContenidoDetalle({
  id,
  token,
}: {
  id: string;
  token: string;
}) {
  const [legajo, setLegajo] = useState<LegajoDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [documentacion, setDocumentacion] =
    useState<DocumentacionLegajo | null>(null);
  const [cargandoDocumentacion, setCargandoDocumentacion] =
    useState(true);
  const [errorDocumentacion, setErrorDocumentacion] = useState("");

  useEffect(() => {
    let activo = true;

    async function cargarLegajo() {
      try {
        const resultado = await api.get<LegajoDetalle>(
          `/inscripcion/${encodeURIComponent(id)}`,
          token,
        );

        if (activo) {
          setLegajo(resultado);
        }
      } catch (err) {
        if (activo) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo consultar el legajo.",
          );
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    async function cargarDocumentacion() {
      try {
        const resultado = await api.get<DocumentacionLegajo>(
          `/inscripcion/${encodeURIComponent(id)}/documentos`,
          token,
        );

        if (activo) {
          setDocumentacion(resultado);
        }
      } catch (err) {
        if (activo) {
          setErrorDocumentacion(
            err instanceof Error
              ? err.message
              : "No se pudo consultar la documentación.",
          );
        }
      } finally {
        if (activo) {
          setCargandoDocumentacion(false);
        }
      }
    }

    void cargarLegajo();
    void cargarDocumentacion();

    return () => {
      activo = false;
    };
  }, [id, token]);

  const actualizarEstado = useCallback((estado: string) => {
    setLegajo((actual) => {
      if (!actual || actual.estado === estado) {
        return actual;
      }

      return { ...actual, estado };
    });
  }, []);

  const documentos = documentacion?.documentos ?? [];

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
        <p role="status">Cargando información del legajo…</p>
      )}

      {error && (
        <p
          role="alert"
          className="conduccion-mensaje conduccion-mensaje-error"
        >
          {error}
        </p>
      )}

      {!cargando && !error && legajo && (
        <>
          <section
            className="conduccion-resumen"
            aria-label="Resumen del legajo"
          >
            <div className="conduccion-resumen-superior">
              <div>
                <h2 className="conduccion-nombre">
                  {legajo.nombre} {legajo.apellido}
                </h2>
                <p className="conduccion-subtitulo">
                  {legajo.carrera_elegida}
                </p>
                <p>
                  Seguimiento:{" "}
                  {mostrarDato(legajo.numero_seguimiento)}
                </p>
              </div>

              <span
                className={`conduccion-estado ${claseEstado(legajo.estado)}`}
              >
                {legajo.estado.replaceAll("_", " ")}
              </span>
            </div>
          </section>

          <div className="conduccion-grid">
            <section className="conduccion-tarjeta">
              <header className="conduccion-tarjeta-encabezado">
                <h2>Datos personales</h2>
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

            <section className="conduccion-tarjeta">
              <header className="conduccion-tarjeta-encabezado">
                <h2>Información de contacto</h2>
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

            <section className="conduccion-tarjeta">
              <header className="conduccion-tarjeta-encabezado">
                <h2>Domicilio</h2>
              </header>
              <div className="conduccion-tarjeta-cuerpo">
                <dl className="conduccion-datos">
                  <Campo etiqueta="País" valor={legajo.pais} />
                  <Campo etiqueta="Provincia" valor={legajo.provincia} />
                  <Campo etiqueta="Ciudad" valor={legajo.ciudad} />
                  <Campo etiqueta="Dirección" valor={legajo.domicilio} />
                </dl>
              </div>
            </section>

            <section className="conduccion-tarjeta">
              <header className="conduccion-tarjeta-encabezado">
                <h2>Formación académica previa</h2>
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

          <section className="conduccion-tarjeta">
            <header className="conduccion-tarjeta-encabezado">
              <h2>Documentos registrados</h2>
            </header>

            <div className="conduccion-tarjeta-cuerpo">
              {cargandoDocumentacion && (
                <p role="status">Cargando documentación…</p>
              )}

              {errorDocumentacion && (
                <p role="alert">{errorDocumentacion}</p>
              )}

              {!cargandoDocumentacion && !errorDocumentacion && (
                documentos.length === 0 ? (
                  <p>No hay documentos registrados para este legajo.</p>
                ) : (
                  <ul>
                    {documentos.map((documento) => (
                      <li key={documento.id}>
                        {nombresDocumentos[documento.tipo] ??
                          documento.tipo}
                        {" — "}
                        {mostrarFecha(documento.fecha)}
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          </section>

          <GestionInscripcion
            legajoId={legajo.id}
            onEstadoActualizado={actualizarEstado}
          />
        </>
      )}
    </section>
  );
}

export default function DetalleLegajoPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  if (!id || !user?.token) {
    return (
      <p role="alert">
        No se pudo identificar el legajo o la sesión.
      </p>
    );
  }

  return (
    <ContenidoDetalle
      key={`${id}:${user.token}`}
      id={id}
      token={user.token}
    />
  );
}