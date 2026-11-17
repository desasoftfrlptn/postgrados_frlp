

import { useState } from "react";
import { inscripcionApi } from "../api";
import type { EstadoInscripcion } from "../tipos";
import "./EstadoInscripcionPage.css";

export default function EstadoInscripcionPage() {
  const [numeroSeguimiento, setNumeroSeguimiento] = useState("");
  const [dniPasaporte, setDniPasaporte] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [resultado, setResultado] =
    useState<EstadoInscripcion | null>(null);
  const [cargando, setCargando] = useState(false);

  const consultarEstado = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setMensaje("");
    setResultado(null);

    if (!numeroSeguimiento.trim() || !dniPasaporte.trim()) {
      setMensaje("Completá ambos campos para consultar.");
      return;
    }

    try {
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
      setCargando(false);
    }
  };

  return (
    <main className="estado-inscripcion">
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
          <p className="estado-inscripcion-mensaje" role="alert">
            {mensaje}
          </p>
        )}

        {resultado && (
          <section aria-live="polite">
            <h2>Resultado de la consulta</h2>
            <p>
              Número de seguimiento:{" "}
              <strong>{resultado.numero_seguimiento}</strong>
            </p>
            <p>
              Estado actual: <strong>{resultado.estado}</strong>
            </p>
          </section>
        )}
      </section>

    </main>
  );
}
