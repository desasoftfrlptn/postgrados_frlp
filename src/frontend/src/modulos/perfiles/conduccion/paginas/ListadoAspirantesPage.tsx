
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";
import GestionInscripcion from "../componentes/GestionInscripcion";

import "../estilos/Conduccion.css";

interface LegajoConduccion {
  id: string;
  cohorte_id: string | null;
  carrera_elegida: string;
  apellido: string;
  nombre: string;
  dni_pasaporte: string;
  correo_electronico: string;
  estado: string;
  solicitud_beca: number | null;
}

interface Cohorte {
  id: string;
  nombre: string;
  anio: number;
  abierta: boolean;
}

interface FiltrosLegajos {
  cohorte_id: string;
  dni: string;
  apellido: string;
  carrera: string;
  estado: string;
  beca: string;
}

const filtrosIniciales: FiltrosLegajos = {
  cohorte_id: "",
  dni: "",
  apellido: "",
  carrera: "",
  estado: "",
  beca: "",
};

const estadosDisponibles = [
  { valor: "PENDIENTE", texto: "Pendiente" },
  { valor: "EN_REVISION", texto: "En revisión" },
  { valor: "OBSERVADO", texto: "Observado" },
  { valor: "COMPLETADO", texto: "Completado" },
  { valor: "APROBADO", texto: "Aprobado" },
  { valor: "RECHAZADO", texto: "Rechazado" },
  { valor: "ACTIVO", texto: "Activo" },
  { valor: "EN_RIESGO", texto: "En riesgo" },
  { valor: "VENCIDO", texto: "Vencido" },
  { valor: "GRADUADO", texto: "Graduado" },
  { valor: "BAJA", texto: "Baja" },
];

function construirConsulta(filtros: FiltrosLegajos): string {
  const parametros = new URLSearchParams();

  if (filtros.cohorte_id) {
    parametros.set("cohorte_id", filtros.cohorte_id);
  }

  if (filtros.dni.trim()) {
    parametros.set("dni", filtros.dni.trim());
  }

  if (filtros.apellido.trim()) {
    parametros.set("apellido", filtros.apellido.trim());
  }

  if (filtros.carrera.trim()) {
    parametros.set("carrera", filtros.carrera.trim());
  }

  if (filtros.estado) {
    parametros.set("estado", filtros.estado);
  }

  const consulta = parametros.toString();

  return consulta ? `?${consulta}` : "";
}

function obtenerClaseEstado(estado: string): string {
  switch (estado) {
    case "PENDIENTE":
      return "conduccion-listado-estado--pendiente";

    case "EN_REVISION":
      return "conduccion-listado-estado--revision";

    case "OBSERVADO":
    case "VENCIDO":
    case "EN_RIESGO":
      return "conduccion-listado-estado--advertencia";

    case "COMPLETADO":
    case "APROBADO":
    case "ACTIVO":
    case "GRADUADO":
      return "conduccion-listado-estado--exito";

    case "RECHAZADO":
    case "BAJA":
      return "conduccion-listado-estado--rechazado";

    default:
      return "conduccion-listado-estado--otro";
  }
}

function mostrarEstado(estado: string): string {
  const encontrado = estadosDisponibles.find(
    (item) => item.valor === estado
  );

  return encontrado?.texto ?? estado.replaceAll("_", " ");
}

