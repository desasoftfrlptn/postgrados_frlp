import EditarCohorte from "../../shared/componentes/EditarCohorte";
import { useEffect, useRef, useState, type FormEvent } from "react";
import ConfirmacionModal from "../../../../shared/componentes/ConfirmacionModal/ConfirmacionModal";
import MensajeSistema from "../../../../shared/componentes/MensajeSistema/MensajeSistema";

import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";
import "../estilos/Conduccion.css";
import "../estilos/ConduccionModulos.css";
import "../../administrador/estilos/FiltrosAcademicos.css";
import "./PeriodosInscripcionPage.css";
import "../estilos/ConduccionInstitucional.css";

interface Carrera {
  id: string;
  nombre: string;
  activo: boolean;
}

interface Cohorte {
  id: string;
  anio: number;
  nombre: string;
  carrera_id: string | null;
  abierta: boolean;
  fecha_inicio: string | null;
  created_at: string | null;
}

type FiltroEstado = "TODAS" | "ABIERTAS" | "CERRADAS";

type OperacionPendiente =
  | { tipo: "CAMBIAR"; cohorte: Cohorte }
  | {
      tipo: "CREAR";
      datos: {
        nombre: string;
        anio: number;
        carrera_id: string;
        fecha_inicio: string | null;
      };
    };

function mostrarFecha(fecha: string | null): string {
  if (!fecha) return "Sin fecha";
  const partes = fecha.split("-");
  return partes.length === 3
    ? `${partes[2]}/${partes[1]}/${partes[0]}`
    : fecha;
}

