
import { useEffect, useRef, useState } from "react";
import { mostrarEstadoLegajo } from "../../../shared/utils/estadosLegajo";
import MensajeSistema from "../../../shared/componentes/MensajeSistema/MensajeSistema";
import { inscripcionApi } from "../api";
import { api } from "../../../shared/api/client";
import ConfirmacionModal from "../../../shared/componentes/ConfirmacionModal/ConfirmacionModal";
import { useConfirmacion } from "../../../shared/hooks/useConfirmacion";
import {
  normalizarDocumento,
  validarDniPasaporte,
} from "../validaciones";
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

const camposCorreccion = [
  ["apellido", "Apellido"], ["nombre", "Nombre"], ["nacionalidad", "Nacionalidad"],
  ["telefono_movil", "Teléfono móvil"], ["correo_alternativo", "Correo alternativo"],
  ["domicilio", "Domicilio"], ["pais", "País"], ["provincia", "Provincia"], ["ciudad", "Ciudad"],
  ["titulo_anterior", "Título anterior"], ["universidad_anterior", "Universidad anterior"],
  ["forma_conocio_ofertas", "Cómo conociste la oferta"], ["motivos_cursar", "Motivos para cursar"],
] as const;
type Correccion = { numero_seguimiento: string; carrera_elegida: string; observaciones: string | null;
  documentacion_a_corregir: string[]; datos: Record<string, string> };

