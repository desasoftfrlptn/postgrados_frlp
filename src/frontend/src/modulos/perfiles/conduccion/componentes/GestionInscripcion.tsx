
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
}

interface Completitud {
  legajo_id: string;
  completitud: {
    porcentaje: number;
    documentos_requeridos: number;
    documentos_presentados: number;
    documentos_faltantes: string[];
    completo: boolean;
  } | null;
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

interface Props {
  legajoId: string;
  onEstadoActualizado?: (estado: string) => void;
}

const accionesPorEstado: Record<
  string,
  { accion: Accion; texto: string }[]
> = {
  PENDIENTE: [
    { accion: "REVISAR", texto: "Iniciar revisión" },
  ],
  EN_REVISION: [
    { accion: "OBSERVAR", texto: "Solicitar correcciones" },
    { accion: "APROBAR", texto: "Marcar como listo" },
    { accion: "RECHAZAR", texto: "Rechazar inscripción" },
  ],
  COMPLETADO: [
    { accion: "MATRICULAR", texto: "Autorizar matrícula" },
  ],
  ACTIVO: [
    { accion: "DAR_BAJA", texto: "Dar de baja" },
  ],
  EN_RIESGO: [
    { accion: "DAR_BAJA", texto: "Dar de baja" },
  ],
};

const nombresEstados: Record<string, string> = {
  BORRADOR: "Borrador",
  PENDIENTE: "Pendiente",
  EN_REVISION: "En revisión",
  OBSERVADO: "Observado",
  COMPLETADO: "Listo",
  RECHAZADO: "Rechazado",
  ACTIVO: "Activo",
  EN_RIESGO: "En riesgo",
  VENCIDO: "Vencido",
  GRADUADO: "Graduado",
  BAJA: "Baja",
};

const nombresDocumentos: Record<string, string> = {
  FORMULARIO_PREINSCRIPCION: "Formulario de preinscripción",
  FORMULARIO_INSCRIPCION: "Formulario de inscripción",
  DNI_PASAPORTE: "DNI o pasaporte",
  PARTIDA_NACIMIENTO: "Partida de nacimiento",
  CONSTANCIA_CUIT_CUIL: "Constancia CUIT/CUIL",
  TITULO_GRADO: "Título de grado",
  TITULO_POSGRADO: "Título de posgrado",
  FORMULARIO_BECA: "Formulario de beca",
};

function mostrarEstado(estado: string): string {
  return nombresEstados[estado] ?? estado.replaceAll("_", " ");
}

function mostrarFecha(fecha: string): string {
  const valor = new Date(fecha);

  return Number.isNaN(valor.getTime())
    ? "Fecha no disponible"
    : valor.toLocaleString("es-AR");
}

function mensajeError(error: unknown, alternativa: string): string {
  return error instanceof Error ? error.message : alternativa;
}

export default function GestionInscripcion({
  legajoId,
  onEstadoActualizado,
}: Props) {
  const { user } = useAuth();
  const token = user?.token;

  const [gestion, setGestion] = useState<Gestion | null>(null);
  const [completitud, setCompletitud] = useState<Completitud | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);

  const [datosVerificados, setDatosVerificados] = useState(false);
  const [tituloPosgrado, setTituloPosgrado] = useState("");
  const [comentario, setComentario] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [consultaValida, setConsultaValida] = useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const solicitudActual = useRef(0);
  const operacionEnCurso = useRef(false);

  const base = `/conduccion/legajos/${encodeURIComponent(legajoId)}`;

