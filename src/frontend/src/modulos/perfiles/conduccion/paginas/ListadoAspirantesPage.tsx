
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";

interface LegajoConduccion {
  id: string;
  carrera_elegida: string;
  apellido: string;
  nombre: string;
  dni_pasaporte: string;
  correo_electronico: string;
  estado: string;
}

interface FiltrosLegajos {
  dni: string;
  apellido: string;
  carrera: string;
  estado: string;
}

const filtrosIniciales: FiltrosLegajos = {
  dni: "",
  apellido: "",
  carrera: "",
  estado: "",
};

function construirConsulta(filtros: FiltrosLegajos): string {
  const parametros = new URLSearchParams();

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

function obtenerEstiloEstado(estado: string): string {
  switch (estado) {
    case "PENDIENTE":
      return "bg-yellow-100 text-yellow-800";
    case "EN_REVISION":
      return "bg-blue-100 text-blue-800";
    case "OBSERVADO":
      return "bg-orange-100 text-orange-800";
    case "COMPLETADO":
      return "bg-green-100 text-green-800";
    case "ACTIVO":
      return "bg-emerald-100 text-emerald-800";
    case "RECHAZADO":
    case "BAJA":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function ListadoAspirantesPage() {
  const { user } = useAuth();

  const [legajos, setLegajos] = useState<LegajoConduccion[]>([]);

  const [filtros, setFiltros] = useState<FiltrosLegajos>({
    ...filtrosIniciales,
  });

  const [filtrosAplicados, setFiltrosAplicados] =
    useState<FiltrosLegajos>({ ...filtrosIniciales });

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reintento, setReintento] = useState(0);

  useEffect(() => {
    let activo = true;

    async function cargarLegajos() {
      setCargando(true);

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

        if (activo) {
          setLegajos(resultado);
          setError(null);
        }
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
  }

  function buscarAspirantes(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();
    setFiltrosAplicados({ ...filtros });
    setReintento((anterior) => anterior + 1);
  }

  function limpiarFiltros() {
    setFiltros({ ...filtrosIniciales });
    setFiltrosAplicados({ ...filtrosIniciales });
    setReintento((anterior) => anterior + 1);
  }

  function reintentarConsulta() {
    setReintento((anterior) => anterior + 1);
  }

  const claseCampo =
    "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

  return (
    <section
      className="perfil-pagina"
      aria-labelledby="titulo-aspirantes"
    >
      <header className="perfil-pagina-encabezado">
        <h1 id="titulo-aspirantes">
          Listado de aspirantes
        </h1>

        <p>
          Consultá las inscripciones registradas,
          buscá aspirantes y accedé a sus legajos.
        </p>
      </header>

      {/* FILTROS DE BÚSQUEDA */}
      <section
        aria-labelledby="titulo-filtros"
        className="mt-6 rounded-xl border border-gray-100 bg-white shadow-sm"
      >
        <header className="rounded-t-xl border-b border-gray-100 bg-slate-50 p-6">
          <h2
            id="titulo-filtros"
            className="text-lg font-bold text-gray-900"
          >
            Buscar aspirantes
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Utilizá uno o varios filtros para encontrar
            una inscripción.
          </p>
        </header>

        <form
          onSubmit={buscarAspirantes}
          className="p-6"
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="filtro-dni"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                DNI o pasaporte
              </label>

              <input
                id="filtro-dni"
                type="text"
                className={claseCampo}
                value={filtros.dni}
                onChange={(evento) =>
                  actualizarFiltro(
                    "dni",
                    evento.target.value
                  )
                }
                placeholder="Ingresá el documento"
              />
            </div>

            <div>
              <label
                htmlFor="filtro-apellido"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Apellido
              </label>

              <input
                id="filtro-apellido"
                type="text"
                minLength={3}
                className={claseCampo}
                value={filtros.apellido}
                onChange={(evento) =>
                  actualizarFiltro(
                    "apellido",
                    evento.target.value
                  )
                }
                placeholder="Ingresá al menos 3 caracteres"
              />
            </div>

            <div>
              <label
                htmlFor="filtro-carrera"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Carrera
              </label>

              <input
                id="filtro-carrera"
                type="text"
                className={claseCampo}
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

            <div>
              <label
                htmlFor="filtro-estado"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Estado
              </label>

              <select
                id="filtro-estado"
                className={claseCampo}
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
                <option value="PENDIENTE">
                  Pendiente
                </option>
                <option value="EN_REVISION">
                  En revisión
                </option>
                <option value="OBSERVADO">
                  Observado
                </option>
                <option value="COMPLETADO">
                  Completado
                </option>
                <option value="RECHAZADO">
                  Rechazado
                </option>
                <option value="ACTIVO">
                  Activo
                </option>
                <option value="EN_RIESGO">
                  En riesgo
                </option>
                <option value="VENCIDO">
                  Vencido
                </option>
                <option value="GRADUADO">
                  Graduado
                </option>
                <option value="BAJA">
                  Baja
                </option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={cargando}
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cargando ? "Buscando..." : "Buscar"}
            </button>

            <button
              type="button"
              onClick={limpiarFiltros}
              disabled={cargando}
              className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Limpiar filtros
            </button>
          </div>
        </form>
      </section>

      {/* RESULTADOS */}
      <section
        aria-labelledby="titulo-resultados"
        className="mt-6 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-slate-50 p-6">
          <h2
            id="titulo-resultados"
            className="text-lg font-bold text-gray-900"
          >
            Inscripciones registradas
          </h2>

          {!cargando && !error && (
            <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              {legajos.length} resultados
            </span>
          )}
        </header>

        {cargando && (
          <p
            role="status"
            className="p-6 text-sm text-slate-600"
          >
            Cargando aspirantes...
          </p>
        )}

        {!cargando && error && (
          <div role="alert" className="p-6">
            <p className="text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={reintentarConsulta}
              className="mt-4 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Reintentar
            </button>
          </div>
        )}

        {!cargando && !error && legajos.length === 0 && (
          <p
            role="status"
            className="p-6 text-sm text-slate-600"
          >
            No se encontraron aspirantes con los
            criterios seleccionados.
          </p>
        )}

        {!cargando && !error && legajos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">
                Aspirantes registrados en el sistema
              </caption>

              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th
                    scope="col"
                    className="px-5 py-4 font-semibold"
                  >
                    Apellido y nombre
                  </th>

                  <th
                    scope="col"
                    className="px-5 py-4 font-semibold"
                  >
                    DNI / Pasaporte
                  </th>

                  <th
                    scope="col"
                    className="px-5 py-4 font-semibold"
                  >
                    Carrera
                  </th>

                  <th
                    scope="col"
                    className="px-5 py-4 font-semibold"
                  >
                    Correo electrónico
                  </th>

                  <th
                    scope="col"
                    className="px-5 py-4 font-semibold"
                  >
                    Estado
                  </th>

                  <th
                    scope="col"
                    className="px-5 py-4 font-semibold"
                  >
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {legajos.map((legajo) => (
                  <tr
                    key={legajo.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-5 py-4 font-medium text-gray-900">
                      {legajo.apellido}, {legajo.nombre}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {legajo.dni_pasaporte}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {legajo.carrera_elegida}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {legajo.correo_electronico}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${obtenerEstiloEstado(legajo.estado)}`}
                      >
                        {legajo.estado.replaceAll("_", " ")}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        to={`/dashboard/conduccion/legajos/${encodeURIComponent(legajo.id)}`}
                        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        aria-label={`Ver legajo de ${legajo.apellido}, ${legajo.nombre}`}
                      >
                        Ver legajo →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
