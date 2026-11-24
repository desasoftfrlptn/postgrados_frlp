import { mostrarEstadoLegajo } from "../../../../shared/utils/estadosLegajo";
import "./GestionInscripcion.css";
import ConfirmacionModal from "../../../../shared/componentes/ConfirmacionModal/ConfirmacionModal";
import MensajeSistema from "../../../../shared/componentes/MensajeSistema/MensajeSistema";
import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";

interface Gestion {
  legajo_id: string;
  estado: string;
  numero_legajo: string | null;
  datos_verificados: boolean;
  tiene_titulo_posgrado: boolean | null;
  fecha_aprobacion: string | null;
  fecha_matricula: string | null;
  fecha_baja: string | null;
  observaciones: string | null;
  documentacion_a_corregir: string[];
}

interface CompletitudGestion {
  porcentaje: number;
  documentos_requeridos: number;
  documentos_presentados: number;
  documentos_faltantes: string[];
  completo: boolean;
}

interface RespuestaCompletitud {
  legajo_id: string;
  completitud: CompletitudGestion | null;
  pendiente: string | null;
}

interface Evento {
  id: string;
  actor_id: string | null;
  actor_rol: string;
  accion: string;
  comentario: string | null;
  fecha: string;
}

type Accion =
  | "REVISAR"
  | "OBSERVAR"
  | "APROBAR"
  | "RECHAZAR"
  | "MATRICULAR"
  | "DAR_BAJA";

const accionesPorEstado: Record<
  string,
  { accion: Accion; texto: string }[]
> = {
  BAJA: [{ accion: "REVISAR", texto: "Reabrir revisión" }],
  PENDIENTE: [
    { accion: "REVISAR", texto: "Iniciar revisión" },
  ],
  EN_REVISION: [
    { accion: "OBSERVAR", texto: "Solicitar correcciones" },
    { accion: "APROBAR", texto: "Aprobar inscripción" },
    { accion: "RECHAZAR", texto: "Rechazar inscripción" },
  ],
  OBSERVADO: [{ accion: "REVISAR", texto: "Reabrir revisión" }],
  RECHAZADO: [{ accion: "REVISAR", texto: "Reabrir revisión" }],
  VENCIDO: [{ accion: "REVISAR", texto: "Reabrir revisión" }],
  COMPLETADO: [
    { accion: "MATRICULAR", texto: "Autorizar matrícula" },
    { accion: "REVISAR", texto: "Reabrir revisión" },
  ],
  ACTIVO: [
    { accion: "DAR_BAJA", texto: "Dar de baja" },
  ],
  EN_RIESGO: [
    { accion: "DAR_BAJA", texto: "Dar de baja" },
  ],
};

for (const estado of ["PENDIENTE", "EN_REVISION", "OBSERVADO", "COMPLETADO", "RECHAZADO", "VENCIDO"]) {
  accionesPorEstado[estado].push({ accion: "DAR_BAJA", texto: "Dar de baja" });
}

const documentosDisponibles = [
  { valor: "FORMULARIO_PREINSCRIPCION", texto: "Formulario de preinscripción" },
  { valor: "FORMULARIO_INSCRIPCION", texto: "Formulario de inscripción" },
  { valor: "DNI_PASAPORTE", texto: "DNI o pasaporte" },
  { valor: "PARTIDA_NACIMIENTO", texto: "Partida de nacimiento" },
  { valor: "CONSTANCIA_CUIT_CUIL", texto: "Constancia CUIT/CUIL" },
  { valor: "TITULO_GRADO", texto: "Título de grado" },
  { valor: "TITULO_POSGRADO", texto: "Título de posgrado" },
  { valor: "FORMULARIO_BECA", texto: "Formulario de beca" },
];

interface Props {
  legajoId: string;
  onEstadoActualizado?: (estado: string) => void;
  onDocumentacionActualizada?: () => void;
  onEliminado?: () => void;
}

function mensajeError(error: unknown, alternativa: string) {
  return error instanceof Error ? error.message : alternativa;
}