  // Consultar la gestión una vez al abrir el componente
  // o cuando cambia el legajo o la sesión.
  const cargar = useCallback(async (): Promise<boolean> => {
    const solicitud = ++solicitudActual.current;

    if (!token) {
      setGestion(null);
      setCompletitud(null);
      setEventos([]);
      setConsultaValida(false);
      setCargando(false);
      return false;
    }

    setCargando(true);
    setConsultaValida(false);
    setError("");

    try {
      const [datos, documentos, historial] = await Promise.all([
        api.get<Gestion>(`${base}/gestion`, token),
        api.get<Completitud>(`${base}/completitud`, token),
        api.get<Evento[]>(`${base}/auditoria`, token),
      ]);

      if (solicitud !== solicitudActual.current) {
        return false;
      }

      setGestion(datos);
      setCompletitud(documentos);
      setEventos(historial);

      setDatosVerificados(datos.datos_verificados);

      setTituloPosgrado(
        datos.tiene_titulo_posgrado === null
          ? ""
          : datos.tiene_titulo_posgrado
            ? "si"
            : "no"
      );

      setConsultaValida(true);
      return true;
    } catch (err) {
      if (solicitud === solicitudActual.current) {
        setError(
          mensajeError(
            err,
            "No se pudo consultar la gestión del legajo."
          )
        );
      }

      return false;
    } finally {
      if (solicitud === solicitudActual.current) {
        setCargando(false);
      }
    }
  }, [base, token]);

  useEffect(() => {
    const inicio = window.setTimeout(() => {
      void cargar();
    }, 0);

    return () => {
      window.clearTimeout(inicio);
      solicitudActual.current += 1;
    };
  }, [cargar]);

  async function guardarVerificacion() {
    if (
      !token ||
      !gestion ||
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
        token
      );

      setGestion(resultado);

      const actualizado = await cargar();

      setMensaje(
        actualizado
          ? "La verificación se guardó correctamente."
          : "Verificación guardada. Actualizá para consultar los datos."
      );
    } catch (err) {
      setError(
        mensajeError(
          err,
          "No se pudo guardar la verificación."
        )
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

    const comentarioLimpio = comentario.trim();

    if (accion === "OBSERVAR" && !comentarioLimpio) {
      setError("Indicá qué documentación o dato debe corregirse.");
      return;
    }

    if (
      accion === "APROBAR" &&
      !gestion.datos_verificados
    ) {
      setError(
        "Primero tenés que verificar y guardar los datos del legajo."
      );
      return;
    }

    if (
      accion === "APROBAR" &&
      !completitud?.completitud?.completo
    ) {
      setError(
        "No se puede marcar como listo un legajo con documentación incompleta."
      );
      return;
    }

    const textoAccion =
      accionesPorEstado[gestion.estado]?.find(
        (item) => item.accion === accion
      )?.texto ?? accion;

    const confirmado = window.confirm(
      `¿Confirmás la acción "${textoAccion}" para este legajo?`
    );

    if (!confirmado) return;

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
          comentario: comentarioLimpio || null,
        },
        token
      );

      setGestion(resultado);
      setComentario("");

      // Notificar al detalle/listado solamente cuando
      // el backend confirmó la operación.
      onEstadoActualizado?.(resultado.estado);

      const actualizado = await cargar();

