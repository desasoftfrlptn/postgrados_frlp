
import { useState } from "react";

import "./EstadoInscripcionPage.css";

export default function EstadoInscripcionPage() {
  const [numeroSeguimiento, setNumeroSeguimiento] = useState("");
  const [mensaje, setMensaje] = useState("");

  const consultarEstado = (e: React.FormEvent) => {
    e.preventDefault();

    if (!numeroSeguimiento.trim()) {
      setMensaje("Ingresá tu número de seguimiento.");
      return;
    }

    setMensaje(
      "La consulta estará disponible cuando se conecte el servicio de seguimiento."
    );
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
          Ingresá el número de seguimiento que recibiste
          al completar tu inscripción para consultar su estado.
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
            }}
            placeholder="Ej.: INS-2026-0001"
            required
          />

          <button type="submit">
            Consultar estado
          </button>
        </form>

        {mensaje && (
          <p className="estado-inscripcion-mensaje" role="status">
            {mensaje}
          </p>
        )}
      </section>

      <section
        className="estado-inscripcion-resultados"
        aria-labelledby="resultados-titulo"
      >
        <h2 id="resultados-titulo">
          Información de tu inscripción
        </h2>

        <p>
          Una vez realizada la consulta, acá podrás visualizar:
        </p>

        <ul>
          <li>Estado actual de la inscripción.</li>
          <li>Observaciones del equipo de conducción.</li>
          <li>Solicitudes de corrección de documentación.</li>
        </ul>
      </section>
    </main>
  );
}
