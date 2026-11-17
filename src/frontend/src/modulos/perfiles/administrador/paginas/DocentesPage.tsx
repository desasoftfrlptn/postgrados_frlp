// Permite administrar los usuarios que tienen rol DOCENTE.

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  api,
} from "../../../../shared/api/client";

import type {
  Rol,
} from "../../../../shared/tipos";

import {
  useAuth,
} from "../../../manejo-sesion/useAuth";


interface Docente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  correo_electronico: string;
  tipo_usuario: Rol;
  activo: boolean;
  debe_cambiar_contrasena: boolean;
}


interface FormularioDocente {
  nombre: string;
  apellido: string;
  dni: string;
  correo_electronico: string;
  contrasena: string;
}


const formularioInicial:
  FormularioDocente = {
    nombre: "",
    apellido: "",
    dni: "",
    correo_electronico: "",
    contrasena: "",
  };


export default function DocentesPage() {
  const {
    user,
  } = useAuth();


  const [
    docentes,
    setDocentes,
  ] = useState<Docente[]>([]);


  const [
    busqueda,
    setBusqueda,
  ] = useState("");


  const [
    cargando,
    setCargando,
  ] = useState(true);


  const [
    guardando,
    setGuardando,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    mensaje,
    setMensaje,
  ] = useState("");


  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);


  const [
    docenteEditando,
    setDocenteEditando,
  ] = useState<Docente | null>(
    null
  );


  const [
    formulario,
    setFormulario,
  ] = useState<FormularioDocente>(
    formularioInicial
  );


  const cargarDocentes =
    async () => {
      if (!user?.token) {
        return;
      }

      try {
        setCargando(true);
        setError("");

        const usuarios =
          await api.get<Docente[]>(
            "/autenticacion/usuarios",
            user.token
          );

        const usuariosDocentes =
          usuarios.filter(
            (usuario) =>
              usuario.tipo_usuario
              === "DOCENTE"
          );

        setDocentes(
          usuariosDocentes
        );

      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : (
                "No se pudieron "
                + "cargar los docentes"
              )
        );

      } finally {
        setCargando(false);
      }
    };


    useEffect(() => {
    if (!user?.token) {
        return;
    }

    const cargar = async () => {
        try {
        setCargando(true);
        setError("");

        const usuarios =
            await api.get<Docente[]>(
            "/autenticacion/usuarios",
            user.token
            );

        const usuariosDocentes =
            usuarios.filter(
            (usuario) =>
                usuario.tipo_usuario === "DOCENTE"
            );

        setDocentes(
            usuariosDocentes
        );

        } catch (error) {
        setError(
            error instanceof Error
            ? error.message
            : "No se pudieron cargar los docentes"
        );

        } finally {
        setCargando(false);
        }
    };

    cargar();

    }, [user?.token]);

  const abrirNuevoDocente =
    () => {
      setDocenteEditando(
        null
      );

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
    docente: Docente
  ) => {
    setDocenteEditando(
      docente
    );

    setFormulario({
      nombre:
        docente.nombre,

      apellido:
        docente.apellido,

      dni:
        docente.dni,

      correo_electronico:
        docente.correo_electronico,

      contrasena: "",
    });

    setError("");
    setMensaje("");

    setMostrarFormulario(
      true
    );
  };


  const cerrarFormulario =
    () => {
      setMostrarFormulario(
        false
      );

      setDocenteEditando(
        null
      );

      setFormulario(
        formularioInicial
      );
    };


  const actualizarFormulario = (
    campo:
      keyof FormularioDocente,
    valor: string
  ) => {
    setFormulario(
      (anterior) => ({
        ...anterior,
        [campo]: valor,
      })
    );
  };


  const guardarDocente = async (
    event:
      FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!user?.token) {
      return;
    }


    try {
      setGuardando(true);
      setError("");
      setMensaje("");


      if (
        docenteEditando
      ) {
        await api.put<Docente>(
          `/autenticacion/usuarios/${docenteEditando.id}`,
          {
            nombre:
              formulario.nombre.trim(),

            apellido:
              formulario.apellido.trim(),

            dni:
              formulario.dni.trim(),

            correo_electronico:
              formulario.correo_electronico
                .trim()
                .toLowerCase(),

            tipo_usuario:
              "DOCENTE",
          },
          user.token
        );


        setMensaje(
          "El docente fue actualizado correctamente."
        );

      } else {
        if (
          formulario.contrasena.length
          < 6
        ) {
          setError(
            "La contraseña debe tener al menos 6 caracteres."
          );

          return;
        }


        await api.post<Docente>(
          "/autenticacion/usuarios",
          {
            nombre:
              formulario.nombre.trim(),

            apellido:
              formulario.apellido.trim(),

            dni:
              formulario.dni.trim(),

            correo_electronico:
              formulario.correo_electronico
                .trim()
                .toLowerCase(),

            contrasena:
              formulario.contrasena,

            tipo_usuario:
              "DOCENTE",
          },
          user.token
        );


        setMensaje(
          "El docente fue creado correctamente. "
          + "Deberá cambiar su contraseña "
          + "cuando ingrese por primera vez."
        );
      }


      cerrarFormulario();

      await cargarDocentes();

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : (
              "No se pudo guardar "
              + "el docente"
            )
      );

    } finally {
      setGuardando(false);
    }
  };


  const cambiarEstado = async (
    docente: Docente
  ) => {
    if (!user?.token) {
      return;
    }


    const nuevoEstado =
      !docente.activo;


    const accion =
      nuevoEstado
        ? "activar"
        : "desactivar";


    const confirmado =
      window.confirm(
        `¿Querés ${accion} a `
        + `${docente.nombre} `
        + `${docente.apellido}?`
      );


    if (!confirmado) {
      return;
    }


    try {
      setError("");
      setMensaje("");


      await api.patch<Docente>(
        `/autenticacion/usuarios/${docente.id}/estado`,
        {
          activo:
            nuevoEstado,
        },
        user.token
      );


      setMensaje(
        nuevoEstado
          ? (
              "El docente fue "
              + "activado correctamente."
            )
          : (
              "El docente fue "
              + "desactivado correctamente."
            )
      );


      await cargarDocentes();

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : (
              "No se pudo modificar "
              + "el estado del docente"
            )
      );
    }
  };


  const eliminarDocente = async (
    docente: Docente
  ) => {
    if (!user?.token) {
      return;
    }


    const confirmado =
      window.confirm(
        "¿Seguro que querés eliminar "
        + "definitivamente a "
        + `${docente.nombre} `
        + `${docente.apellido}? `
        + "Esta acción no se puede deshacer."
      );


    if (!confirmado) {
      return;
    }


    try {
      setError("");
      setMensaje("");


      await api.delete<void>(
        `/autenticacion/usuarios/${docente.id}`,
        user.token
      );


      setMensaje(
        "El docente fue eliminado correctamente."
      );


      await cargarDocentes();

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : (
              "No se pudo eliminar "
              + "el docente"
            )
      );
    }
  };


  const textoBusqueda =
    busqueda
      .trim()
      .toLowerCase();


  const docentesFiltrados =
    docentes.filter(
      (docente) => {
        if (
          !textoBusqueda
        ) {
          return true;
        }


        return (
          docente.nombre
            .toLowerCase()
            .includes(
              textoBusqueda
            )
          ||
          docente.apellido
            .toLowerCase()
            .includes(
              textoBusqueda
            )
          ||
          docente.dni
            .toLowerCase()
            .includes(
              textoBusqueda
            )
          ||
          docente.correo_electronico
            .toLowerCase()
            .includes(
              textoBusqueda
            )
        );
      }
    );


  return (
    <section>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Docentes
          </h1>

          <p className="mt-1 text-gray-500">
            Gestioná los docentes
            registrados en el sistema.
          </p>
        </div>


        <button
          type="button"
          onClick={
            abrirNuevoDocente
          }
          className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          + Nuevo docente
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
            guardarDocente
          }
          className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <header className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {docenteEditando
                ? "Editar docente"
                : "Nuevo docente"}
            </h2>


            {!docenteEditando && (
              <p className="mt-1 text-sm text-gray-500">
                La contraseña será
                temporal. El docente
                deberá cambiarla al
                iniciar sesión por
                primera vez.
              </p>
            )}
          </header>


          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="docente-nombre"
                className="mb-2 block font-semibold text-gray-700"
              >
                Nombre
              </label>

              <input
                id="docente-nombre"
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
                htmlFor="docente-apellido"
                className="mb-2 block font-semibold text-gray-700"
              >
                Apellido
              </label>

              <input
                id="docente-apellido"
                type="text"
                required
                value={
                  formulario.apellido
                }
                onChange={(event) =>
                  actualizarFormulario(
                    "apellido",
                    event.target.value
                  )
                }
                className="w-full rounded-md border border-gray-300 p-2"
              />
            </div>


            <div>
              <label
                htmlFor="docente-dni"
                className="mb-2 block font-semibold text-gray-700"
              >
                DNI
              </label>

              <input
                id="docente-dni"
                type="text"
                required
                value={
                  formulario.dni
                }
                onChange={(event) =>
                  actualizarFormulario(
                    "dni",
                    event.target.value
                  )
                }
                className="w-full rounded-md border border-gray-300 p-2"
              />
            </div>


            <div>
              <label
                htmlFor="docente-email"
                className="mb-2 block font-semibold text-gray-700"
              >
                Correo electrónico
              </label>

              <input
                id="docente-email"
                type="email"
                required
                value={
                  formulario.correo_electronico
                }
                onChange={(event) =>
                  actualizarFormulario(
                    "correo_electronico",
                    event.target.value
                  )
                }
                className="w-full rounded-md border border-gray-300 p-2"
              />
            </div>


            {!docenteEditando && (
              <div>
                <label
                  htmlFor="docente-contrasena"
                  className="mb-2 block font-semibold text-gray-700"
                >
                  Contraseña temporal
                </label>

                <input
                  id="docente-contrasena"
                  type="password"
                  required
                  minLength={6}
                  value={
                    formulario.contrasena
                  }
                  onChange={(event) =>
                    actualizarFormulario(
                      "contrasena",
                      event.target.value
                    )
                  }
                  className="w-full rounded-md border border-gray-300 p-2"
                />

                <small className="mt-1 block text-gray-500">
                  Mínimo 6 caracteres.
                </small>
              </div>
            )}


            <div>
              <label
                htmlFor="docente-rol"
                className="mb-2 block font-semibold text-gray-700"
              >
                Rol
              </label>

              <input
                id="docente-rol"
                type="text"
                value="DOCENTE"
                readOnly
                className="w-full rounded-md border border-gray-300 bg-gray-100 p-2 text-gray-600"
              />
            </div>
          </div>


          <footer className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={
                cerrarFormulario
              }
              disabled={
                guardando
              }
              className="rounded-md border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>


            <button
              type="submit"
              disabled={
                guardando
              }
              className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {guardando
                ? "Guardando..."
                : docenteEditando
                  ? "Guardar cambios"
                  : "Crear docente"}
            </button>
          </footer>
        </form>
      )}


      <div className="mb-4">
        <label
          htmlFor="buscar-docente"
          className="sr-only"
        >
          Buscar docente
        </label>

        <input
          id="buscar-docente"
          type="search"
          placeholder="Buscar por nombre, apellido, DNI o correo..."
          value={
            busqueda
          }
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
                Apellido
              </th>

              <th
                scope="col"
                className="p-4"
              >
                DNI
              </th>

              <th
                scope="col"
                className="p-4"
              >
                Email
              </th>

              <th
                scope="col"
                className="p-4"
              >
                Seminarios
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
                  Cargando docentes...
                </td>
              </tr>
            ) : (
              <>
                {docentesFiltrados.map(
                  (docente) => (
                    <tr
                      key={
                        docente.id
                      }
                      className="border-t border-gray-200"
                    >
                      <td className="p-4">
                        {docente.nombre}
                      </td>


                      <td className="p-4">
                        {docente.apellido}
                      </td>


                      <td className="p-4">
                        {docente.dni}
                      </td>


                      <td className="p-4">
                        {
                          docente.correo_electronico
                        }
                      </td>


                      <td className="p-4 text-gray-500">
                        Sin asignar
                      </td>


                      <td className="p-4">
                        <span
                          className={
                            docente.activo
                              ? "font-semibold text-green-700"
                              : "font-semibold text-gray-500"
                          }
                        >
                          {docente.activo
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
                                docente
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
                                docente
                              )
                            }
                            className={
                              docente.activo
                                ? "font-semibold text-amber-600 hover:underline"
                                : "font-semibold text-green-700 hover:underline"
                            }
                          >
                            {docente.activo
                              ? "Desactivar"
                              : "Activar"}
                          </button>


                          <button
                            type="button"
                            onClick={() =>
                              eliminarDocente(
                                docente
                              )
                            }
                            className="font-semibold text-red-600 hover:underline"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}


                {docentesFiltrados.length
                  === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-gray-500"
                    >
                      No se encontraron docentes.
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