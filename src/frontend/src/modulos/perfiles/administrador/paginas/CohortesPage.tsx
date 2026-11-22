// Permite administrar los ciclos y cohortes de las carreras.

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { api } from "../../../../shared/api/client";
import ConfirmacionModal from "../../../../shared/componentes/ConfirmacionModal/ConfirmacionModal";
import MensajeSistema from "../../../../shared/componentes/MensajeSistema/MensajeSistema";
import FiltroEstado, { type EstadoFiltro } from "../componentes/FiltroEstado";
import { coincideEstado } from "../utils/filtros";
import "../estilos/FiltrosAcademicos.css";
import { useConfirmacion } from "../../../../shared/hooks/useConfirmacion";

import { useAuth } from "../../../manejo-sesion/useAuth";


interface Carrera {
  id: string;
  nombre: string;
  activo: boolean;
}


interface Cohorte {
  id: string;
  anio: number;
  nombre: string;
  carrera_id: string;
  abierta: boolean;
  fecha_inicio: string | null;
  created_at: string;
}


interface FormularioCohorte {
  anio: string;
  nombre: string;
  carrera_id: string;
  fecha_inicio: string;
}


const formularioInicial: FormularioCohorte = {
  anio: "",
  nombre: "",
  carrera_id: "",
  fecha_inicio: "",
};


