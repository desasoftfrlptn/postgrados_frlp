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
    { accion: "MATRICULAR", texto: "Matricular estudiante" },
  ],
  ACTIVO: [
    { accion: "DAR_BAJA", texto: "Dar de baja" },
  ],
  EN_RIESGO: [
    { accion: "DAR_BAJA", texto: "Dar de baja" },
  ],
};

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
  const [completitud, setCompletitud] = useState<Completitud | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [datosVerificados, setDatosVerificados] = useState(false);
  const [tituloPosgrado, setTituloPosgrado] = useState("");
  const [comentario, setComentario] = useState("");
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
      setCompletitud(null);
      setEventos([]);
      setCargando(false);
      return false;
    }

    setCargando(true);
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
    void cargar();

    return () => {
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

    if (accion === "OBSERVAR" && !comentario.trim()) {
      setError("Escribí qué debe corregir el aspirante.");
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
        },
        token,
      );

      setGestion(resultado);
      onEstadoActualizado?.(resultado.estado);
      setComentario("");

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
            <p>
              Estado: <strong>{gestion.estado}</strong>
            </p>

            <p>
              Número de legajo:{" "}
              {gestion.numero_legajo ?? "Todavía no asignado"}
            </p>

            {gestion.observaciones && (
              <p>Últimas observaciones: {gestion.observaciones}</p>
            )}

            {puedeVerificar && (
              <fieldset disabled={bloqueado}>
                <legend>Verificación del legajo</legend>

                <label>
                  <input
                    type="checkbox"
                    checked={datosVerificados}
                    onChange={(event) =>
                      setDatosVerificados(event.target.checked)
                    }
                  />
                  Revisé los datos personales y académicos
                </label>

                <label>
                  ¿Tiene título de posgrado?
                  <select
                    value={tituloPosgrado}
                    onChange={(event) => setTituloPosgrado(event.target.value)}
                  >
                    <option value="">Seleccionar</option>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                </label>

                <button
                  type="button"
                  disabled={tituloPosgrado === ""}
                  onClick={() => void guardarVerificacion()}
                >
                  Guardar verificación
                </button>
              </fieldset>
            )}

            <h3>Completitud documental</h3>

            {completitud?.completitud ? (
              <>
                <p>
                  {completitud.completitud.porcentaje}% —{" "}
                  {completitud.completitud.documentos_presentados}
                  {" de "}
                  {completitud.completitud.documentos_requeridos}
                  {" documentos"}
                </p>

                <ul>
                  {completitud.completitud.documentos_faltantes.map(
                    (documento) => (
                      <li key={documento}>{documento}</li>
                    ),
                  )}
                </ul>
              </>
            ) : (
              <p>
                {completitud?.pendiente ??
                  "Todavía no se calculó la completitud."}
              </p>
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

            <div>
              {(accionesPorEstado[gestion.estado] ?? []).map(
                ({ accion, texto }) => (
                  <button
                    key={accion}
                    type="button"
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