export default function EstadoInscripcionPage() {
  const confirmacion = useConfirmacion();
  const [tokenCorreccion, setTokenCorreccion] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("correccion") ?? "");
  const [correccion, setCorreccion] = useState<Correccion | null>(null);
  const [archivos, setArchivos] = useState<Record<string, File>>({});
  const [exito, setExito] = useState("");
  const [errorCorreccion, setErrorCorreccion] = useState("");
  const [solicitando, setSolicitando] = useState(false);
  const [enlaceSolicitado, setEnlaceSolicitado] = useState(false);
  useEffect(() => {
    if (!tokenCorreccion) return;
    let vigente = true;
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    api.post<Correccion>("/inscripcion/seguimiento/recuperar-correccion", { token: tokenCorreccion })
      .then(datos => { if (vigente) setCorreccion(datos); })
      .catch(error => { if (vigente) setErrorCorreccion(error instanceof Error ? error.message : "No se pudo recuperar la inscripción."); });
    return () => { vigente = false; };
  }, [tokenCorreccion]);

  async function solicitarCorreccion() {
    if (solicitando || enlaceSolicitado) return;
    setSolicitando(true); setErrorCorreccion(""); setExito("");
    try {
      const respuesta = await api.post<{message: string}>("/inscripcion/seguimiento/solicitar-correccion", {
        numero_seguimiento: numeroSeguimiento.trim().toUpperCase(), dni_pasaporte: normalizarDocumento(dniPasaporte),
      });
      setExito(respuesta.message); setEnlaceSolicitado(true);
    } catch (error) {
      setErrorCorreccion(error instanceof Error ? error.message : "No se pudo solicitar el enlace.");
    } finally { setSolicitando(false); }
  }

  function reenviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!correccion || confirmacion.abierto) return;
    setErrorCorreccion("");
    if (correccion.documentacion_a_corregir.some(tipo => !archivos[tipo] || archivos[tipo].size > 5 * 1024 * 1024 || archivos[tipo].type !== "application/pdf")) {
      setErrorCorreccion("Adjuntá todos los PDF solicitados (hasta 5 MB por archivo)."); return;
    }
    confirmacion.solicitar({ titulo: "Confirmar reenvío", descripcion: "Se enviarán las correcciones a Conducción conservando el número de seguimiento.", ejecutar: async () => {
      try {
        const formulario = new FormData();
        formulario.append("token", tokenCorreccion); formulario.append("datos", JSON.stringify(correccion.datos));
        for (const tipo of correccion.documentacion_a_corregir) { formulario.append("tipos", tipo); formulario.append("archivos", archivos[tipo]); }
        const respuesta = await api.putForm<EstadoInscripcion>("/inscripcion/seguimiento/reenviar-correccion", formulario);
        setResultado(respuesta); setCorreccion(null); setTokenCorreccion(""); setArchivos({});
        setExito(`Inscripción reenviada. Tu número de seguimiento sigue siendo ${respuesta.numero_seguimiento}.`);
      } catch (error) { setErrorCorreccion(error instanceof Error ? error.message : "No se pudo reenviar la inscripción."); }
    }});
  }

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
    setExito(""); setErrorCorreccion(""); setEnlaceSolicitado(false);
    setResultado(null);

    if (!numeroSeguimiento.trim() || !dniPasaporte.trim()) {
      setMensaje("Completá ambos campos para consultar.");
      return;
    }

    if (!validarDniPasaporte(dniPasaporte)) {
      setMensaje("Ingresá un DNI o pasaporte válido.");
      return;
    }

    try {
      consultaEnCurso.current = true;
      setCargando(true);

      const respuesta = await inscripcionApi.consultarEstado(
        numeroSeguimiento.trim().toUpperCase(),
        normalizarDocumento(dniPasaporte)
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

      {exito && <MensajeSistema tipo="exito" texto={exito} alCerrar={() => setExito("")} />}
      {errorCorreccion && <MensajeSistema tipo="error" texto={errorCorreccion} alCerrar={() => setErrorCorreccion("")} />}
      {tokenCorreccion && !correccion && !errorCorreccion && <p role="status">Recuperando inscripción…</p>}
      {correccion && <section className="resultado-panel correccion-inscripcion">
        <h2>Corregir inscripción {correccion.numero_seguimiento}</h2><p>{correccion.carrera_elegida}</p>
        {correccion.observaciones && <p>{correccion.observaciones}</p>}
        <form onSubmit={reenviar}>
          <fieldset disabled={confirmacion.abierto} className="correccion-campos">
            {camposCorreccion.map(([campo, etiqueta]) => <div key={campo}><label htmlFor={`correccion-${campo}`}>{etiqueta}</label>
              <input id={`correccion-${campo}`} value={correccion.datos[campo] ?? ""} required={campo !== "correo_alternativo"} type={campo === "correo_alternativo" ? "email" : campo === "telefono_movil" ? "tel" : "text"}
                onChange={e => setCorreccion(prev => prev ? {...prev, datos: {...prev.datos, [campo]: e.target.value}} : prev)} /></div>)}
            {correccion.documentacion_a_corregir.map(tipo => <div key={tipo}><label htmlFor={`correccion-${tipo}`}>{nombresDocumentos[tipo] ?? tipo} (PDF, hasta 5 MB)</label>
              <input id={`correccion-${tipo}`} type="file" accept="application/pdf,.pdf" required onChange={e => {const archivo = e.target.files?.[0]; setArchivos(prev => {const copia = {...prev}; if (archivo) copia[tipo] = archivo; else delete copia[tipo]; return copia;});}} /></div>)}
          </fieldset>
          <button type="submit" disabled={confirmacion.abierto}>Reenviar inscripción</button>
        </form>
      </section>}
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

          {resultado.estado === "OBSERVADO" && <form onSubmit={e => { e.preventDefault(); void solicitarCorreccion(); }} className="resultado-panel"><h2>Corregir inscripción</h2><p>Para proteger tus datos, te enviaremos un enlace al correo registrado. Al abrirlo podrás editar tu inscripción original y reenviarla.</p><button type="submit" disabled={solicitando || enlaceSolicitado}>{solicitando ? "Solicitando…" : "Corregir inscripción"}</button></form>}
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
      <ConfirmacionModal abierto={confirmacion.abierto} titulo={confirmacion.titulo} descripcion={confirmacion.descripcion} confirmando={confirmacion.procesando} alConfirmar={confirmacion.confirmar} alCancelar={confirmacion.cancelar} />
    </div>
  );
}
