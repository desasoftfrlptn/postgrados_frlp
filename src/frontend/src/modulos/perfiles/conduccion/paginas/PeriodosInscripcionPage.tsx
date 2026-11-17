import { useEffect, useState, type FormEvent } from "react";

import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";
import "../estilos/Conduccion.css";
import "../estilos/ConduccionModulos.css";

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

  const [cohortes, setCohortes] = useState<Cohorte[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [errorCarga, setErrorCarga] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [filtroCarrera, setFiltroCarrera] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("TODAS");
  const [versionConsulta, setVersionConsulta] = useState(0);
  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [creando, setCreando] = useState(false);
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
    .filter((cohorte) => !filtroCarrera || cohorte.carrera_id === filtroCarrera)
    .filter((cohorte) => {
      if (filtroEstado === "ABIERTAS") return cohorte.abierta;
      if (filtroEstado === "CERRADAS") return !cohorte.abierta;
      return true;
    })
    .sort((a, b) => b.anio - a.anio || a.nombre.localeCompare(b.nombre));

  const cantidadAbiertas = cohortes.filter((cohorte) => cohorte.abierta).length;

  async function cambiarInscripcion(cohorte: Cohorte) {
    if (!token || procesandoId !== null) return;

    const abrir = !cohorte.abierta;
    const accion = abrir ? "abrir" : "cerrar";
    const confirmado = window.confirm(
      `¿Querés ${accion} las inscripciones de la cohorte "${cohorte.nombre}"?`,
    );
    if (!confirmado) return;

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
      setProcesandoId(null);
    }
  }

  async function crearCohorte(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!token || creando) return;
    const nombre = nueva.nombre.trim();
    const anio = Number(nueva.anio);
    if (!nombre || !nueva.carrera_id || !Number.isInteger(anio) || anio < 1) {
      setError("Completá el nombre, año y carrera de la cohorte.");
      return;
    }
    setCreando(true);
    setError("");
    setMensaje("");
    try {
      const creada = await api.post<Cohorte>("/cohortes", {
        nombre,
        anio,
        carrera_id: nueva.carrera_id,
        fecha_inicio: nueva.fecha_inicio || null,
      }, token);
      setCohortes((actuales) => [...actuales, creada]);
      setMostrarAlta(false);
      setNueva({ nombre: "", anio: String(new Date().getFullYear()), carrera_id: "", fecha_inicio: "" });
      setMensaje(`Se creó la cohorte "${creada.nombre}" correctamente.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cohorte.");
    } finally {
      setCreando(false);
    }
  }

  return (
    <section className="perfil-pagina" aria-labelledby="titulo-periodos">
      <header className="perfil-pagina-encabezado">
        <h1 id="titulo-periodos">Períodos de inscripción</h1>
        <p>
          Consultá las cohortes y habilitá o cerrá las inscripciones de cada
          una según su carrera.
        </p>
      </header>

      <section className="conduccion-tarjeta" aria-labelledby="titulo-gestion-cohortes">
        <div className="conduccion-tarjeta-cuerpo">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="titulo-gestion-cohortes" className="text-lg font-bold">Administración de cohortes</h2>
              <p>Creá cohortes y gestioná la apertura de inscripciones según la carrera.</p>
            </div>
            <button type="button" className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
              onClick={() => setMostrarAlta((visible) => !visible)}>
              {mostrarAlta ? "Cerrar formulario" : "+ Nueva cohorte"}
            </button>
          </div>
          {mostrarAlta && <form className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={(evento) => void crearCohorte(evento)}>
            <h3 className="mb-4 text-lg font-bold">Crear cohorte</h3>
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
            <div className="mt-4 flex gap-3">
              <button type="submit" disabled={creando} className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
                {creando ? "Creando…" : "Crear cohorte"}
              </button>
              <button type="button" disabled={creando} onClick={() => setMostrarAlta(false)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 font-semibold">Cancelar</button>
            </div>
          </form>}
        </div>
      </section>

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        La apertura y el cierre se administran por cohorte. La fecha de inicio
        corresponde al comienzo de la cohorte, no a una fecha de apertura o
        cierre de inscripciones.
      </div>

      <section className="conduccion-tarjeta" aria-label="Resumen de inscripciones">
        <div className="conduccion-tarjeta-cuerpo">
          <p className="font-semibold">
            {cohortes.length} cohortes registradas · {cantidadAbiertas} con
            inscripción abierta · {cohortes.length - cantidadAbiertas} cerradas
          </p>
        </div>
      </section>

      <section className="conduccion-tarjeta" aria-labelledby="titulo-listado-periodos">
        <header className="conduccion-tarjeta-encabezado">
          <h2 id="titulo-listado-periodos">Inscripciones por carrera y cohorte</h2>
        </header>

        <div className="conduccion-tarjeta-cuerpo">
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="periodos-carrera" className="mb-2 block font-semibold">
                Carrera
              </label>
              <select
                id="periodos-carrera"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
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

            <div>
              <label htmlFor="periodos-estado" className="mb-2 block font-semibold">
                Estado de inscripción
              </label>
              <select
                id="periodos-estado"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
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
          </div>

          {error && (
            <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-red-800">
              {error}
            </p>
          )}
          {mensaje && (
            <p role="status" className="mb-4 rounded-md bg-green-50 p-3 text-green-800">
              {mensaje}
            </p>
          )}
          {cargando && <p role="status">Cargando cohortes y carreras…</p>}

          {!cargando && !errorCarga && cohortes.length === 0 && (
            <p>No hay cohortes registradas.</p>
          )}
          {!cargando && !errorCarga && cohortes.length > 0 && cohortesFiltradas.length === 0 && (
            <p>No se encontraron cohortes para los filtros seleccionados.</p>
          )}

          {!cargando && !errorCarga && cohortesFiltradas.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th scope="col" className="px-3 py-3">Carrera</th>
                    <th scope="col" className="px-3 py-3">Cohorte</th>
                    <th scope="col" className="px-3 py-3">Año</th>
                    <th scope="col" className="px-3 py-3">Inicio de cohorte</th>
                    <th scope="col" className="px-3 py-3">Inscripción</th>
                    <th scope="col" className="px-3 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cohortesFiltradas.map((cohorte) => (
                    <tr key={cohorte.id} className="border-b border-gray-100">
                      <td className="px-3 py-3">
                        {cohorte.carrera_id
                          ? nombresCarreras.get(cohorte.carrera_id) ?? "Carrera no encontrada"
                          : "Sin carrera asociada"}
                      </td>
                      <td className="px-3 py-3 font-semibold">{cohorte.nombre}</td>
                      <td className="px-3 py-3">{cohorte.anio}</td>
                      <td className="px-3 py-3">{mostrarFecha(cohorte.fecha_inicio)}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                            cohorte.abierta
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {cohorte.abierta ? "Abierta" : "Cerrada"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          disabled={procesandoId !== null}
                          onClick={() => void cambiarInscripcion(cohorte)}
                          aria-label={`${cohorte.abierta ? "Cerrar" : "Abrir"} inscripciones de ${cohorte.nombre}`}
                          className={`rounded-md px-3 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                            cohorte.abierta
                              ? "bg-red-700 hover:bg-red-800"
                              : "bg-green-700 hover:bg-green-800"
                          }`}
                        >
                          {procesandoId === cohorte.id
                            ? "Guardando…"
                            : cohorte.abierta
                              ? "Cerrar inscripción"
                              : "Abrir inscripción"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!cargando && errorCarga && (
            <button
              type="button"
              onClick={() => {
                setCargando(true);
                setVersionConsulta((actual) => actual + 1);
              }}
              className="rounded-md border border-gray-300 px-3 py-2 font-semibold hover:bg-gray-50"
            >
              Reintentar
            </button>
          )}
        </div>
      </section>
    </section>
  );
}

