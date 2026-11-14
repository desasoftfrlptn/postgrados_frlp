// Permite realizar el ABML de los seminarios.

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { api } from "../../../../shared/api/client";
import type {
  Rol,
  TipoCarrera,
} from "../../../../shared/tipos";
import { useAuth } from "../../../manejo-sesion/useAuth";


interface Carrera {
  id: string;
  nombre: string;
  tipo: TipoCarrera;
  duracion: string;
  descripcion: string;
  activo: boolean;
}


interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  correo_electronico: string;
  rol: Rol;
  activo: boolean;
}


interface Seminario {
  id: string;
  nombre: string;

  carrera_id: string;
  carrera_nombre: string;

  docente_id: string;
  docente_nombre: string;

  fecha_inicio: string;
  fecha_fin: string;

  activo: boolean;
}


interface FormularioSeminario {
  nombre: string;
  carrera_id: string;
  docente_id: string;
  fecha_inicio: string;
  fecha_fin: string;
}


const formularioInicial: FormularioSeminario = {
  nombre: "",
  carrera_id: "",
  docente_id: "",
  fecha_inicio: "",
  fecha_fin: "",
};


export default function SeminariosPage() {
  const { user } = useAuth();

  const [seminarios, setSeminarios] =
    useState<Seminario[]>([]);

  const [carreras, setCarreras] =
    useState<Carrera[]>([]);

  const [docentes, setDocentes] =
    useState<Usuario[]>([]);

  const [busqueda, setBusqueda] =
    useState("");

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

  const [
    seminarioEditando,
    setSeminarioEditando,
  ] = useState<Seminario | null>(null);

  const [
    formulario,
    setFormulario,
  ] = useState<FormularioSeminario>(
    formularioInicial
  );


  const cargarSeminarios = async () => {
    if (!user) {
      return;
    }

    try {
      setCargando(true);
      setError("");

      const respuesta =
        await api.get<Seminario[]>(
          "/seminarios",
          user.token
        );

      setSeminarios(
        respuesta
      );

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los seminarios"
      );

    } finally {
      setCargando(false);
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
          respuestaSeminarios,
          respuestaCarreras,
          respuestaUsuarios,
        ] = await Promise.all([
          api.get<Seminario[]>(
            "/seminarios",
            user.token
          ),

          api.get<Carrera[]>(
            "/carreras",
            user.token
          ),

          api.get<Usuario[]>(
            "/autenticacion/usuarios",
            user.token
          ),
        ]);


        setSeminarios(
          respuestaSeminarios
        );


        setCarreras(
          respuestaCarreras
        );


        setDocentes(
          respuestaUsuarios.filter(
            (usuario) =>
              usuario.rol === "DOCENTE"
          )
        );

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


  const abrirNuevoSeminario = () => {
    setSeminarioEditando(null);

    setFormulario(
      formularioInicial
    );

    setError("");
    setMensaje("");

    setMostrarFormulario(
      true
    );
  };


  const abrirEdicion = (
    seminario: Seminario
  ) => {
    setSeminarioEditando(
      seminario
    );

    setFormulario({
      nombre:
        seminario.nombre,

      carrera_id:
        seminario.carrera_id,

      docente_id:
        seminario.docente_id,

      fecha_inicio:
        seminario.fecha_inicio,

      fecha_fin:
        seminario.fecha_fin,
    });

    setError("");
    setMensaje("");

    setMostrarFormulario(
      true
    );
  };


  const cerrarFormulario = () => {
    setMostrarFormulario(
      false
    );

    setSeminarioEditando(
      null
    );

    setFormulario(
      formularioInicial
    );
  };


  const actualizarFormulario = (
    campo: keyof FormularioSeminario,
    valor: string
  ) => {
    setFormulario(
      (anterior) => ({
        ...anterior,
        [campo]: valor,
      })
    );
  };


  const guardarSeminario = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    try {
      setError("");
      setMensaje("");

      if (seminarioEditando) {
        await api.put<Seminario>(
          `/seminarios/${seminarioEditando.id}`,
          formulario,
          user.token
        );

        setMensaje(
          "El seminario fue actualizado correctamente."
        );

      } else {
        await api.post<Seminario>(
          "/seminarios",
          formulario,
          user.token
        );

        setMensaje(
          "El seminario fue creado correctamente."
        );
      }

      cerrarFormulario();

      await cargarSeminarios();

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el seminario"
      );
    }
  };


  const cambiarEstado = async (
    seminario: Seminario
  ) => {
    if (!user) {
      return;
    }

    const nuevoEstado =
      !seminario.activo;

    const accion =
      nuevoEstado
        ? "activar"
        : "desactivar";

    const confirmado =
      window.confirm(
        `¿Querés ${accion} el seminario "${seminario.nombre}"?`
      );

    if (!confirmado) {
      return;
    }

    try {
      setError("");
      setMensaje("");

      await api.patch<Seminario>(
        `/seminarios/${seminario.id}/estado`,
        {
          activo: nuevoEstado,
        },
        user.token
      );

      setMensaje(
        nuevoEstado
          ? "El seminario fue activado correctamente."
          : "El seminario fue desactivado correctamente."
      );

      await cargarSeminarios();

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo modificar el estado del seminario"
      );
    }
  };


  const textoBusqueda =
    busqueda
      .trim()
      .toLowerCase();


  const seminariosFiltrados =
    seminarios.filter(
      (seminario) => {
        if (!textoBusqueda) {
          return true;
        }

        return (
          seminario.nombre
            .toLowerCase()
            .includes(textoBusqueda) ||

          seminario.carrera_nombre
            .toLowerCase()
            .includes(textoBusqueda) ||

          seminario.docente_nombre
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
            Seminarios
          </h1>

          <p className="mt-1 text-gray-500">
            Gestioná los seminarios de las carreras de posgrado.
          </p>
        </div>

        <button
          type="button"
          onClick={
            abrirNuevoSeminario
          }
          className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          + Nuevo seminario
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
          onSubmit={
            guardarSeminario
          }
          className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <header className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {seminarioEditando
                ? "Editar seminario"
                : "Nuevo seminario"}
            </h2>
          </header>


          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="seminario-nombre"
                className="mb-2 block font-semibold text-gray-700"
              >
                Nombre
              </label>

              <input
                id="seminario-nombre"
                type="text"
                required
                value={
                  formulario.nombre
                }
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
                htmlFor="seminario-carrera"
                className="mb-2 block font-semibold text-gray-700"
              >
                Carrera
              </label>

              <select
                id="seminario-carrera"
                required
                value={
                  formulario.carrera_id
                }
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

                {carreras.map(
                  (carrera) => (
                    <option
                      key={
                        carrera.id
                      }
                      value={
                        carrera.id
                      }
                    >
                      {carrera.nombre}
                      {!carrera.activo
                        ? " (Inactiva)"
                        : ""}
                    </option>
                  )
                )}
              </select>
            </div>


            <div>
              <label
                htmlFor="seminario-docente"
                className="mb-2 block font-semibold text-gray-700"
              >
                Docente
              </label>

              <select
                id="seminario-docente"
                required
                value={
                  formulario.docente_id
                }
                onChange={(event) =>
                  actualizarFormulario(
                    "docente_id",
                    event.target.value
                  )
                }
                className="w-full rounded-md border border-gray-300 p-2"
              >
                <option value="">
                  Seleccionar docente
                </option>

                {docentes.map(
                  (docente) => (
                    <option
                      key={
                        docente.id
                      }
                      value={
                        docente.id
                      }
                    >
                      {docente.nombre}{" "}
                      {docente.apellido}
                      {!docente.activo
                        ? " (Inactivo)"
                        : ""}
                    </option>
                  )
                )}
              </select>
            </div>


            <div>
              <label
                htmlFor="seminario-fecha-inicio"
                className="mb-2 block font-semibold text-gray-700"
              >
                Fecha de inicio
              </label>

              <input
                id="seminario-fecha-inicio"
                type="date"
                required
                value={
                  formulario.fecha_inicio
                }
                onChange={(event) =>
                  actualizarFormulario(
                    "fecha_inicio",
                    event.target.value
                  )
                }
                className="w-full rounded-md border border-gray-300 p-2"
              />
            </div>


            <div>
              <label
                htmlFor="seminario-fecha-fin"
                className="mb-2 block font-semibold text-gray-700"
              >
                Fecha de finalización
              </label>

              <input
                id="seminario-fecha-fin"
                type="date"
                required
                value={
                  formulario.fecha_fin
                }
                onChange={(event) =>
                  actualizarFormulario(
                    "fecha_fin",
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
              onClick={
                cerrarFormulario
              }
              className="rounded-md border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
            >
              {seminarioEditando
                ? "Guardar cambios"
                : "Crear seminario"}
            </button>
          </footer>
        </form>
      )}


      <div className="mb-4">
        <label
          htmlFor="buscar-seminario"
          className="sr-only"
        >
          Buscar seminario
        </label>

        <input
          id="buscar-seminario"
          type="search"
          placeholder="Buscar por seminario, carrera o docente..."
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
              <th
                scope="col"
                className="p-4"
              >
                Nombre
              </th>

              <th
                scope="col"
                className="p-4"
              >
                Carrera
              </th>

              <th
                scope="col"
                className="p-4"
              >
                Docente
              </th>

              <th
                scope="col"
                className="p-4"
              >
                Inicio
              </th>

              <th
                scope="col"
                className="p-4"
              >
                Fin
              </th>

              <th
                scope="col"
                className="p-4"
              >
                Estado
              </th>

              <th
                scope="col"
                className="p-4"
              >
                Acciones
              </th>
            </tr>
          </thead>


          <tbody>
            {cargando ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-8 text-center text-gray-500"
                >
                  Cargando seminarios...
                </td>
              </tr>
            ) : (
              <>
                {seminariosFiltrados.map(
                  (seminario) => (
                    <tr
                      key={
                        seminario.id
                      }
                      className="border-t border-gray-200"
                    >
                      <td className="p-4 font-semibold">
                        {
                          seminario.nombre
                        }
                      </td>

                      <td className="p-4">
                        {
                          seminario.carrera_nombre
                        }
                      </td>

                      <td className="p-4">
                        {
                          seminario.docente_nombre
                        }
                      </td>

                      <td className="p-4">
                        {
                          seminario.fecha_inicio
                        }
                      </td>

                      <td className="p-4">
                        {
                          seminario.fecha_fin
                        }
                      </td>

                      <td className="p-4">
                        <span
                          className={
                            seminario.activo
                              ? "font-semibold text-green-700"
                              : "font-semibold text-gray-500"
                          }
                        >
                          {seminario.activo
                            ? "Activo"
                            : "Inactivo"}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              abrirEdicion(
                                seminario
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
                                seminario
                              )
                            }
                            className={
                              seminario.activo
                                ? "font-semibold text-red-600 hover:underline"
                                : "font-semibold text-green-700 hover:underline"
                            }
                          >
                            {seminario.activo
                              ? "Desactivar"
                              : "Activar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}


                {seminariosFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-gray-500"
                    >
                      No se encontraron seminarios.
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