import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";
import GestionInscripcion from "../componentes/GestionInscripcion";
import "../estilos/Conduccion.css";

interface LegajoDetalle {
  id: string;
  cohorte_id: string | null;
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
  numero_seguimiento: string;
  forma_conocio_ofertas: string;
  motivos_cursar: string;
  solicitud_beca: number | null;
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

type AccionDocumento = "ver" | "descargar";

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
    case "APROBADO":
      return "conduccion-estado-completado";
    case "RECHAZADO":
    case "BAJA":
      return "conduccion-estado-rechazado";
    default:
      return "conduccion-estado-otro";
  }
}

function Campo({ etiqueta, valor }: { etiqueta: string; valor: string | null | undefined }) {
  return (
    <div className="conduccion-campo">
      <dt>{etiqueta}</dt>
      <dd>{mostrarDato(valor)}</dd>
    </div>
  );
}

function ContenidoDetalle({ id, token }: { id: string; token: string }) {
  const [legajo, setLegajo] = useState<LegajoDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [documentacion, setDocumentacion] = useState<DocumentacionLegajo | null>(null);
  const [cargandoDocumentacion, setCargandoDocumentacion] = useState(true);
  const [errorDocumentacion, setErrorDocumentacion] = useState("");
  const [errorArchivo, setErrorArchivo] = useState("");
  const [operacionDocumento, setOperacionDocumento] = useState<{
    id: string;
    accion: AccionDocumento;
  } | null>(null);

  useEffect(() => {
    let activo = true;

    async function cargarLegajo() {
      try {
        const resultado = await api.get<LegajoDetalle>(
          `/inscripcion/${encodeURIComponent(id)}`,
          token,
        );
        if (activo) setLegajo(resultado);
      } catch (err) {
        if (activo) {
          setError(err instanceof Error ? err.message : "No se pudo consultar el legajo.");
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    async function cargarDocumentacion() {
      try {
        const resultado = await api.get<DocumentacionLegajo>(
          `/inscripcion/${encodeURIComponent(id)}/documentos`,
          token,
        );
        if (activo) setDocumentacion(resultado);
      } catch (err) {
        if (activo) {
          setErrorDocumentacion(
            err instanceof Error ? err.message : "No se pudo consultar la documentación.",
          );
        }
      } finally {
        if (activo) setCargandoDocumentacion(false);
      }
    }

    void cargarLegajo();
    void cargarDocumentacion();
    return () => { activo = false; };
  }, [id, token]);

  const actualizarEstado = useCallback((estado: string) => {
    setLegajo((actual) => actual ? { ...actual, estado } : actual);
  }, []);

  const descargar = async (documento: DocumentoLegajo) => {
    setOperacionDocumento({ id: documento.id, accion: "descargar" });
    setErrorArchivo("");
    try {
      const archivo = await api.descargar(
        `/documentos/${encodeURIComponent(documento.id)}/download`,
        token,
      );
      const url = URL.createObjectURL(archivo);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `${documento.tipo}.pdf`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      setErrorArchivo(err instanceof Error ? err.message : "No se pudo descargar el PDF.");
    } finally {
      setOperacionDocumento(null);
    }
  };

  const verDocumento = async (documento: DocumentoLegajo) => {
    setErrorArchivo("");
    // Abrir la pestaña durante el clic evita el bloqueo de ventanas emergentes.
    const ventana = window.open("about:blank", "_blank");
    if (!ventana) {
      setErrorArchivo("No se pudo abrir el PDF. Habilitá las ventanas emergentes o descargalo.");
      return;
    }
    ventana.opener = null;
    setOperacionDocumento({ id: documento.id, accion: "ver" });
    try {
      const archivo = await api.descargar(
        `/documentos/${encodeURIComponent(documento.id)}/download`,
        token,
      );
      const pdf = new Blob([archivo], { type: "application/pdf" });
      const url = URL.createObjectURL(pdf);
      if (ventana.closed) {
        URL.revokeObjectURL(url);
        return;
      }
      ventana.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 300000);
    } catch (err) {
      ventana.close();
      setErrorArchivo(err instanceof Error ? err.message : "No se pudo visualizar el PDF.");
    } finally {
      setOperacionDocumento(null);
    }
  };

  const documentos = documentacion?.documentos ?? [];
  const completitud = documentacion?.completitud ?? null;
  const porcentaje = completitud ? Math.max(0, Math.min(100, completitud.porcentaje)) : 0;

  return (
    <section className="perfil-pagina conduccion-detalle" aria-labelledby="titulo-detalle-legajo">
      <Link to="/dashboard/conduccion/aspirantes" className="conduccion-volver">
        <span aria-hidden="true">←</span> Volver a aspirantes
      </Link>

      <header className="conduccion-detalle-encabezado">
        <p className="conduccion-etiqueta">EQUIPO DE CONDUCCIÓN / INSCRIPCIONES</p>
        <h1 id="titulo-detalle-legajo">Detalle del legajo</h1>
        <p>Consultá los datos de la inscripción y su documentación.</p>
      </header>

      {cargando && <p role="status">Cargando información del legajo…</p>}
      {error && <p role="alert" className="conduccion-mensaje conduccion-mensaje-error">{error}</p>}

      {!cargando && !error && legajo && (
        <>
          <section className="conduccion-resumen" aria-label="Resumen del aspirante">
            <div className="conduccion-resumen-superior">
              <div>
                <p className="conduccion-resumen-etiqueta">ASPIRANTE</p>
                <h2 className="conduccion-nombre">{legajo.nombre} {legajo.apellido}</h2>
                <p className="conduccion-subtitulo">{legajo.carrera_elegida}</p>
              </div>
              <span className={`conduccion-estado ${claseEstado(legajo.estado)}`}>
                {legajo.estado.replaceAll("_", " ")}
              </span>
            </div>
            <dl className="conduccion-resumen-datos">
              <Campo etiqueta="N.º de seguimiento" valor={legajo.numero_seguimiento} />
              <Campo etiqueta="DNI / Pasaporte" valor={legajo.dni_pasaporte} />
              <Campo etiqueta="Cohorte" valor={legajo.cohorte_id} />
            </dl>
          </section>

          <div className="conduccion-grid">
            <section className="conduccion-tarjeta">
              <header className="conduccion-tarjeta-encabezado"><h2>Datos personales</h2></header>
              <dl className="conduccion-datos conduccion-tarjeta-cuerpo">
                <Campo etiqueta="Nombre" valor={legajo.nombre} />
                <Campo etiqueta="Apellido" valor={legajo.apellido} />
                <Campo etiqueta="Nacionalidad" valor={legajo.nacionalidad} />
                <Campo etiqueta="DNI / Pasaporte" valor={legajo.dni_pasaporte} />
              </dl>
            </section>

            <section className="conduccion-tarjeta">
              <header className="conduccion-tarjeta-encabezado"><h2>Contacto y domicilio</h2></header>
              <dl className="conduccion-datos conduccion-tarjeta-cuerpo">
                <Campo etiqueta="Correo electrónico" valor={legajo.correo_electronico} />
                <Campo etiqueta="Correo alternativo" valor={legajo.correo_alternativo} />
                <Campo etiqueta="Teléfono móvil" valor={legajo.telefono_movil} />
                <Campo etiqueta="Dirección" valor={legajo.domicilio} />
                <Campo etiqueta="Ciudad" valor={legajo.ciudad} />
                <Campo etiqueta="Provincia" valor={legajo.provincia} />
                <Campo etiqueta="País" valor={legajo.pais} />
              </dl>
            </section>

            <section className="conduccion-tarjeta">
              <header className="conduccion-tarjeta-encabezado"><h2>Formación académica</h2></header>
              <dl className="conduccion-datos conduccion-tarjeta-cuerpo">
                <Campo etiqueta="Título obtenido" valor={legajo.titulo_anterior} />
                <Campo etiqueta="Universidad de origen" valor={legajo.universidad_anterior} />
              </dl>
            </section>

            <section className="conduccion-tarjeta">
              <header className="conduccion-tarjeta-encabezado"><h2>Información de inscripción</h2></header>
              <dl className="conduccion-datos conduccion-tarjeta-cuerpo">
                <Campo etiqueta="Cómo conoció la oferta" valor={legajo.forma_conocio_ofertas} />
                <Campo etiqueta="Solicitud de beca" valor={legajo.solicitud_beca == null ? "No solicitó beca" : `${legajo.solicitud_beca}%`} />
                <div className="conduccion-campo conduccion-campo-ancho">
                  <dt>Motivos para cursar</dt>
                  <dd>{mostrarDato(legajo.motivos_cursar)}</dd>
                </div>
              </dl>
            </section>
          </div>

          <section className="conduccion-tarjeta conduccion-seccion-documental" aria-labelledby="titulo-documentacion">
            <header className="conduccion-tarjeta-encabezado">
              <h2 id="titulo-documentacion">Estado de la documentación</h2>
            </header>
            <div className="conduccion-tarjeta-cuerpo">
              {cargandoDocumentacion && <p role="status">Consultando documentación…</p>}
              {!cargandoDocumentacion && errorDocumentacion && <p role="alert" className="conduccion-mensaje conduccion-mensaje-error">{errorDocumentacion}</p>}
              {!cargandoDocumentacion && !errorDocumentacion && (
                completitud ? (
                  <>
                    <div className="conduccion-progreso-encabezado">
                      <p><strong>{completitud.documentos_presentados}</strong> de {completitud.documentos_requeridos} documentos presentados</p>
                      <strong>{porcentaje}%</strong>
                    </div>
                    <progress className="conduccion-progreso" value={porcentaje} max={100} aria-label="Porcentaje de documentación presentada" />
                    <p className="conduccion-ayuda">
                      {completitud.completo ? "La documentación requerida está completa." : "Hay documentación pendiente de presentación."}
                    </p>
                    {completitud.documentos_faltantes.length > 0 && (
                      <div className="conduccion-faltantes">
                        <h3>Documentos faltantes</h3>
                        <ul>
                          {completitud.documentos_faltantes.map((tipo) => (
                            <li key={tipo}>{nombresDocumentos[tipo] ?? tipo}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : <p className="conduccion-ayuda">Todavía no se puede determinar la completitud documental de este aspirante.</p>
              )}
            </div>
          </section>

          <section className="conduccion-tarjeta conduccion-seccion-documental" aria-labelledby="titulo-documentos">
            <header className="conduccion-tarjeta-encabezado"><h2 id="titulo-documentos">Documentos registrados</h2></header>
            <div className="conduccion-tarjeta-cuerpo">
              {cargandoDocumentacion && <p role="status">Cargando documentos…</p>}
              {!cargandoDocumentacion && errorDocumentacion && <p role="alert" className="conduccion-mensaje conduccion-mensaje-error">{errorDocumentacion}</p>}
              {errorArchivo && <p role="alert" className="conduccion-mensaje conduccion-mensaje-error">{errorArchivo}</p>}
              {!cargandoDocumentacion && !errorDocumentacion && (
                documentos.length === 0 ? <p className="conduccion-ayuda">No hay documentos registrados para este legajo.</p> : (
                  <ul className="conduccion-documentos">
                    {documentos.map((documento) => (
                      <li className="conduccion-documento" key={documento.id}>
                        <div className="conduccion-documento-info">
                          <strong>{nombresDocumentos[documento.tipo] ?? documento.tipo}</strong>
                          <span className="conduccion-documento-estado">Registrado el {mostrarFecha(documento.fecha)}</span>
                        </div>
                        <div className="conduccion-documento-botones">
                          <button className="conduccion-boton-secundario" type="button" disabled={operacionDocumento !== null} onClick={() => void verDocumento(documento)}>
                            {operacionDocumento?.id === documento.id && operacionDocumento.accion === "ver" ? "Abriendo…" : "Ver PDF"}
                          </button>
                          <button className="conduccion-boton-secundario" type="button" disabled={operacionDocumento !== null} onClick={() => void descargar(documento)}>
                            {operacionDocumento?.id === documento.id && operacionDocumento.accion === "descargar" ? "Descargando…" : "Descargar"}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          </section>

          <div className="conduccion-gestion">
            <GestionInscripcion legajoId={legajo.id} onEstadoActualizado={actualizarEstado} />
          </div>
        </>
      )}
    </section>
  );
}

export default function DetalleLegajoPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  if (!id || !user?.token) {
    return <p role="alert">No se pudo identificar el legajo o la sesión.</p>;
  }
  return <ContenidoDetalle key={`${id}:${user.token}`} id={id} token={user.token} />;
}

