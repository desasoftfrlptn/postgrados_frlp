import { useEffect, useState } from "react";

import {
  faqApi,
  type PreguntaFrecuente,
} from "../../../shared/api/faq";

import MensajeSistema from "../../../shared/componentes/MensajeSistema/MensajeSistema";

import "./paginaFAQ.css";

export default function PaginaFAQ() {
  const [preguntas, setPreguntas] = useState<PreguntaFrecuente[]>([]);
  const [preguntaAbierta, setPreguntaAbierta] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);

  // Consulta las preguntas publicadas.
  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const respuesta = await faqApi.listarPublicas();

        if (activo) {
          setPreguntas(
            respuesta
              .filter((item) => item.activa)
              .sort((a, b) => a.orden - b.orden)
          );

          setErrorCarga(false);
        }
      } catch {
        if (activo) {
          setErrorCarga(true);
          setError("No se pudieron cargar las preguntas frecuentes.");
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    void cargar();

    return () => {
      activo = false;
    };
  }, [intento]);

  // Reintenta una consulta fallida.
  function reintentar() {
    setError("");
    setErrorCarga(false);
    setCargando(true);
    setIntento((valor) => valor + 1);
  }

  // Agrupa las preguntas por su categoría.
  const categorias = new Map<string, PreguntaFrecuente[]>();

  for (const item of preguntas) {
    const agrupadas = categorias.get(item.categoria) ?? [];
    agrupadas.push(item);
    categorias.set(item.categoria, agrupadas);
  }

  function alternarPregunta(id: string) {
    setPreguntaAbierta((actual) =>
      actual === id ? null : id
    );
  }

  return (
    <div className="faq">
      <section className="faq-hero" aria-labelledby="titulo-faq">
        <div className="faq-hero-contenido">
          <h1 id="titulo-faq">Preguntas frecuentes</h1>
          <p>
            Consultá información sobre las carreras de posgrado,
            la inscripción y el proceso académico.
          </p>
        </div>
      </section>

      <section
        className="faq-contenido"
        aria-label="Preguntas frecuentes"
      >
        {error && (
          <MensajeSistema
            tipo="error"
            texto={error}
            alCerrar={() => setError("")}
          />
        )}

        {cargando ? (
          <p role="status">Cargando preguntas frecuentes...</p>
        ) : errorCarga ? (
          <button className="faq-reintentar" onClick={reintentar}>
            Reintentar
          </button>
        ) : categorias.size === 0 ? (
          <p>No hay preguntas frecuentes publicadas.</p>
        ) : (
          Array.from(categorias).map(([categoria, items]) => (
            <section className="faq-categoria" key={categoria}>
              <div className="faq-categoria-titulo">
                <span aria-hidden="true">→</span>
                <h2>{categoria}</h2>
              </div>

              <div className="faq-lista">
                {items.map((item) => {
                  const abierta = preguntaAbierta === item.id;

                  return (
                    <div className="faq-item" key={item.id}>
                      <button
                        type="button"
                        className="faq-pregunta"
                        aria-expanded={abierta}
                        aria-controls={`respuesta-${item.id}`}
                        onClick={() => alternarPregunta(item.id)}
                      >
                        <span>{item.pregunta}</span>

                        <span
                          className={`faq-icono ${abierta ? "abierta" : ""}`}
                          aria-hidden="true"
                        >
                          ⌄
                        </span>
                      </button>

                      <div
                        id={`respuesta-${item.id}`}
                        className="faq-respuesta"
                        hidden={!abierta}
                      >
                        <p>{item.respuesta}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </section>
    </div>
  );
}