      setMensaje(
        actualizado
          ? `Operación registrada. Estado actual: ${mostrarEstado(
              resultado.estado
            )}.`
          : "Operación registrada. Actualizá para consultar los datos."
      );
    } catch (err) {
      setError(
        mensajeError(
          err,
          "No se pudo modificar el estado del legajo."
        )
      );
    } finally {
      operacionEnCurso.current = false;
      setGuardando(false);
    }
  }

  if (!token) {
    return (
      <p role="alert">
        Iniciá sesión para gestionar el legajo.
      </p>
    );
  }

  if (cargando && !gestion) {
    return (
      <p role="status">
        Cargando gestión del legajo…
      </p>
    );
  }

  const bloqueado =
    cargando || guardando || !consultaValida;

  const puedeVerificar = gestion
    ? ["PENDIENTE", "EN_REVISION", "OBSERVADO"].includes(
        gestion.estado
      )
    : false;

  const acciones = gestion
    ? accionesPorEstado[gestion.estado] ?? []
    : [];

  const documentacion = completitud?.completitud;

  const cambiosVerificacion = gestion
    ? datosVerificados !== gestion.datos_verificados ||
      tituloPosgrado !== (
        gestion.tiene_titulo_posgrado === null
          ? ""
          : gestion.tiene_titulo_posgrado
            ? "si"
            : "no"
      )
    : false;

  return (
    <section
      className="conduccion-gestion-contenido"
      aria-label="Gestión de inscripción"
    >
      <header className="conduccion-gestion-titulo">
        <div>
          <h2>Revisión y estado del legajo</h2>
          <p>
            Verificá la información y registrá una decisión.
          </p>
        </div>

        <button
          type="button"
          className="conduccion-gestion-actualizar"
          disabled={cargando || guardando}
          onClick={() => {
            setMensaje("");
            void cargar();
          }}
        >
          Actualizar
        </button>
      </header>

      {error && (
        <p
          className="conduccion-mensaje conduccion-mensaje-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {mensaje && (
        <p
          className="conduccion-mensaje conduccion-mensaje-exito"
          role="status"
        >
          {mensaje}
        </p>
      )}

      {gestion && (
        <>
          <section className="conduccion-gestion-resumen">
            <div>
              <span className="conduccion-gestion-etiqueta">
                Estado actual
              </span>

              <strong
                className={`conduccion-gestion-estado conduccion-gestion-estado--${gestion.estado.toLowerCase()}`}
              >
                {mostrarEstado(gestion.estado)}
              </strong>
            </div>

            {gestion.numero_legajo && (
              <div>
                <span className="conduccion-gestion-etiqueta">
                  Número de legajo
                </span>
                <strong>{gestion.numero_legajo}</strong>
              </div>
            )}
          </section>

          {gestion.observaciones && (
            <aside className="conduccion-gestion-observacion">
              <h3>Última observación</h3>
              <p>{gestion.observaciones}</p>
            </aside>
          )}

          {puedeVerificar && (
            <section className="conduccion-gestion-bloque">
              <header>
                <h3>1. Verificación de datos</h3>
                <p>
                  Revisá los datos personales y académicos
                  antes de aprobar la inscripción.
                </p>
              </header>

              <fieldset
                className="conduccion-gestion-verificacion"
                disabled={bloqueado}
              >
                <legend>Confirmación de datos</legend>

                <label className="conduccion-gestion-check">
                  <input
                    type="checkbox"
                    checked={datosVerificados}
                    onChange={(evento) =>
                      setDatosVerificados(evento.target.checked)
                    }
                  />
                  <span>
                    Revisé los datos personales y académicos.
                  </span>
                </label>

                <fieldset className="conduccion-gestion-opciones">
                  <legend>
                    ¿El aspirante tiene título de posgrado?
                  </legend>

                  <label>
                    <input
                      type="radio"
                      name={`titulo-posgrado-${legajoId}`}
                      value="si"
                      checked={tituloPosgrado === "si"}
                      onChange={() => setTituloPosgrado("si")}
                    />
                    Sí
                  </label>

                  <label>
                    <input
                      type="radio"
                      name={`titulo-posgrado-${legajoId}`}
                      value="no"
                      checked={tituloPosgrado === "no"}
                      onChange={() => setTituloPosgrado("no")}
                    />
                    No
                  </label>
                </fieldset>

                <button
                  type="button"
                  className="conduccion-gestion-boton conduccion-gestion-boton--primario"
                  disabled={
                    bloqueado ||
                    tituloPosgrado === "" ||
                    !cambiosVerificacion
                  }
                  onClick={() => void guardarVerificacion()}
                >
                  {guardando
                    ? "Guardando..."
                    : "Guardar verificación"}
                </button>
              </fieldset>
            </section>
          )}

          <section className="conduccion-gestion-bloque">
            <header>
              <h3>2. Documentación</h3>
              <p>
                Consultá si el legajo contiene todos los
                documentos requeridos.
              </p>
            </header>

            {documentacion ? (
              <div className="conduccion-gestion-documentos">
                <div className="conduccion-gestion-documentos-resumen">
                  <strong>
                    {documentacion.documentos_presentados}
                    {" de "}
                    {documentacion.documentos_requeridos}
                    {" documentos"}
                  </strong>

                  <span>{documentacion.porcentaje}%</span>
                </div>

                <progress
                  value={documentacion.porcentaje}
                  max={100}
                  aria-label="Documentación presentada"
                />

                <p>
                  {documentacion.completo
                    ? "La documentación requerida está completa."
                    : "Hay documentos pendientes de presentación."}
                </p>

                {documentacion.documentos_faltantes.length > 0 && (
                  <>
                    <h4>Documentos faltantes</h4>
                    <ul>
                      {documentacion.documentos_faltantes.map(
                        (tipo) => (
                          <li key={tipo}>
                            {nombresDocumentos[tipo] ?? tipo}
                          </li>
                        )
                      )}
                    </ul>
                  </>
                )}
              </div>
            ) : (
              <p>
                {completitud?.pendiente ??
                  "Todavía no se calculó la completitud."}
              </p>
            )}
          </section>

          <section className="conduccion-gestion-bloque">
            <header>
              <h3>3. Cambiar estado</h3>
              <p>
                Seleccioná una acción. El sistema validará
                que esté permitida para el estado actual.
              </p>
            </header>

            {acciones.length > 0 ? (
              <>
                <div className="conduccion-gestion-comentario">
                  <label htmlFor={`comentario-${legajoId}`}>
                    Observaciones para el legajo
                    <span>
                      {gestion.estado === "EN_REVISION"
                        ? " (obligatorias al solicitar correcciones)"
                        : " (opcional)"}
                    </span>
                  </label>

                  <textarea
                    id={`comentario-${legajoId}`}
                    value={comentario}
                    maxLength={4000}
                    rows={4}
                    disabled={bloqueado}
                    onChange={(evento) =>
                      setComentario(evento.target.value)
                    }
                    placeholder="Escribí una devolución o indicá qué debe corregir el aspirante..."
                  />
                </div>

                <div className="conduccion-gestion-acciones">
                  {acciones.map(({ accion, texto }) => {
                    const esAprobacion = accion === "APROBAR";

                    const noPuedeAprobar =
                      esAprobacion &&
                      (
                        !gestion.datos_verificados ||
                        !documentacion?.completo
                      );

                    return (
                      <button
                        key={accion}
                        type="button"
                        className={`conduccion-gestion-boton conduccion-gestion-boton--${accion.toLowerCase()}`}
                        disabled={bloqueado || noPuedeAprobar}
                        onClick={() =>
                          void ejecutarAccion(accion)
                        }
                      >
                        {texto}
                      </button>
                    );
                  })}
                </div>

                {gestion.estado === "PENDIENTE" && (
                  <p className="conduccion-gestion-ayuda">
                    Primero iniciá la revisión. Después
                    podrás marcar el legajo como listo,
                    observarlo o rechazarlo.
                  </p>
                )}

                {gestion.estado === "EN_REVISION" &&
                  (
                    !gestion.datos_verificados ||
                    !documentacion?.completo
                  ) && (
                    <p className="conduccion-gestion-ayuda">
                      Para marcar el legajo como listo,
                      primero deben estar verificados los
                      datos y completa la documentación.
                    </p>
                  )}
              </>
            ) : (
              <p className="conduccion-gestion-ayuda">
                No hay acciones manuales disponibles para
                este estado según las reglas del sistema.
              </p>
            )}
          </section>

          <section className="conduccion-gestion-bloque">
            <header>
              <h3>4. Historial de operaciones</h3>
              <p>
                Consultá las decisiones registradas
                sobre este legajo.
              </p>
            </header>

            {eventos.length === 0 ? (
              <p className="conduccion-gestion-ayuda">
                Todavía no hay operaciones registradas.
              </p>
            ) : (
              <ol className="conduccion-gestion-historial">
                {eventos.map((evento) => (
                  <li key={evento.id}>
                    <strong>
                      {evento.accion.replaceAll("_", " ")}
                    </strong>

                    <span>
                      {mostrarFecha(evento.fecha)}
                      {" · "}
                      {evento.actor_rol}
                    </span>

                    {evento.comentario && (
                      <p>{evento.comentario}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </section>
  );
}