export default function GestionInscripcion({
  legajoId,
  onEstadoActualizado,
  onDocumentacionActualizada,
  onEliminado,
}: Props) {
  const { user } = useAuth();
  const token = user?.token;

  const [gestion, setGestion] = useState<Gestion | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [documentacion, setDocumentacion] =
    useState<RespuestaCompletitud | null>(null);
  const [datosVerificados, setDatosVerificados] = useState(false);
  const [tituloPosgrado, setTituloPosgrado] = useState("");
  const [comentario, setComentario] = useState("");
  const [documentacionACorregir, setDocumentacionACorregir] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [consultaValida, setConsultaValida] = useState(false);

  const [accionPendiente, setAccionPendiente] =
    useState<Accion | "VERIFICAR" | "ELIMINAR" | null>(null);

  const solicitudActual = useRef(0);
  const operacionEnCurso = useRef(false);

  const base = `/conduccion/legajos/${encodeURIComponent(legajoId)}`;

  const cargar = useCallback(async (): Promise<boolean> => {
    const solicitud = ++solicitudActual.current;

    setConsultaValida(false);
    setDocumentacion(null);

    if (!token) {
      setGestion(null);
      setEventos([]);
      setCargando(false);
      return false;
    }

    setCargando(true);
    setError("");

    try {
      const [datos, historial, requisitos] = await Promise.all([
        api.get<Gestion>(`${base}/gestion`, token),
        api.get<Evento[]>(`${base}/auditoria`, token),
        api.get<RespuestaCompletitud>(`${base}/completitud`, token),
      ]);

      if (solicitud !== solicitudActual.current) {
        return false;
      }

      setGestion(datos);
      setEventos(historial);
      setDocumentacion(requisitos);
      setDatosVerificados(datos.datos_verificados);
      setTituloPosgrado(
        datos.tiene_titulo_posgrado === null
          ? ""
          : datos.tiene_titulo_posgrado
            ? "si"
            : "no",
      );
      setConsultaValida(true);
      onEstadoActualizado?.(datos.estado);

      return true;
    } catch (err) {
      if (solicitud === solicitudActual.current) {
        setError(
          mensajeError(err, "No se pudo consultar la gestión del legajo."),
        );
      }

      return false;
    } finally {
      if (solicitud === solicitudActual.current) {
        setCargando(false);
      }
    }
  }, [base, token, onEstadoActualizado]);

  useEffect(() => {
    // Programar la consulta permite cancelar el inicio al desmontar la vista.
    const inicio = window.setTimeout(() => void cargar(), 0);

    return () => {
      window.clearTimeout(inicio);
      solicitudActual.current += 1;
    };
  }, [cargar]);

  async function manejarErrorOperacion(
    err: unknown,
    alternativa: string,
  ) {
    if (
      err instanceof Error &&
      "status" in err &&
      err.status === 409
    ) {
      setConsultaValida(false);

      const actualizado = await cargar();

      onDocumentacionActualizada?.();

      setError(
        actualizado
          ? `${err.message} Revisá los datos actualizados antes de continuar.`
          : `${err.message} No se pudo actualizar el legajo. Utilizá Actualizar gestión.`,
      );

      return;
    }

    setError(mensajeError(err, alternativa));
  }

  async function guardarVerificacion() {
    if (
      !token ||
      tituloPosgrado === "" ||
      !consultaValida ||
      operacionEnCurso.current
    ) {
      return;
    }

    operacionEnCurso.current = true;
    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const resultado = await api.put<Gestion>(
        `${base}/verificacion`,
        {
          datos_verificados: datosVerificados,
          tiene_titulo_posgrado: tituloPosgrado === "si",
        },
        token,
      );

      setGestion(resultado);
      onEstadoActualizado?.(resultado.estado);
      onDocumentacionActualizada?.();

      const actualizado = await cargar();

      setMensaje(
        actualizado
          ? "Verificación guardada."
          : "Verificación guardada. Actualizá la gestión para consultar los datos.",
      );
    } catch (err) {
      await manejarErrorOperacion(
        err,
        "No se pudo guardar la verificación.",
      );
    } finally {
      operacionEnCurso.current = false;
      setGuardando(false);
    }
  }

  async function ejecutarAccion(accion: Accion) {
    if (
      !token ||
      !gestion ||
      !consultaValida ||
      operacionEnCurso.current
    ) {
      return;
    }

    if (
      accion === "OBSERVAR" &&
      !comentario.trim() &&
      documentacionACorregir.length === 0
    ) {
      setError(
        "Escribí una observación o seleccioná al menos un documento para corregir."
      );
      return;
    }


    operacionEnCurso.current = true;
    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const resultado = await api.post<Gestion>(
        `${base}/acciones`,
        {
          accion,
          estado_esperado: gestion.estado,
          comentario: comentario.trim() || null,
          documentacion_a_corregir:
            accion === "OBSERVAR" ? documentacionACorregir : [],
        },
        token,
      );

      setGestion(resultado);
      onEstadoActualizado?.(resultado.estado);
      onDocumentacionActualizada?.();
      setComentario("");
      setDocumentacionACorregir([]);

      const actualizado = await cargar();

      setMensaje(
        actualizado
          ? "Operación registrada."
          : "Operación registrada. Actualizá la gestión para consultar los datos.",
      );
    } catch (err) {
      await manejarErrorOperacion(
        err,
        "No se pudo realizar la operación.",
      );
    } finally {
      operacionEnCurso.current = false;
      setGuardando(false);
    }
  }

  function requisitosAprobacionCumplidos() {
    return (
      consultaValida &&
      gestion?.datos_verificados === true &&
      gestion.tiene_titulo_posgrado != null &&
      documentacion?.completitud?.completo === true &&
      datosVerificados === gestion.datos_verificados &&
      tituloPosgrado === (
        gestion.tiene_titulo_posgrado ? "si" : "no"
      )
    );
  }

  function solicitarAccion(accion: Accion) {
    if (
      (accion === "RECHAZAR" || accion === "DAR_BAJA") &&
      !comentario.trim()
    ) {
      setMensaje("");
      setError(
        accion === "RECHAZAR"
          ? "Indicá el motivo del rechazo."
          : "Indicá el motivo de la baja.",
      );
      return;
    }

    if (comentario.trim().length > 4000) {
      setMensaje("");
      setError(
        "El comentario no puede superar los 4000 caracteres.",
      );
      return;
    }

    if (
      accion === "APROBAR" &&
      !requisitosAprobacionCumplidos()
    ) {
      setMensaje("");
      setError(
        "Completá y guardá los requisitos antes de aprobar."
      );
      return;
    }

    if (operacionEnCurso.current || !consultaValida) return;

    setError("");
    setMensaje("");

    if (
      accion === "OBSERVAR" &&
      !comentario.trim() &&
      documentacionACorregir.length === 0
    ) {
      setError(
        "Escribí una observación o seleccioná un documento para corregir."
      );
      return;
    }

    setAccionPendiente(accion);
  }

  async function confirmarOperacion() {
    if (!accionPendiente || operacionEnCurso.current) return;

    try {
      if (accionPendiente === "ELIMINAR") {
        if (!token || !consultaValida) return;
        operacionEnCurso.current = true;
        setGuardando(true);
        try { await api.delete(base, token); onEliminado?.(); }
        catch (err) { setError(mensajeError(err, "No se pudo eliminar la inscripción.")); }
        finally { operacionEnCurso.current = false; setGuardando(false); }
      } else if (accionPendiente === "VERIFICAR") {
        await guardarVerificacion();
      } else {
        await ejecutarAccion(accionPendiente);
      }
    } finally {
      setAccionPendiente(null);
    }
  }

  if (!token) {
    return <p>Iniciá sesión para consultar el legajo.</p>;
  }

  if (cargando && !gestion) {
    return <p role="status">Cargando gestión del legajo…</p>;
  }

  const bloqueado = guardando || cargando || !consultaValida;

  const titulosConfirmacion = {
    ELIMINAR: "¿Eliminar aspirante?",
    VERIFICAR: "¿Guardar verificación?",
    REVISAR: "¿Iniciar revisión?",
    OBSERVAR: "¿Solicitar correcciones?",
    APROBAR: "¿Aprobar inscripción?",
    RECHAZAR: "¿Rechazar inscripción?",
    MATRICULAR: "¿Autorizar matrícula?",
    DAR_BAJA: "¿Dar de baja el legajo?",
  };

  const descripcionesConfirmacion = {
    ELIMINAR: "Se eliminará la inscripción. Esta acción no se puede deshacer.",
    VERIFICAR: "Se guardarán los datos de verificación del legajo.",
    REVISAR: "La inscripción pasará a estar en revisión.",
    OBSERVAR: "Se registrarán las correcciones solicitadas al aspirante.",
    APROBAR: "Se aprobará la solicitud de inscripción.",
    RECHAZAR: "La inscripción será rechazada.",
    MATRICULAR: "Se autorizará la matrícula del aspirante.",
    DAR_BAJA: "Se registrará la baja del legajo.",
  };


  const puedeVerificar = gestion
    ? ["PENDIENTE", "EN_REVISION", "OBSERVADO"].includes(gestion.estado)
    : false;

  return (
    <section
      className="conduccion-tarjeta gestion-inscripcion"
      aria-label="Gestión de la inscripción"
    >
      <header className="conduccion-tarjeta-encabezado">
        <h2>Gestión de la inscripción</h2>
      </header>

      <div className="conduccion-tarjeta-cuerpo">
        {error && (
          <MensajeSistema
            tipo="error"
            texto={error}
            alCerrar={() => setError("")}
          />
        )}
        {mensaje && (
          <MensajeSistema
            tipo="exito"
            texto={mensaje}
            alCerrar={() => setMensaje("")}
          />
        )}

        <button
          type="button"
          disabled={cargando || guardando}
          onClick={() => {
            setMensaje("");
            onDocumentacionActualizada?.();
            void cargar();
          }}
        >
          Actualizar gestión
        </button>

        {gestion && (
          <>
            <div className="gestion-resumen">
              <div className="gestion-resumen-item">
                <span>Estado de la inscripción</span>
                <strong className="gestion-estado">
                  {mostrarEstadoLegajo(gestion.estado)}
                </strong>
              </div>

              <div className="gestion-resumen-item">
                <span>Número de legajo</span>
                <strong>
                  {gestion.numero_legajo ?? "Todavía no asignado"}
                </strong>
              </div>
            </div>

            {gestion.observaciones && (
              <aside className="gestion-observacion-previa">
                <h3>Últimas observaciones</h3>
                <p>{gestion.observaciones}</p>
              </aside>
            )}

            {gestion.documentacion_a_corregir?.length > 0 && (
              <section
                className="gestion-documentos-observados"
                aria-label="Documentos observados"
              >
                <h3>Documentos pendientes de corrección</h3>
                <p>
                  Documentación que se solicitó corregir al aspirante.
                </p>

                <ul>
                  {gestion.documentacion_a_corregir.map((tipo) => (
                    <li key={tipo}>
                      {documentosDisponibles.find(
                        (documento) => documento.valor === tipo
                      )?.texto ?? tipo.replaceAll("_", " ")}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <form className="gestion-formulario-unificado" aria-label="Revisión y resolución del legajo" onSubmit={(event) => event.preventDefault()}>
              <h3>Revisión y resolución del legajo</h3>
            {puedeVerificar && (
              <fieldset
                className="gestion-verificacion"
                disabled={bloqueado}
              >
                <legend>Verificación del legajo</legend>

                <p className="gestion-ayuda">
                  Revisá los datos y guardá la verificación para calcular los requisitos de aprobación.
                </p>

                <div className="gestion-campo">
                  <label className="gestion-checkbox">
                    <input
                      type="checkbox"
                      checked={datosVerificados}
                      onChange={(event) =>
                        setDatosVerificados(event.target.checked)
                      }
                    />
                    <span>
                      Revisé los datos personales y académicos
                      <small>
                        Confirmá que la información del aspirante sea correcta.
                      </small>
                    </span>
                  </label>
                </div>

                <div className="gestion-campo">
                  <label htmlFor="titulo-posgrado">
                    ¿Tiene título de posgrado?
                    <span className="gestion-obligatorio">Obligatorio</span>
                  </label>

                  <select
                    id="titulo-posgrado"
                    className={
                      tituloPosgrado === ""
                        ? "gestion-input gestion-input-pendiente"
                        : "gestion-input"
                    }
                    value={tituloPosgrado}
                    onChange={(event) => setTituloPosgrado(event.target.value)}
                    required
                  >
                    <option value="">Seleccionar una opción</option>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>

                  {tituloPosgrado === "" && (
                    <small className="gestion-campo-ayuda">
                      Seleccioná Sí o No para completar este campo.
                    </small>
                  )}
                </div>

              </fieldset>
            )}

            {(accionesPorEstado[gestion.estado] ?? []).some(a => ["OBSERVAR", "RECHAZAR", "DAR_BAJA"].includes(a.accion)) && (
            <div className="gestion-observaciones">
              <label htmlFor="observaciones-inscripcion">
                Observaciones para el aspirante
              </label>

              <p className="gestion-observaciones-ayuda">
                Explicá qué debe corregir o completar el aspirante.
                También podés seleccionar los documentos que debe modificar.
              </p>

              <textarea
                id="observaciones-inscripcion"

                maxLength={4000}
                value={comentario}

                disabled={bloqueado}
                placeholder="Escribí aquí las observaciones..."
                onChange={(event) => setComentario(event.target.value)}
              />

              <small>
                Estas observaciones serán visibles para el aspirante.
              </small>
            </div>

            )}

            {gestion.estado === "EN_REVISION" && (
              <fieldset
                className="gestion-documentacion"
                disabled={bloqueado}
              >
                <legend>Documentación que debe corregir el aspirante</legend>

                <div className="gestion-documentos-grid">
                  {documentosDisponibles.map((documento) => (
                    <label
                      key={documento.valor}
                      className="gestion-documento-opcion"
                    >
                      <input
                        type="checkbox"
                        checked={documentacionACorregir.includes(documento.valor)}
                        onChange={(event) => {
                          setDocumentacionACorregir((actuales) =>
                            event.target.checked
                              ? [...actuales, documento.valor]
                              : actuales.filter(
                                  (valor) => valor !== documento.valor
                                )
                          );
                        }}
                      />
                      <span>{documento.texto}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <section
              className="gestion-resolucion"
              aria-label="Resolución de la inscripción"
            >
              <h4>Resolución de la inscripción</h4>
              <p className="gestion-ayuda">
                Seleccioná una operación disponible según el estado actual.
              </p>

              {(accionesPorEstado[gestion.estado] ?? []).length === 0 && (
                <p className="gestion-ayuda">
                  No hay cambios de estado disponibles.
                </p>
              )}

              {gestion.estado === "EN_REVISION" && (
                <section
                  className="gestion-requisitos"
                  aria-label="Requisitos de aprobación"
                >
                  <h4>Requisitos para aprobar</h4>

                  <ul className="gestion-requisitos-lista">
                    <li data-completo={gestion.datos_verificados}>
                      Datos personales y académicos:
                      {" "}
                      {gestion.datos_verificados
                        ? "Verificados"
                        : "Pendientes"}
                    </li>

                    <li data-completo={gestion.tiene_titulo_posgrado != null}>
                      Información del título previo:
                      {" "}
                      {gestion.tiene_titulo_posgrado != null
                        ? "Registrada"
                        : "Pendiente"}
                    </li>

                    <li data-completo={
                      documentacion?.completitud?.completo === true
                    }>
                      Documentación:
                      {" "}
                      {documentacion?.completitud?.completo
                        ? "Completa"
                        : "Pendiente"}
                    </li>
                  </ul>

                  {documentacion?.completitud ? (
                    <>
                      <p>
                        {documentacion.completitud.documentos_presentados}
                        {" de "}
                        {documentacion.completitud.documentos_requeridos}
                        {" documentos requeridos"}
                      </p>

                      <progress
                        max={100}
                        value={documentacion.completitud.porcentaje}
                        aria-label="Completitud documental"
                      />

                      <p>
                        {documentacion.completitud.porcentaje}%
                      </p>

                      {documentacion.completitud.documentos_faltantes.length > 0 && (
                        <>
                          <h5>Documentos faltantes</h5>
                          <ul>
                            {documentacion.completitud.documentos_faltantes.map(
                              (documento) => (
                                <li key={documento}>{documento}</li>
                              )
                            )}
                          </ul>
                        </>
                      )}
                    </>
                  ) : (
                    <p className="gestion-ayuda">
                      {documentacion?.pendiente ??
                        "No se pudo determinar la completitud documental."}
                    </p>
                  )}

                  {!requisitosAprobacionCumplidos() && (
                    <p className="gestion-ayuda">
                      Completá y guardá los requisitos pendientes
                      para habilitar la aprobación.
                    </p>
                  )}
                </section>
              )}

              <div className="gestion-acciones">
              {puedeVerificar && (
                <button type="button" className="gestion-boton-guardar"
                  disabled={bloqueado || tituloPosgrado === ""}
                  onClick={() => setAccionPendiente("VERIFICAR")}>
                  Guardar verificación
                </button>
              )}
              {(accionesPorEstado[gestion.estado] ?? []).map(
                ({ accion, texto }) => (
                  <button
                    key={accion}
                    type="button"
                    className={
                      `gestion-accion gestion-accion--${accion.toLowerCase()}`
                    }
                    disabled={
                      bloqueado ||
                      (accion === "APROBAR" &&
                        !requisitosAprobacionCumplidos())
                    }
                    onClick={() => solicitarAccion(accion)}
                  >
                    {texto}
                  </button>
                ),
              )}
              {onEliminado && (!gestion.fecha_matricula || gestion.estado === "BAJA") && ["PENDIENTE", "EN_REVISION", "OBSERVADO", "COMPLETADO", "RECHAZADO", "VENCIDO", "BAJA"].includes(gestion.estado) && <button type="button" className="gestion-accion gestion-accion--dar_baja" disabled={bloqueado} onClick={() => setAccionPendiente("ELIMINAR")}>Eliminar aspirante</button>}
            </div>

            </section>
            </form>

            <details className="gestion-historial">
              <summary>Historial de operaciones ({eventos.length})</summary>

            {eventos.length === 0 ? (
              <p>No hay operaciones registradas.</p>
            ) : (
              <ol className="gestion-historial-lista">
                {eventos.map((evento) => (
                  <li key={evento.id}>
                    <strong>
                      {({
                        REVISAR: "Inicio de revisión",
                        VERIFICAR_DATOS: "Verificación de datos",
                        OBSERVAR: "Correcciones solicitadas",
                        APROBAR: "Inscripción aprobada",
                        RECHAZAR: "Inscripción rechazada",
                        MATRICULAR: "Matrícula autorizada",
                        DAR_BAJA: "Baja registrada",
                      } as Record<string, string>)[evento.accion]
                        ?? evento.accion.replaceAll("_", " ")}
                    </strong>
                    {" — "}
                    {new Date(evento.fecha).toLocaleString("es-AR")}
                    {" — "}
                    {evento.actor_rol}
                    {evento.comentario && <p>{evento.comentario}</p>}
                  </li>
                ))}
              </ol>
            )}
            </details>
          </>
        )}
      </div>
      {accionPendiente && (
        <ConfirmacionModal
          abierto
          titulo={titulosConfirmacion[accionPendiente]}
          descripcion={descripcionesConfirmacion[accionPendiente]}
          textoConfirmar="Confirmar"
          textoCancelar="Cancelar"
          confirmando={guardando}
          peligroso={
            accionPendiente === "ELIMINAR" || accionPendiente === "RECHAZAR" ||
            accionPendiente === "DAR_BAJA"
          }
          alConfirmar={confirmarOperacion}
          alCancelar={() => setAccionPendiente(null)}
        />
      )}
    </section>
  );
}