export default function ListadoAspirantesPage() {
  const { user } = useAuth();

  const [legajos, setLegajos] = useState<LegajoConduccion[]>([]);
  const [cohortes, setCohortes] = useState<Cohorte[]>([]);

  const [filtros, setFiltros] = useState<FiltrosLegajos>({
    ...filtrosIniciales,
  });

  const [filtrosAplicados, setFiltrosAplicados] =
    useState<FiltrosLegajos>({
      ...filtrosIniciales,
    });

  const [mostrarAvanzados, setMostrarAvanzados] =
    useState(false);

  const [cargando, setCargando] = useState(false);
  const [cargandoCohortes, setCargandoCohortes] =
    useState(true);

  const [error, setError] = useState<string | null>(null);
  const [errorCohortes, setErrorCohortes] =
    useState<string | null>(null);

  const [reintento, setReintento] = useState(0);

  const [legajoGestionandoId, setLegajoGestionandoId] =
    useState<string | null>(null);

  // Cargar cohortes disponibles.
  useEffect(() => {
    let activo = true;

    async function cargarCohortes() {
      setCargandoCohortes(true);

      try {
        const resultado = await api.get<Cohorte[]>("/cohortes");

        if (activo) {
          setCohortes(resultado);
          setErrorCohortes(null);
        }
      } catch {
        if (activo) {
          setCohortes([]);
          setErrorCohortes(
            "No se pudieron cargar las cohortes."
          );
        }
      } finally {
        if (activo) {
          setCargandoCohortes(false);
        }
      }
    }

    void cargarCohortes();

    return () => {
      activo = false;
    };
  }, []);

  // Aplicar automáticamente los filtros de texto.
  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      setFiltrosAplicados((anteriores) => {
        if (
          anteriores.dni === filtros.dni &&
          anteriores.apellido === filtros.apellido &&
          anteriores.carrera === filtros.carrera
        ) {
          return anteriores;
        }

        return {
          ...anteriores,
          dni: filtros.dni,
          apellido: filtros.apellido,
          carrera: filtros.carrera,
        };
      });
    }, 350);

    return () => {
      window.clearTimeout(temporizador);
    };
  }, [filtros.dni, filtros.apellido, filtros.carrera]);

  // Consultar aspirantes según los filtros.
  useEffect(() => {
    let activo = true;

    async function cargarLegajos() {
      setCargando(true);
      setError(null);

      if (!filtrosAplicados.cohorte_id) {
        setLegajos([]);
        setCargando(false);
        return;
      }

      if (!user?.token) {
        setLegajos([]);
        setError("No hay una sesión activa.");
        setCargando(false);
        return;
      }

      try {
        const consulta = construirConsulta(filtrosAplicados);

        const resultado = await api.get<LegajoConduccion[]>(
          `/inscripcion/${consulta}`,
          user.token
        );

        if (!activo) return;

        const legajosFiltrados = resultado.filter((legajo) => {
          const beca = filtrosAplicados.beca;

          if (beca === "") return true;

          if (beca === "SOLICITO") {
            return legajo.solicitud_beca != null;
          }

          if (beca === "SIN_BECA") {
            return legajo.solicitud_beca == null;
          }

          return legajo.solicitud_beca === Number(beca);
        });

        setLegajos(legajosFiltrados);
        setError(null);
      } catch (err) {
        if (activo) {
          setLegajos([]);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los aspirantes."
          );
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    void cargarLegajos();

    return () => {
      activo = false;
    };
  }, [user?.token, filtrosAplicados, reintento]);

  function actualizarFiltro(
    campo: keyof FiltrosLegajos,
    valor: string
  ) {
    setFiltros((anteriores) => ({
      ...anteriores,
      [campo]: valor,
    }));

    if (
      campo === "cohorte_id" ||
      campo === "estado" ||
      campo === "beca"
    ) {
      setFiltrosAplicados((anteriores) => ({
        ...anteriores,
        [campo]: valor,
      }));
    }

    if (campo === "cohorte_id") {
      setLegajoGestionandoId(null);
    }
  }

  function limpiarFiltros() {
    setFiltros({ ...filtrosIniciales });
    setFiltrosAplicados({ ...filtrosIniciales });
    setLegajoGestionandoId(null);
    setReintento((anterior) => anterior + 1);
  }

  function obtenerNombreCohorte(
    cohorteId: string | null
  ): string {
    if (!cohorteId) return "Sin asignar";

    return (
      cohortes.find((item) => item.id === cohorteId)?.nombre ??
      "Cohorte no disponible"
    );
  }

  // Actualizar la interfaz después de una operación confirmada.
  function alActualizarEstado(
    legajoId: string,
    estado: string
  ) {
    setLegajos((anteriores) =>
      anteriores.map((legajo) =>
        legajo.id === legajoId
          ? { ...legajo, estado }
          : legajo
      )
    );

    // Volver a consultar el backend.
    setReintento((anterior) => anterior + 1);
  }

  function abrirGestion(legajoId: string) {
    setLegajoGestionandoId((actual) =>
      actual === legajoId ? null : legajoId
    );
  }

  const legajoGestionando =
    legajos.find(
      (legajo) => legajo.id === legajoGestionandoId
    ) ?? null;

  const hayFiltros = Object.values(filtros).some(
    (valor) => valor.trim() !== ""
  );

  const cantidadFiltrosAvanzados =
    Number(Boolean(filtros.carrera)) +
    Number(Boolean(filtros.estado)) +
    Number(Boolean(filtros.beca));

  return (
    <section
      className="perfil-pagina conduccion-listado"
      aria-labelledby="titulo-aspirantes"
    >
      {/* Encabezado */}
      <header className="perfil-pagina-encabezado conduccion-listado-encabezado">
        <span className="conduccion-listado-eyebrow">
          EQUIPO DE CONDUCCIÓN / ADMISIÓN
        </span>

        <h1 id="titulo-aspirantes">Aspirantes</h1>

        <p>
          Consultá las inscripciones, revisá los legajos y
          gestioná el proceso de admisión.
        </p>
      </header>

      {/* Listado */}
      <section
        className="conduccion-listado-panel"
        aria-labelledby="titulo-resultados"
      >
        <header className="conduccion-listado-superior">
          <div>
            <h2 id="titulo-resultados">
              Inscripciones registradas
            </h2>

            <p>
              Seleccioná una cohorte y utilizá los filtros
              para encontrar aspirantes.
            </p>
          </div>

          <span
            className="conduccion-listado-contador"
            role="status"
            aria-live="polite"
          >
            {cargando
              ? "Actualizando..."
              : error
                ? "Sin datos"
                : `${legajos.length} resultados`}
          </span>
        </header>

        {/* Filtros */}
        <div
          className="conduccion-listado-filtros"
          role="search"
          aria-label="Filtros de aspirantes"
        >
          <div className="conduccion-listado-filtros-principales">
            <div className="conduccion-listado-campo">
              <label htmlFor="filtro-cohorte">
                Cohorte
              </label>

              <select
                id="filtro-cohorte"
                value={filtros.cohorte_id}
                disabled={cargandoCohortes}
                onChange={(evento) =>
                  actualizarFiltro(
                    "cohorte_id",
                    evento.target.value
                  )
                }
              >
                <option value="">
                  {cargandoCohortes
                    ? "Cargando cohortes..."
                    : "Seleccioná una cohorte"}
                </option>

                {cohortes.map((cohorte) => (
                  <option
                    key={cohorte.id}
                    value={cohorte.id}
                  >
                    {cohorte.nombre} ({cohorte.anio})
                    {cohorte.abierta
                      ? " - Abierta"
                      : " - Cerrada"}
                  </option>
                ))}
              </select>
            </div>

            <div className="conduccion-listado-campo">
              <label htmlFor="filtro-dni">
                DNI / Pasaporte
              </label>

              <input
                id="filtro-dni"
                type="search"
                value={filtros.dni}
                onChange={(evento) =>
                  actualizarFiltro(
                    "dni",
                    evento.target.value
                  )
                }
                placeholder="Buscar por documento"
              />
            </div>

            <div className="conduccion-listado-campo">
              <label htmlFor="filtro-apellido">
                Apellido
              </label>

              <input
                id="filtro-apellido"
                type="search"
                value={filtros.apellido}
                onChange={(evento) =>
                  actualizarFiltro(
                    "apellido",
                    evento.target.value
                  )
                }
                placeholder="Buscar por apellido"
              />
            </div>
          </div>

          {/* Acciones de filtros */}
          <div className="conduccion-listado-filtros-acciones">
            <button
              type="button"
              className="conduccion-listado-boton-secundario"
              aria-expanded={mostrarAvanzados}
              aria-controls="filtros-avanzados"
              onClick={() =>
                setMostrarAvanzados((anterior) => !anterior)
              }
            >
              {mostrarAvanzados
                ? "Ocultar filtros"
                : "Más filtros"}

              {cantidadFiltrosAvanzados > 0
                ? ` (${cantidadFiltrosAvanzados})`
                : ""}
            </button>

            <button
              type="button"
              className="conduccion-listado-boton-texto"
              disabled={!hayFiltros}
              onClick={limpiarFiltros}
            >
              Limpiar filtros
            </button>
          </div>

          {/* Filtros avanzados */}
          <div
            id="filtros-avanzados"
            hidden={!mostrarAvanzados}
            className="conduccion-listado-avanzados"
          >
            <div className="conduccion-listado-campo">
              <label htmlFor="filtro-carrera">
                Carrera
              </label>

              <input
                id="filtro-carrera"
                type="search"
                value={filtros.carrera}
                onChange={(evento) =>
                  actualizarFiltro(
                    "carrera",
                    evento.target.value
                  )
                }
                placeholder="Nombre de la carrera"
              />
            </div>

            <div className="conduccion-listado-campo">
              <label htmlFor="filtro-estado">
                Filtrar por estado
              </label>

              <select
                id="filtro-estado"
                value={filtros.estado}
                onChange={(evento) =>
                  actualizarFiltro(
                    "estado",
                    evento.target.value
                  )
                }
              >
                <option value="">
                  Todos los estados
                </option>

                {estadosDisponibles.map((estado) => (
                  <option
                    key={estado.valor}
                    value={estado.valor}
                  >
                    {estado.texto}
                  </option>
                ))}
              </select>
            </div>

            <div className="conduccion-listado-campo">
              <label htmlFor="filtro-beca">
                Solicitud de beca
              </label>

              <select
                id="filtro-beca"
                value={filtros.beca}
                onChange={(evento) =>
                  actualizarFiltro(
                    "beca",
                    evento.target.value
                  )
                }
              >
                <option value="">Todas</option>
                <option value="SOLICITO">
                  Solicitó beca
                </option>
                <option value="SIN_BECA">
                  No solicitó beca
                </option>
                <option value="30">
                  Beca del 30 %
                </option>
                <option value="100">
                  Beca del 100 %
                </option>
              </select>
            </div>
          </div>

          {errorCohortes && (
            <p
              className="conduccion-listado-error"
              role="alert"
            >
              {errorCohortes}
            </p>
          )}
        </div>

        {/* Resultados */}
        <div className="conduccion-listado-resultados">
          {cargando && (
            <p
              className="conduccion-listado-mensaje"
              role="status"
            >
              Buscando aspirantes...
            </p>
          )}

          {!cargando && error && (
            <div
              className="conduccion-listado-mensaje"
              role="alert"
            >
              <p className="conduccion-listado-error">
                {error}
              </p>

              <button
                type="button"
                className="conduccion-listado-boton-secundario"
                onClick={() =>
                  setReintento((anterior) => anterior + 1)
                }
              >
                Reintentar
              </button>
            </div>
          )}

          {!cargando &&
            !error &&
            legajos.length === 0 && (
              <div className="conduccion-listado-vacio">
                <strong>
                  No encontramos inscripciones
                </strong>

                <p>
                  {!filtrosAplicados.cohorte_id
                    ? "Seleccioná una cohorte para consultar sus legajos."
                    : "Probá cambiando la cohorte o quitando alguno de los filtros."}
                </p>

                {hayFiltros && (
                  <button
                    type="button"
                    className="conduccion-listado-boton-secundario"
                    onClick={limpiarFiltros}
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}

          {!cargando &&
            !error &&
            legajos.length > 0 && (
              <div className="conduccion-listado-tabla-scroll">
                <table className="conduccion-listado-tabla">
                  <thead>
                    <tr>
                      <th scope="col">Aspirante</th>
                      <th scope="col">DNI / Pasaporte</th>
                      <th scope="col">Carrera</th>
                      <th scope="col">Cohorte</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {legajos.map((legajo) => (
                      <tr key={legajo.id}>
                        <td>
                          <div className="conduccion-listado-persona">
                            <span
                              className="conduccion-listado-avatar"
                              aria-hidden="true"
                            >
                              {legajo.nombre.charAt(0)}
                              {legajo.apellido.charAt(0)}
                            </span>

                            <div className="conduccion-listado-persona-datos">
                              <span className="conduccion-listado-nombre">
                                {legajo.apellido},{" "}
                                {legajo.nombre}
                              </span>

                              <span className="conduccion-listado-email">
                                {legajo.correo_electronico}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="conduccion-listado-documento">
                          {legajo.dni_pasaporte}
                        </td>

                        <td>
                          {legajo.carrera_elegida}
                        </td>

                        <td>
                          <span className="conduccion-listado-cohorte">
                            {obtenerNombreCohorte(
                              legajo.cohorte_id
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`conduccion-listado-estado ${obtenerClaseEstado(
                              legajo.estado
                            )}`}
                          >
                            {mostrarEstado(legajo.estado)}
                          </span>
                        </td>

                        <td>
                          <div className="conduccion-listado-acciones-fila">
                            <Link
                              className="conduccion-listado-link"
                              to={`/dashboard/conduccion/legajos/${encodeURIComponent(
                                legajo.id
                              )}`}
                            >
                              Ver legajo
                            </Link>

                            <button
                              type="button"
                              className="conduccion-listado-boton-secundario"
                              aria-expanded={
                                legajoGestionandoId === legajo.id
                              }
                              aria-controls="panel-gestion-aspirante"
                              onClick={() =>
                                abrirGestion(legajo.id)
                              }
                            >
                              {legajoGestionandoId === legajo.id
                                ? "Cerrar gestión"
                                : "Gestionar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      </section>

      {/* Panel de gestión */}
      {legajoGestionando && user?.token && (
        <section
          id="panel-gestion-aspirante"
          className="conduccion-listado-panel conduccion-panel-gestion"
          aria-labelledby="titulo-gestion-aspirante"
        >
          <header className="conduccion-panel-gestion-cabecera">
            <div>
              <p className="conduccion-resumen-etiqueta">
                GESTIÓN DE ADMISIÓN
              </p>

              <h2 id="titulo-gestion-aspirante">
                {legajoGestionando.nombre}{" "}
                {legajoGestionando.apellido}
              </h2>

              <p>
                {legajoGestionando.carrera_elegida}
              </p>

              <p>
                Estado actual:{" "}
                <strong>
                  {mostrarEstado(
                    legajoGestionando.estado
                  )}
                </strong>
              </p>
            </div>

            <button
              type="button"
              className="conduccion-listado-boton-secundario"
              onClick={() => setLegajoGestionandoId(null)}
            >
              Cerrar
            </button>
          </header>

          <p>
            Revisá la inscripción y seleccioná una
            acción de admisión. Los cambios deben
            ser validados por el sistema.
          </p>

          <GestionInscripcion
            key={legajoGestionando.id}
            legajoId={legajoGestionando.id}
            onEstadoActualizado={(estado) =>
              alActualizarEstado(
                legajoGestionando.id,
                estado
              )
            }
          />
        </section>
      )}
    </section>
  );
}