export default function PeriodosInscripcionPage() {
  const { user } = useAuth();
  const token = user?.token;

  const [editando, setEditando] = useState<Cohorte | null>(null);
  const [cohortes, setCohortes] = useState<Cohorte[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [errorCarga, setErrorCarga] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroAnio, setFiltroAnio] = useState("");
  const [filtroCarrera, setFiltroCarrera] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("TODAS");
  const [versionConsulta, setVersionConsulta] = useState(0);
  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [creando, setCreando] = useState(false);
  const [operacionPendiente, setOperacionPendiente] =
    useState<OperacionPendiente | null>(null);
  const operacionEnCurso = useRef(false);
  const [nueva, setNueva] = useState({
    nombre: "",
    anio: String(new Date().getFullYear()),
    carrera_id: "",
    fecha_inicio: "",
  });

  useEffect(() => {
    let activo = true;

    async function cargarDatos() {
      if (!token) {
        if (activo) {
          setError("Necesitás iniciar sesión para consultar las inscripciones.");
          setErrorCarga(true);
          setCargando(false);
        }
        return;
      }

      try {
        const [respuestaCohortes, respuestaCarreras] = await Promise.all([
          api.get<Cohorte[]>("/cohortes", token),
          api.get<Carrera[]>("/carreras", token),
        ]);

        if (activo) {
          setCohortes(respuestaCohortes);
          setCarreras(respuestaCarreras);
          setError("");
          setErrorCarga(false);
        }
      } catch (err) {
        if (activo) {
          setErrorCarga(true);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron consultar las cohortes y carreras.",
          );
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    // Diferir el inicio permite cancelar la consulta si se desmonta la vista.
    const inicio = window.setTimeout(() => void cargarDatos(), 0);
    return () => {
      activo = false;
      window.clearTimeout(inicio);
    };
  }, [token, versionConsulta]);

  const nombresCarreras = new Map(
    carreras.map((carrera) => [carrera.id, carrera.nombre]),
  );

  const cohortesFiltradas = cohortes
    .filter(c => c.nombre.toLowerCase().includes(filtroNombre.trim().toLowerCase()) && (!filtroAnio || String(c.anio) === filtroAnio))
    .filter((cohorte) => !filtroCarrera || cohorte.carrera_id === filtroCarrera)
    .filter((cohorte) => {
      if (filtroEstado === "ABIERTAS") return cohorte.abierta;
      if (filtroEstado === "CERRADAS") return !cohorte.abierta;
      return true;
    })
    .sort((a, b) => b.anio - a.anio || a.nombre.localeCompare(b.nombre));

  const cantidadAbiertas = cohortes.filter((cohorte) => cohorte.abierta).length;

  async function cambiarInscripcion(cohorte: Cohorte) {
    if (!token || operacionEnCurso.current) return;

    operacionEnCurso.current = true;
    const abrir = !cohorte.abierta;

    setProcesandoId(cohorte.id);
    setError("");
    setMensaje("");

    try {
      const actualizada = await api.patch<Cohorte>(
        `/cohortes/${encodeURIComponent(cohorte.id)}/inscripcion`,
        { abierta: abrir },
        token,
      );

      setCohortes((actuales) =>
        actuales.map((item) =>
          item.id === cohorte.id ? actualizada : item,
        ),
      );
      setMensaje(
        `Las inscripciones de "${cohorte.nombre}" se ${abrir ? "abrieron" : "cerraron"} correctamente.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo modificar la inscripción de la cohorte.",
      );
    } finally {
      operacionEnCurso.current = false;
      setProcesandoId(null);
    }
  }

  function solicitarAlta(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!token || operacionEnCurso.current || operacionPendiente) return;
    const nombre = nueva.nombre.trim();
    const anio = Number(nueva.anio);
    if (!nombre || !nueva.carrera_id || !Number.isInteger(anio) || anio < 1) {
      setError("Completá el nombre, año y carrera de la cohorte.");
      return;
    }
    setError("");
    setMensaje("");
    setOperacionPendiente({
      tipo: "CREAR",
      datos: {
        nombre,
        anio,
        carrera_id: nueva.carrera_id,
        fecha_inicio: nueva.fecha_inicio || null,
      },
    });
  }

  async function crearCohorte(
    datos: Extract<OperacionPendiente, { tipo: "CREAR" }>["datos"],
  ) {
    if (!token || operacionEnCurso.current) return;

    operacionEnCurso.current = true;
    setCreando(true);
    setError("");
    setMensaje("");

    try {
      const creada = await api.post<Cohorte>("/cohortes", datos, token);
      setCohortes((actuales) => [...actuales, creada]);
      setMostrarAlta(false);
      setNueva({ nombre: "", anio: String(new Date().getFullYear()), carrera_id: "", fecha_inicio: "" });
      setMensaje(`Se creó la cohorte "${creada.nombre}" correctamente.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cohorte.");
    } finally {
      operacionEnCurso.current = false;
      setCreando(false);
    }
  }

  async function confirmarOperacion() {
    if (!operacionPendiente || operacionEnCurso.current) return;

    try {
      if (operacionPendiente.tipo === "CREAR") {
        await crearCohorte(operacionPendiente.datos);
      } else {
        await cambiarInscripcion(operacionPendiente.cohorte);
      }
    } finally {
      setOperacionPendiente(null);
    }
  }

  if (editando && token) return <EditarCohorte cohorte={editando} carreras={carreras} token={token} cancelar={() => { setEditando(null); setVersionConsulta(v => v + 1); }} guardada={actualizada => {
    setCohortes(actuales => actuales.map(c => c.id === actualizada.id ? actualizada : c));
    setEditando(null);
    setMensaje("La cohorte fue modificada correctamente.");
  }} />;


  return (
    <section className="perfil-pagina periodos-inscripcion conduccion-institucional" aria-labelledby="titulo-periodos">
      <header className="periodos-cabecera">
        <div>
          <h1 id="titulo-periodos">Períodos de inscripción</h1>
          <p>
            Gestioná las cohortes y la apertura de inscripciones
            de las carreras de posgrado.
          </p>
        </div>

        {!mostrarAlta && (
          <button
            type="button"
            className="periodos-boton-nuevo"
            onClick={() => setMostrarAlta(true)}
            disabled={creando || procesandoId !== null || Boolean(operacionPendiente)}
          >
            + Nueva cohorte
          </button>
        )}
      </header>

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


      {mostrarAlta && <form className="periodos-formulario rounded-xl border border-gray-200 bg-white p-6 shadow-sm" onSubmit={solicitarAlta}>
            <h3 className="mb-6 text-xl font-bold text-gray-900">Crear cohorte</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><label htmlFor="nueva-cohorte-nombre" className="mb-1 block font-semibold">Nombre</label>
                <input id="nueva-cohorte-nombre" required maxLength={50} value={nueva.nombre}
                  onChange={(e) => setNueva((a) => ({ ...a, nombre: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 bg-white p-2" placeholder="Ej.: Cohorte 2027" /></div>
              <div><label htmlFor="nueva-cohorte-anio" className="mb-1 block font-semibold">Año</label>
                <input id="nueva-cohorte-anio" required type="number" min={1} step={1} value={nueva.anio}
                  onChange={(e) => setNueva((a) => ({ ...a, anio: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 bg-white p-2" /></div>
              <div><label htmlFor="nueva-cohorte-carrera" className="mb-1 block font-semibold">Carrera</label>
                <select id="nueva-cohorte-carrera" required value={nueva.carrera_id}
                  onChange={(e) => setNueva((a) => ({ ...a, carrera_id: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 bg-white p-2">
                  <option value="">Seleccioná una carrera</option>
                  {carreras.filter((carrera) => carrera.activo).map((carrera) =>
                    <option key={carrera.id} value={carrera.id}>{carrera.nombre}</option>)}
                </select></div>
              <div><label htmlFor="nueva-cohorte-fecha" className="mb-1 block font-semibold">Fecha de inicio de cohorte (opcional)</label>
                <input id="nueva-cohorte-fecha" type="date" value={nueva.fecha_inicio}
                  onChange={(e) => setNueva((a) => ({ ...a, fecha_inicio: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 bg-white p-2" /></div>
            </div>
            <div className="mt-6 flex flex-row-reverse flex-wrap gap-3">
              <button type="submit" disabled={creando || procesandoId !== null || Boolean(operacionPendiente)} className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
                {creando ? "Creando…" : "Crear cohorte"}
              </button>
              <button type="button" disabled={creando} onClick={() => setMostrarAlta(false)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 font-semibold">Cancelar</button>
            </div>
          </form>}

      {!mostrarAlta && (
        <>
          <div className="admin-filtros-academicos">
            <div className="admin-filtro-campo">
              <label htmlFor="periodos-carrera" >
                Carrera
              </label>
              <select
                id="periodos-carrera"

                value={filtroCarrera}
                onChange={(evento) => setFiltroCarrera(evento.target.value)}
              >
                <option value="">Todas las carreras</option>
                {carreras.map((carrera) => (
                  <option key={carrera.id} value={carrera.id}>
                    {carrera.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-filtro-campo">
              <label htmlFor="periodos-estado" >
                Estado de inscripción
              </label>
              <select
                id="periodos-estado"

                value={filtroEstado}
                onChange={(evento) =>
                  setFiltroEstado(evento.target.value as FiltroEstado)
                }
              >
                <option value="TODAS">Todas</option>
                <option value="ABIERTAS">Abiertas</option>
                <option value="CERRADAS">Cerradas</option>
              </select>
            </div>
            <div className="admin-filtro-campo"><label htmlFor="periodos-nombre" >Buscar cohorte</label><input id="periodos-nombre" type="search"  value={filtroNombre} onChange={e => setFiltroNombre(e.target.value)} /></div>
            <div className="admin-filtro-campo"><label htmlFor="periodos-anio" >Año</label><select id="periodos-anio"  value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)}><option value="">Todos</option>{Array.from(new Set(cohortes.map(c => c.anio))).sort((a,b) => b-a).map(a => <option key={a} value={a}>{a}</option>)}</select></div>
          <button type="button" className="admin-limpiar-filtros" onClick={() => {setFiltroNombre("");setFiltroAnio("");setFiltroCarrera("");setFiltroEstado("TODAS");}}>Limpiar filtros</button>
          </div>

          {!cargando && !errorCarga && (
            <div className="periodos-resumen-listado">
              <p role="status" className="admin-resultado-filtros">
                {cohortesFiltradas.length} de {cohortes.length} resultados
              </p>

              <p className="periodos-resumen-cantidades">
                {cantidadAbiertas} abiertas · {cohortes.length - cantidadAbiertas} cerradas
              </p>
            </div>
          )}

          <div className="periodos-tabla-contenedor">
            {cargando ? (
              <p className="periodos-mensaje-tabla" role="status">
                Cargando cohortes y carreras…
              </p>
            ) : errorCarga ? (
              <div className="periodos-mensaje-tabla">
                <p>No se pudieron cargar las cohortes.</p>

                <button
                  type="button"
                  className="admin-limpiar-filtros"
                  onClick={() => {
                    setCargando(true);
                    setVersionConsulta(actual => actual + 1);
                  }}
                >
                  Reintentar
                </button>
              </div>
            ) : cohortes.length === 0 ? (
              <p className="periodos-mensaje-tabla">
                No hay cohortes registradas.
              </p>
            ) : cohortesFiltradas.length === 0 ? (
              <p className="periodos-mensaje-tabla">
                No se encontraron cohortes para los filtros seleccionados.
              </p>
            ) : (
              <table className="periodos-tabla w-full text-left">
                <thead className="bg-gray-100">
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th scope="col" className="p-4">Carrera</th>
                    <th scope="col" className="p-4">Cohorte</th>
                    <th scope="col" className="p-4">Año</th>
                    <th scope="col" className="p-4">Inicio de cohorte</th>
                    <th scope="col" className="p-4">Inscripción</th>
                    <th scope="col" className="p-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cohortesFiltradas.map((cohorte) => (
                    <tr key={cohorte.id} className="border-t border-gray-200">
                      <td className="p-4">
                        {cohorte.carrera_id
                          ? nombresCarreras.get(cohorte.carrera_id) ?? "Carrera no encontrada"
                          : "Sin carrera asociada"}
                      </td>
                      <td className="p-4 font-semibold">{cohorte.nombre}</td>
                      <td className="p-4">{cohorte.anio}</td>
                      <td className="p-4">{mostrarFecha(cohorte.fecha_inicio)}</td>
                      <td className="p-4">
                        <span
                          className={`font-semibold ${
                            cohorte.abierta
                              ? "text-green-700"
                              : "text-gray-500"
                          }`}
                        >
                          {cohorte.abierta ? "Abierta" : "Cerrada"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="periodos-acciones"><button type="button" className="periodos-accion-editar" aria-label={`Editar ${cohorte.nombre}`} onClick={() => { setError(""); setMensaje(""); setEditando(cohorte); }} disabled={procesandoId !== null || creando || Boolean(operacionPendiente)}>Editar</button>
                        <button
                          type="button"
                          disabled={procesandoId !== null || creando || Boolean(operacionPendiente)}
                          onClick={() => {
                            setError("");
                            setMensaje("");
                            setOperacionPendiente({
                              tipo: "CAMBIAR",
                              cohorte,
                            });
                          }}
                          aria-label={`${cohorte.abierta ? "Cerrar" : "Abrir"} inscripciones de ${cohorte.nombre}`}
                          className={cohorte.abierta ? "periodos-accion-cerrar" : "periodos-accion-abrir"}
                        >
                          {procesandoId === cohorte.id
                            ? "Guardando…"
                            : cohorte.abierta
                              ? "Cerrar inscripción"
                              : "Abrir inscripción"}
                        </button></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      <ConfirmacionModal
        abierto={operacionPendiente !== null}
        titulo={
          operacionPendiente?.tipo === "CREAR"
            ? "Confirmar alta de cohorte"
            : operacionPendiente?.tipo === "CAMBIAR" &&
                operacionPendiente.cohorte.abierta
              ? "Cerrar inscripciones"
              : "Abrir inscripciones"
        }
        descripcion={
          operacionPendiente?.tipo === "CREAR"
            ? `¿Confirmás la creación de "${operacionPendiente.datos.nombre}"?`
            : operacionPendiente?.tipo === "CAMBIAR"
              ? operacionPendiente.cohorte.abierta
                ? `La cohorte "${operacionPendiente.cohorte.nombre}" dejará de recibir nuevas inscripciones.`
                : `Se habilitarán las inscripciones de "${operacionPendiente.cohorte.nombre}".`
              : ""
        }
        textoConfirmar="Confirmar"
        confirmando={creando || procesandoId !== null}
        peligroso={
          operacionPendiente?.tipo === "CAMBIAR" &&
          operacionPendiente.cohorte.abierta
        }
        alConfirmar={() => void confirmarOperacion()}
        alCancelar={() => {
          if (!operacionEnCurso.current) {
            setOperacionPendiente(null);
          }
        }}
      />
    </section>
  );
}
