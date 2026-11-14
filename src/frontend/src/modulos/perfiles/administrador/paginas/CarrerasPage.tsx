// Permite realizar el ABML de las carreras de posgrado.

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { api } from "../../../../shared/api/client";
import type { TipoCarrera } from "../../../../shared/tipos";
import { useAuth } from "../../../manejo-sesion/useAuth";


interface Carrera {
  id: string;
  nombre: string;
  tipo: TipoCarrera;
  duracion: string;
  descripcion: string;
  activo: boolean;
}


interface FormularioCarrera {
  nombre: string;
  tipo: TipoCarrera;
  duracion: string;
  descripcion: string;
}


const formularioInicial: FormularioCarrera = {
  nombre: "",
  tipo: "Especializacion",
  duracion: "",
  descripcion: "",
};


const tiposCarrera: TipoCarrera[] = [
  "Especializacion",
  "Maestria",
  "Doctorado",
];


function obtenerNombreTipo(
  tipo: TipoCarrera
) {
  if (tipo === "Especializacion") {
    return "Especialización";
  }

  if (tipo === "Maestria") {
    return "Maestría";
  }

  return "Doctorado";
}


export default function CarrerasPage() {
  const { user } = useAuth();

  const [carreras, setCarreras] =
    useState<Carrera[]>([]);

  const [busqueda, setBusqueda] =
    useState("");

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [carreraEditando, setCarreraEditando] =
    useState<Carrera | null>(null);

  const [formulario, setFormulario] =
    useState<FormularioCarrera>(
      formularioInicial
    );


  const cargarCarreras = async () => {
    if (!user) {
      return;
    }

    try {
      setCargando(true);
      setError("");

      const respuesta =
        await api.get<Carrera[]>(
          "/carreras",
          user.token
        );

      setCarreras(respuesta);

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las carreras"
      );

    } finally {
      setCargando(false);
    }
  };


  useEffect(() => {
    if (!user) {
      return;
    }

    const cargar = async () => {
      try {
        setCargando(true);
        setError("");

        const respuesta =
          await api.get<Carrera[]>(
            "/carreras",
            user.token
          );

        setCarreras(respuesta);

      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las carreras"
        );

      } finally {
        setCargando(false);
      }
    };

    cargar();

  }, [user]);


  const abrirNuevaCarrera = () => {
    setCarreraEditando(null);
    setFormulario(formularioInicial);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  };


  const abrirEdicion = (
    carrera: Carrera
  ) => {
    setCarreraEditando(carrera);

    setFormulario({
      nombre: carrera.nombre,
      tipo: carrera.tipo,
      duracion: carrera.duracion,
      descripcion: carrera.descripcion,
    });

    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  };


  const cerrarFormulario = () => {
    setMostrarFormulario(false);
    setCarreraEditando(null);
    setFormulario(formularioInicial);
  };


  const actualizarFormulario = (
    campo: keyof FormularioCarrera,
    valor: string
  ) => {
    setFormulario(
      (anterior) => ({
        ...anterior,
        [campo]: valor,
      })
    );
  };


  const guardarCarrera = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    try {
      setError("");
      setMensaje("");

      if (carreraEditando) {
        await api.put<Carrera>(
          `/carreras/${carreraEditando.id}`,
          {
            nombre: formulario.nombre,
            tipo: formulario.tipo,
            duracion: formulario.duracion,
            descripcion: formulario.descripcion,
          },
          user.token
        );

        setMensaje(
          "La carrera fue actualizada correctamente."
        );

      } else {
        await api.post<Carrera>(
          "/carreras",
          {
            nombre: formulario.nombre,
            tipo: formulario.tipo,
            duracion: formulario.duracion,
            descripcion: formulario.descripcion,
          },
          user.token
        );

        setMensaje(
          "La carrera fue creada correctamente."
        );
      }

      cerrarFormulario();

      await cargarCarreras();

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la carrera"
      );
    }
  };


  const cambiarEstado = async (
    carrera: Carrera
  ) => {
    if (!user) {
      return;
    }

    const nuevoEstado =
      !carrera.activo;

    const accion =
      nuevoEstado
        ? "activar"
        : "desactivar";

    const confirmado =
      window.confirm(
        `¿Querés ${accion} la carrera "${carrera.nombre}"?`
      );

    if (!confirmado) {
      return;
    }

    try {
      setError("");
      setMensaje("");

      await api.patch<Carrera>(
        `/carreras/${carrera.id}/estado`,
        {
          activo: nuevoEstado,
        },
        user.token
      );

      setMensaje(
        nuevoEstado
          ? "La carrera fue activada correctamente."
          : "La carrera fue desactivada correctamente."
      );

      await cargarCarreras();

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo modificar el estado de la carrera"
      );
    }
  };


  const textoBusqueda =
    busqueda
      .trim()
      .toLowerCase();


  const carrerasFiltradas =
    carreras.filter(
      (carrera) => {
        if (!textoBusqueda) {
          return true;
        }

        return (
          carrera.nombre
            .toLowerCase()
            .includes(textoBusqueda) ||
          carrera.tipo
            .toLowerCase()
            .includes(textoBusqueda) ||
          carrera.duracion
            .toLowerCase()
            .includes(textoBusqueda)
        );
      }
    );


  return (
    <section>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Carreras
          </h1>

          <p className="mt-1 text-gray-500">
            Gestioná las carreras de posgrado.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirNuevaCarrera}
          className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          + Nueva carrera
        </button>
      </header>


      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700"
        >
          {error}
        </p>
      )}


      {mensaje && (
        <p
          role="status"
          className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-green-700"
        >
          {mensaje}
        </p>
      )}


      {mostrarFormulario && (
        <form
          onSubmit={guardarCarrera}
          className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <header className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {carreraEditando
                ? "Editar carrera"
                : "Nueva carrera"}
            </h2>
          </header>


          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="carrera-nombre"
                className="mb-2 block font-semibold text-gray-700"
              >
                Nombre
              </label>

              <input
                id="carrera-nombre"
                type="text"
                required
                value={formulario.nombre}
                onChange={(event) =>
                  actualizarFormulario(
                    "nombre",
                    event.target.value
                  )
                }
                className="w-full rounded-md border border-gray-300 p-2"
              />
            </div>


            <div>
              <label
                htmlFor="carrera-tipo"
                className="mb-2 block font-semibold text-gray-700"
              >
                Tipo
              </label>

              <select
                id="carrera-tipo"
                value={formulario.tipo}
                onChange={(event) =>
                  actualizarFormulario(
                    "tipo",
                    event.target.value
                  )
                }
                className="w-full rounded-md border border-gray-300 p-2"
              >
                {tiposCarrera.map(
                  (tipo) => (
                    <option
                      key={tipo}
                      value={tipo}
                    >
                      {obtenerNombreTipo(tipo)}
                    </option>
                  )
                )}
              </select>
            </div>


            <div>
              <label
                htmlFor="carrera-duracion"
                className="mb-2 block font-semibold text-gray-700"
              >
                Duración
              </label>

              <input
                id="carrera-duracion"
                type="text"
                required
                placeholder="Ej.: 2 años"
                value={formulario.duracion}
                onChange={(event) =>
                  actualizarFormulario(
                    "duracion",
                    event.target.value
                  )
                }
                className="w-full rounded-md border border-gray-300 p-2"
              />
            </div>


            <div className="md:col-span-2">
              <label
                htmlFor="carrera-descripcion"
                className="mb-2 block font-semibold text-gray-700"
              >
                Descripción
              </label>

              <textarea
                id="carrera-descripcion"
                required
                rows={4}
                value={formulario.descripcion}
                onChange={(event) =>
                  actualizarFormulario(
                    "descripcion",
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
              className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
            >
              {carreraEditando
                ? "Guardar cambios"
                : "Crear carrera"}
            </button>
          </footer>
        </form>
      )}


      <div className="mb-4">
        <label
          htmlFor="buscar-carrera"
          className="sr-only"
        >
          Buscar carrera
        </label>

        <input
          id="buscar-carrera"
          type="search"
          placeholder="Buscar por nombre, tipo o duración..."
          value={busqueda}
          onChange={(event) =>
            setBusqueda(
              event.target.value
            )
          }
          className="w-full rounded-md border border-gray-300 bg-white p-3 md:max-w-xl"
        />
      </div>


      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th scope="col" className="p-4">
                Nombre
              </th>

              <th scope="col" className="p-4">
                Tipo
              </th>

              <th scope="col" className="p-4">
                Duración
              </th>

              <th scope="col" className="p-4">
                Descripción
              </th>

              <th scope="col" className="p-4">
                Estado
              </th>

              <th scope="col" className="p-4">
                Acciones
              </th>
            </tr>
          </thead>


          <tbody>
            {cargando ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-gray-500"
                >
                  Cargando carreras...
                </td>
              </tr>
            ) : (
              <>
                {carrerasFiltradas.map(
                  (carrera) => (
                    <tr
                      key={carrera.id}
                      className="border-t border-gray-200"
                    >
                      <td className="p-4 font-semibold">
                        {carrera.nombre}
                      </td>

                      <td className="p-4">
                        {obtenerNombreTipo(
                          carrera.tipo
                        )}
                      </td>

                      <td className="p-4">
                        {carrera.duracion}
                      </td>

                      <td className="max-w-md p-4">
                        {carrera.descripcion}
                      </td>

                      <td className="p-4">
                        <span
                          className={
                            carrera.activo
                              ? "font-semibold text-green-700"
                              : "font-semibold text-gray-500"
                          }
                        >
                          {carrera.activo
                            ? "Activa"
                            : "Inactiva"}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              abrirEdicion(
                                carrera
                              )
                            }
                            className="font-semibold text-blue-600 hover:underline"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              cambiarEstado(
                                carrera
                              )
                            }
                            className={
                              carrera.activo
                                ? "font-semibold text-red-600 hover:underline"
                                : "font-semibold text-green-700 hover:underline"
                            }
                          >
                            {carrera.activo
                              ? "Desactivar"
                              : "Activar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}


                {carrerasFiltradas.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-gray-500"
                    >
                      No se encontraron carreras.
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}