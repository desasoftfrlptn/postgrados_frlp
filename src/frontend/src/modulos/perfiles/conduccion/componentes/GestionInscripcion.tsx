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
  PENDIENTE: [
    { accion: "REVISAR", texto: "Iniciar revisión" },
  ],
  EN_REVISION: [
    { accion: "OBSERVAR", texto: "Solicitar correcciones" },
    { accion: "APROBAR", texto: "Aprobar inscripción" },
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
}

function mensajeError(error: unknown, alternativa: string) {
  return error instanceof Error ? error.message : alternativa;
}

export default function GestionInscripcion({
  legajoId,
  onEstadoActualizado,
}: Props) {
  const { user } = useAuth();
  const token = user?.token;

  const [gestion, setGestion] = useState<Gestion | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [datosVerificados, setDatosVerificados] = useState(false);
  const [tituloPosgrado, setTituloPosgrado] = useState("");
  const [comentario, setComentario] = useState("");
  const [documentacionACorregir, setDocumentacionACorregir] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [consultaValida, setConsultaValida] = useState(false);

  const solicitudActual = useRef(0);
  const operacionEnCurso = useRef(false);

  const base = `/conduccion/legajos/${encodeURIComponent(legajoId)}`;

  const cargar = useCallback(async (): Promise<boolean> => {
    const solicitud = ++solicitudActual.current;

    setConsultaValida(false);

    if (!token) {
      setGestion(null);
      setEventos([]);
      setCargando(false);
      return false;
    }

    setCargando(true);
    setError("");

    try {
      const [datos, historial] = await Promise.all([
        api.get<Gestion>(`${base}/gestion`, token),
        api.get<Evento[]>(`${base}/auditoria`, token),
      ]);

      if (solicitud !== solicitudActual.current) {
        return false;
      }

      setGestion(datos);
      setEventos(historial);
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

      const actualizado = await cargar();

      setMensaje(
        actualizado
          ? "Verificación guardada."
          : "Verificación guardada. Actualizá la gestión para consultar los datos.",
      );
    } catch (err) {
      setError(mensajeError(err, "No se pudo guardar la verificación."));
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

    if (
      !window.confirm(
        `¿Confirmás la operación ${accion.toLowerCase().replaceAll("_", " ")}?`,
      )
    ) {
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
      setComentario("");
      setDocumentacionACorregir([]);

      const actualizado = await cargar();

      setMensaje(
        actualizado
          ? "Operación registrada."
          : "Operación registrada. Actualizá la gestión para consultar los datos.",
      );
    } catch (err) {
      setError(mensajeError(err, "No se pudo realizar la operación."));
    } finally {
      operacionEnCurso.current = false;
      setGuardando(false);
    }
  }

  if (!token) {
    return <p>Iniciá sesión para consultar el legajo.</p>;
  }

  if (cargando && !gestion) {
    return <p role="status">Cargando gestión del legajo…</p>;
  }

  const bloqueado = guardando || cargando || !consultaValida;

  const puedeVerificar = gestion
    ? ["PENDIENTE", "EN_REVISION", "OBSERVADO"].includes(gestion.estado)
    : false;

  return (
    <section
      className="conduccion-tarjeta"
      aria-label="Gestión de la inscripción"
    >
      <header className="conduccion-tarjeta-encabezado">
        <h2>Gestión de la inscripción</h2>
      </header>

      <div className="conduccion-tarjeta-cuerpo">
        {error && <p role="alert">{error}</p>}
        {mensaje && <p role="status">{mensaje}</p>}

        <button
          type="button"
          disabled={cargando || guardando}
          onClick={() => {
            setMensaje("");
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
                  {gestion.estado.replaceAll("_", " ")}
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
              <p>Últimas observaciones: {gestion.observaciones}</p>
            )}

            {puedeVerificar && (
              <fieldset
                className="gestion-verificacion"
                disabled={bloqueado}
              >
                <legend>Verificación del legajo</legend>

                <p className="gestion-ayuda">
                  Completá los siguientes datos antes de aprobar la inscripción.
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

                <div className="gestion-verificacion-acciones">
                  <button
                    type="button"
                    className="gestion-boton-guardar"
                    disabled={tituloPosgrado === ""}
                    onClick={() => void guardarVerificacion()}
                  >
                    Guardar verificación
                  </button>
                </div>
              </fieldset>
            )}
            
            <label>
              Comentario u observaciones
              <textarea
                value={comentario}
                maxLength={4000}
                disabled={bloqueado}
                onChange={(event) => setComentario(event.target.value)}
              />
            </label>

            
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


            <div>
              {(accionesPorEstado[gestion.estado] ?? []).map(
                ({ accion, texto }) => (
                  <button
                    key={accion}
                    type="button"
                    className="conduccion-listado-boton-secundario"
                    disabled={bloqueado}
                    onClick={() => void ejecutarAccion(accion)}
                  >
                    {texto}
                  </button>
                ),
              )}
            </div>

            <h3>Historial de operaciones</h3>

            {eventos.length === 0 ? (
              <p>No hay operaciones registradas.</p>
            ) : (
              <ol>
                {eventos.map((evento) => (
                  <li key={evento.id}>
                    <strong>{evento.accion}</strong>
                    {" — "}
                    {new Date(evento.fecha).toLocaleString("es-AR")}
                    {" — "}
                    {evento.actor_rol}
                    {evento.comentario && <p>{evento.comentario}</p>}
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </section>
  );
}