export default function CohortesPage() {
  const confirmacion = useConfirmacion();
  const [busqueda, setBusqueda] = useState("");
  const [carreraFiltro, setCarreraFiltro] = useState("");
  const [anioFiltro, setAnioFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("todos");

  const { user } = useAuth();

  const [cohortes, setCohortes] =
    useState<Cohorte[]>([]);

  const [carreras, setCarreras] =
    useState<Carrera[]>([]);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [formulario, setFormulario] =
    useState<FormularioCohorte>(
      formularioInicial
    );


  const cargarCohortes = async () => {
    if (!user) {
      return;
    }

    try {
      setError("");

      const respuesta =
        await api.get<Cohorte[]>(
          "/cohortes",
          user.token
        );

      setCohortes(respuesta);

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las cohortes"
      );
    }
  };


  useEffect(() => {
    if (!user) {
      return;
    }

    const cargarDatos = async () => {
      try {
        setCargando(true);
        setError("");

        const [
          respuestaCohortes,
          respuestaCarreras,
        ] = await Promise.all([
          api.get<Cohorte[]>(
            "/cohortes",
            user.token
          ),

          api.get<Carrera[]>(
            "/carreras",
            user.token
          ),
        ]);

        setCohortes(respuestaCohortes);
        setCarreras(respuestaCarreras);

      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los datos"
        );

      } finally {
        setCargando(false);
      }
    };

    cargarDatos();

  }, [user]);


  const abrirNuevaCohorte = () => {
    setFormulario(formularioInicial);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  };


  const cerrarFormulario = () => {
    setMostrarFormulario(false);
    setFormulario(formularioInicial);
  };


  const actualizarFormulario = (
    campo: keyof FormularioCohorte,
    valor: string
  ) => {
    setFormulario(
      (anterior) => ({
        ...anterior,
        [campo]: valor,
      })
    );
  };


  // Solicita confirmación antes de guardar.
  const guardarCohorte = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }

    confirmacion.solicitar({
      titulo: "Confirmar guardado de cohorte",
      descripcion: "¿Confirmás que deseás guardar los datos ingresados?",
      textoConfirmar: "Confirmar guardado",
      ejecutar: ejecutarGuardado,
    });
  };

  // Persiste los datos después de confirmar.
  const ejecutarGuardado = async () => {

    if (!user) {
      return;
    }

    try {
      setError("");
      setMensaje("");

      await api.post<Cohorte>(
        "/cohortes",
        {
          anio: Number(formulario.anio),
          nombre: formulario.nombre.trim(),
          carrera_id: formulario.carrera_id,
          fecha_inicio:
            formulario.fecha_inicio || null,
        },
        user.token
      );

      setMensaje(
        "La cohorte fue creada correctamente."
      );

      cerrarFormulario();

      await cargarCohortes();

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo crear la cohorte"
      );
    }
  };


  const cambiarEstado = async (cohorte: Cohorte) => {
    if (!user) {
      return;
    }

    const nuevoEstado = !cohorte.abierta;

    const accion = nuevoEstado ? "abrir" : "cerrar";

    confirmacion.solicitar({
      titulo: "Confirmar cambio de estado",
      descripcion: `¿Querés ${accion} la cohorte "${cohorte.nombre}"?`,
      textoConfirmar: "Confirmar",
      peligroso: false,
      ejecutar: async () => {
        try {
      setError("");
      setMensaje("");

      await api.patch<Cohorte>(
        `/cohortes/${cohorte.id}/inscripcion`,
        {
          abierta: nuevoEstado,
        },
        user.token
      );

      setMensaje(
        nuevoEstado
          ? "La cohorte fue abierta correctamente."
          : "La cohorte fue cerrada correctamente."
      );

      await cargarCohortes();

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo modificar el estado de la cohorte"
      );
    }
      },
    });
  };


  const obtenerNombreCarrera = (
    carreraId: string
  ) => {
    const carrera =
      carreras.find(
        (item) => item.id === carreraId
      );

    return carrera
      ? carrera.nombre
      : "Carrera no encontrada";
  };


  const cohortesFiltradas = cohortes.filter(cohorte =>
    coincideEstado(cohorte.abierta, estadoFiltro) &&
    (!carreraFiltro || cohorte.carrera_id === carreraFiltro) &&
    (!anioFiltro || String(cohorte.anio) === anioFiltro) &&
    `${cohorte.nombre} ${obtenerNombreCarrera(cohorte.carrera_id)}`.toLowerCase().includes(busqueda.trim().toLowerCase())
  );

  return (
    <section>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Cohortes
          </h1>

          <p className="mt-1 text-gray-500">
            Administrá los ciclos y cohortes de las carreras.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirNuevaCohorte}
          className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          + Nueva cohorte
        </button>
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


      {mostrarFormulario && (
        <form
          onSubmit={guardarCohorte}
          className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <header className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Nueva cohorte
            </h2>
          </header>


          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="cohorte-nombre"
                className="mb-2 block font-semibold text-gray-700"
              >
                Nombre
              </label>

              <input
                id="cohorte-nombre"
                type="text"
                required
                maxLength={50}
                value={formulario.nombre}
                onChange={(event) =>
                  actualizarFormulario(
                    "nombre",
                    event.target.value
                  )
                }
                placeholder="Ej.: Cohorte 2026"
                className="w-full rounded-md border border-gray-300 p-2"
              />
            </div>


            <div>
              <label
                htmlFor="cohorte-anio"
                className="mb-2 block font-semibold text-gray-700"
              >
                Año
              </label>

              <input
                id="cohorte-anio"
                type="number"
                required
                min={1}
                step={1}
                value={formulario.anio}
                onChange={(event) =>
                  actualizarFormulario(
                    "anio",
                    event.target.value
                  )
                }
                placeholder="Ej.: 2026"
                className="w-full rounded-md border border-gray-300 p-2"
              />
            </div>


            <div>
              <label
                htmlFor="cohorte-carrera"
                className="mb-2 block font-semibold text-gray-700"
              >
                Carrera
              </label>

              <select
                id="cohorte-carrera"
                required
                value={formulario.carrera_id}
                onChange={(event) =>
                  actualizarFormulario(
                    "carrera_id",
                    event.target.value
                  )
                }
                className="w-full rounded-md border border-gray-300 p-2"
              >
                <option value="">
                  Seleccionar carrera
                </option>

                {carreras
                  .filter((carrera) => carrera.activo)
                  .map((carrera) => (
                    <option
                      key={carrera.id}
                      value={carrera.id}
                    >
                      {carrera.nombre}
                    </option>
                  ))}
              </select>
            </div>


            <div>
              <label
                htmlFor="cohorte-fecha"
                className="mb-2 block font-semibold text-gray-700"
              >
                Fecha de inicio
              </label>

              <input
                id="cohorte-fecha"
                type="date"
                value={formulario.fecha_inicio}
                onChange={(event) =>
                  actualizarFormulario(
                    "fecha_inicio",
                    event.target.value
                  )
                }
                className="w-full rounded-md border border-gray-300 p-2"
              />
            </div>
          </div>


          <footer className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={cerrarFormulario}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={
                carreras.filter(
                  (carrera) => carrera.activo
                ).length === 0
              }
              className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Crear cohorte
            </button>
          </footer>
        </form>
      )}


      <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">
          Listado de cohortes
        </h2>


        <div className="admin-filtros-academicos">
        <FiltroEstado valor={estadoFiltro} alCambiar={setEstadoFiltro} textoActivo="Abiertas" textoInactivo="Cerradas"/>
        <div className="admin-filtro-campo"><label htmlFor="buscar-cohorte">Buscar cohorte</label><input id="buscar-cohorte" type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></div>
