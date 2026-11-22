
import { useRef, useState } from "react";
import { mostrarEstadoLegajo } from "../../../shared/utils/estadosLegajo";
import MensajeSistema from "../../../shared/componentes/MensajeSistema/MensajeSistema";
import { inscripcionApi } from "../api";
import type { EstadoInscripcion } from "../tipos";
import "./EstadoInscripcionPage.css";

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

export default function EstadoInscripcionPage() {
  const [numeroSeguimiento, setNumeroSeguimiento] = useState("");
  const [dniPasaporte, setDniPasaporte] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [resultado, setResultado] =
    useState<EstadoInscripcion | null>(null);
  const [cargando, setCargando] = useState(false);
  const consultaEnCurso = useRef(false);

  const consultarEstado = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (consultaEnCurso.current) return;

    setMensaje("");
    setResultado(null);

    if (!numeroSeguimiento.trim() || !dniPasaporte.trim()) {
      setMensaje("Completá ambos campos para consultar.");
      return;
    }

    try {
      consultaEnCurso.current = true;
      setCargando(true);

      const respuesta = await inscripcionApi.consultarEstado(
        numeroSeguimiento.trim(),
        dniPasaporte.trim()
      );

      setResultado(respuesta);
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo consultar el estado de la inscripción."
      );
    } finally {
      consultaEnCurso.current = false;
      setCargando(false);
    }
  };

  const completada =
    resultado?.estado.trim().toUpperCase() === "COMPLETADO";

  const observaciones = resultado?.observaciones ?? "";

  const documentacionPendiente =
    resultado?.documentacion_a_corregir ?? [];

  const mostrarObservaciones =
    Boolean(resultado) && !completada;

  const mostrarDocumentacion =
    Boolean(resultado) && !completada;

  return (
    <div className="estado-inscripcion">
      <section
        className="estado-inscripcion-contenido"
        aria-labelledby="estado-titulo"
      >
        <h1 id="estado-titulo">
          Consultar estado de inscripción
        </h1>

        <p>
          Ingresá el número de seguimiento y el DNI o
          pasaporte utilizado al completar tu inscripción.
        </p>

        <form onSubmit={consultarEstado}>
          <label htmlFor="numero-seguimiento">
            Número de seguimiento
          </label>

          <input
            id="numero-seguimiento"
            type="text"
            value={numeroSeguimiento}
            disabled={cargando}
            onChange={(e) => {
              setNumeroSeguimiento(e.target.value);
              setMensaje("");
              setResultado(null);
            }}
            placeholder="Ej.: INS-2026-4"
            required
          />

          <label htmlFor="dni-pasaporte">
            DNI o pasaporte
          </label>

          <input
            id="dni-pasaporte"
            type="text"
            value={dniPasaporte}
            disabled={cargando}
            onChange={(e) => {
              setDniPasaporte(e.target.value);
              setMensaje("");
              setResultado(null);
            }}
            required
          />

          <button type="submit" disabled={cargando}>
            {cargando ? "Consultando..." : "Consultar estado"}
          </button>
        </form>

        {mensaje && (
          <MensajeSistema
            tipo="error"
            texto={mensaje}
            alCerrar={() => setMensaje("")}
          />
        )}
      </section>

      {resultado && (
        <section
          className="estado-inscripcion-resultados"
          aria-live="polite"
        >
          <article className="resultado-principal">
            <h2>Resultado de la consulta</h2>

            <p>
              Número de seguimiento:{" "}
              <strong>{resultado.numero_seguimiento}</strong>
            </p>

            <p>
              Estado actual: <strong>{mostrarEstadoLegajo(resultado.estado)}</strong>
            </p>
          </article>

          {mostrarObservaciones && (
            <article className="resultado-panel">
              <h2>Observaciones</h2>

              <p>
                {observaciones ||
                  "No se registraron observaciones."}
              </p>
            </article>
          )}

          {mostrarDocumentacion && (
            <article className="resultado-panel">
              <h2>Documentación pendiente</h2>

              {documentacionPendiente.length > 0 ? (
                <ul>
                  {documentacionPendiente.map((documento) => (
                    <li key={documento}>
                      {nombresDocumentos[documento] ?? documento}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  No se solicitó documentación adicional.
                </p>
              )}
            </article>
          )}
        </section>
      )}
    </div>
  );
}