<div className="admin-filtro-campo"><label htmlFor="filtro-carrera-cohorte">Carrera</label><select id="filtro-carrera-cohorte" value={carreraFiltro} onChange={e => setCarreraFiltro(e.target.value)}><option value="">Todas</option>{carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
<div className="admin-filtro-campo"><label htmlFor="filtro-anio-cohorte">Año</label><select id="filtro-anio-cohorte" value={anioFiltro} onChange={e => setAnioFiltro(e.target.value)}><option value="">Todos</option>{Array.from(new Set(cohortes.map(c => c.anio))).sort((a,b) => b-a).map(anio => <option key={anio} value={anio}>{anio}</option>)}</select></div>
        <button type="button" className="admin-limpiar-filtros" onClick={() => { setEstadoFiltro("todos"); setBusqueda(""); setCarreraFiltro(""); setAnioFiltro(""); }}>Limpiar filtros</button>
      </div>
        {cargando ? (
          <p className="mt-4 text-gray-500">
            Cargando cohortes...
          </p>
        ) : cohortesFiltradas.length === 0 ? (
          <p className="mt-4 text-gray-500">
            {cohortes.length === 0 ? "Todavía no hay cohortes registradas." : "No hay cohortes que coincidan con los filtros."}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-sm text-gray-500">
                  <th className="px-3 py-3">Año</th>
                  <th className="px-3 py-3">Nombre</th>
                  <th className="px-3 py-3">Carrera</th>
                  <th className="px-3 py-3">Fecha de inicio</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {cohortesFiltradas.map((cohorte) => (
                  <tr
                    key={cohorte.id}
                    className="border-b border-gray-100"
                  >
                    <td className="px-3 py-3">
                      {cohorte.anio}
                    </td>

                    <td className="px-3 py-3 font-medium text-gray-900">
                      {cohorte.nombre}
                    </td>

                    <td className="px-3 py-3">
                      {obtenerNombreCarrera(
                        cohorte.carrera_id
                      )}
                    </td>

                    <td className="px-3 py-3">
                      {cohorte.fecha_inicio
                        ? cohorte.fecha_inicio
                            .split("-")
                            .reverse()
                            .join("/")
                        : "Sin fecha"}
                    </td>

                    <td className="px-3 py-3">
                      {cohorte.abierta
                        ? "Abierta"
                        : "Cerrada"}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => cambiarEstado(cohorte)}
                        className={
                          cohorte.abierta
                            ? "rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                            : "rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
                        }
                      >
                        {cohorte.abierta
                          ? "Cerrar cohorte"
                          : "Abrir cohorte"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
      <ConfirmacionModal
        abierto={confirmacion.abierto}
        titulo={confirmacion.titulo}
        descripcion={confirmacion.descripcion}
        textoConfirmar={confirmacion.textoConfirmar}
        peligroso={confirmacion.peligroso}
        confirmando={confirmacion.procesando}
        alConfirmar={confirmacion.confirmar}
        alCancelar={confirmacion.cancelar}
      />
    </section>
  );
}
