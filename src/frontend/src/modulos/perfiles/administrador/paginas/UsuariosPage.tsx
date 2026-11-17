// Permite al administrador gestionar los usuarios del sistema.

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  api,
} from "../../../../shared/api/client";

import {
  useAuth,
} from "../../../manejo-sesion/useAuth";

import type {
  Rol,
} from "../../../../shared/tipos";


interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  correo_electronico: string;
  tipo_usuario: Rol;
  activo: boolean;
  debe_cambiar_contrasena: boolean;
}


interface FormularioUsuario {
  nombre: string;
  apellido: string;
  dni: string;
  correo_electronico: string;
  contrasena: string;
  tipo_usuario: Rol;
}


const formularioInicial:
  FormularioUsuario = {
    nombre: "",
    apellido: "",
    dni: "",
    correo_electronico: "",
    contrasena: "",
    tipo_usuario: "ASPIRANTE",
  };


const roles: Rol[] = [
  "ADMIN",
  "ASPIRANTE",
  "COORDINADOR",
  "CPR",
  "DOCENTE",
];


export default function UsuariosPage() {
  const {
    user,
  } = useAuth();


  const [
    usuarios,
    setUsuarios,
  ] = useState<Usuario[]>([]);


  const [
    formulario,
    setFormulario,
  ] = useState<FormularioUsuario>(
    formularioInicial
  );


  const [
    usuarioEditando,
    setUsuarioEditando,
  ] = useState<Usuario | null>(
    null
  );


  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);


  const [
    cargando,
    setCargando,
  ] = useState(true);


  const [
    guardando,
    setGuardando,
  ] = useState(false);


  const [
    busqueda,
    setBusqueda,
  ] = useState("");


  const [
    error,
    setError,
  ] = useState("");


  const [
    mensaje,
    setMensaje,
  ] = useState("");


  const cargarUsuarios =
    async () => {
      if (!user?.token) {
        return;
      }

      try {
        setCargando(true);
        setError("");

        const respuesta =
          await api.get<Usuario[]>(
            "/autenticacion/usuarios",
            user.token
          );

        setUsuarios(
          respuesta
        );

      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : (
                "No se pudieron "
                + "cargar los usuarios"
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

    const cargar =
      async () => {
        try {
          setCargando(true);
          setError("");

          const respuesta =
            await api.get<Usuario[]>(
              "/autenticacion/usuarios",
              user.token
            );

          setUsuarios(
            respuesta
          );

        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : (
                  "No se pudieron "
                  + "cargar los usuarios"
                )
          );

        } finally {
          setCargando(false);
        }
      };

    cargar();

  }, [user?.token]);


  const cambiarCampo = (
    campo:
      keyof FormularioUsuario,
    valor: string
  ) => {
    setFormulario(
      (anterior) => ({
        ...anterior,
        [campo]: valor,
      })
    );
  };


  const abrirNuevoUsuario =
    () => {
      setUsuarioEditando(
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
    usuario: Usuario
  ) => {
    setUsuarioEditando(
      usuario
    );

    setFormulario({
      nombre:
        usuario.nombre,

      apellido:
        usuario.apellido,

      dni:
        usuario.dni,

      correo_electronico:
        usuario.correo_electronico,

      contrasena: "",

      tipo_usuario:
        usuario.tipo_usuario,
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

      setUsuarioEditando(
        null
      );

      setFormulario(
        formularioInicial
      );
    };


  const guardarUsuario = async (
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

      if (usuarioEditando) {
        await api.put<Usuario>(
          `/autenticacion/usuarios/${usuarioEditando.id}`,
          {
            nombre:
              formulario.nombre,

            apellido:
              formulario.apellido,

            dni:
              formulario.dni,

            correo_electronico:
              formulario.correo_electronico,

            tipo_usuario:
              formulario.tipo_usuario,
          },
          user.token
        );

        setMensaje(
          "El usuario fue actualizado correctamente."
        );

      } else {
        if (
          !formulario.contrasena
        ) {
          setError(
            "Ingresá una contraseña temporal."
          );

          return;
        }

        await api.post<Usuario>(
          "/autenticacion/usuarios",
          {
            nombre:
              formulario.nombre,

            apellido:
              formulario.apellido,

            dni:
              formulario.dni,

            correo_electronico:
              formulario.correo_electronico,

            contrasena:
              formulario.contrasena,

            tipo_usuario:
              formulario.tipo_usuario,
          },
          user.token
        );

        setMensaje(
          "El usuario fue creado correctamente. "
          + "Deberá cambiar su contraseña "
          + "en el primer ingreso."
        );
      }

      cerrarFormulario();

      await cargarUsuarios();

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : (
              "No se pudo guardar "
              + "el usuario"
            )
      );

    } finally {
      setGuardando(false);
    }
  };


  const cambiarEstado = async (
    usuario: Usuario
  ) => {
    if (!user?.token) {
      return;
    }

    const nuevoEstado =
      !usuario.activo;

    const accion =
      nuevoEstado
        ? "activar"
        : "desactivar";


    const confirmado =
      window.confirm(
        `¿Querés ${accion} a `
        + `${usuario.nombre} `
        + `${usuario.apellido}?`
      );


    if (!confirmado) {
      return;
    }


    try {
      setError("");
      setMensaje("");

      await api.patch<Usuario>(
        `/autenticacion/usuarios/${usuario.id}/estado`,
        {
          activo:
            nuevoEstado,
        },
        user.token
      );


      setMensaje(
        nuevoEstado
          ? (
              "El usuario fue "
              + "activado correctamente."
            )
          : (
              "El usuario fue "
              + "desactivado correctamente."
            )
      );


      await cargarUsuarios();

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : (
              "No se pudo modificar "
              + "el estado del usuario"
            )
      );
    }
  };


  const eliminarUsuario = async (
    usuario: Usuario
  ) => {
    if (!user?.token) {
      return;
    }


    const confirmado =
      window.confirm(
        "¿Seguro que querés eliminar "
        + "definitivamente a "
        + `${usuario.nombre} `
        + `${usuario.apellido}? `
        + "Esta acción no se puede deshacer."
      );


    if (!confirmado) {
      return;
    }


    try {
      setError("");
      setMensaje("");

      await api.delete<void>(
        `/autenticacion/usuarios/${usuario.id}`,
        user.token
      );


      setMensaje(
        "El usuario fue eliminado correctamente."
      );


      await cargarUsuarios();

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : (
              "No se pudo eliminar "
              + "el usuario"
            )
      );
    }
  };


  const textoBusqueda =
    busqueda
      .trim()
      .toLowerCase();


  const usuariosFiltrados =
    usuarios.filter(
      (usuario) => {
        const nombreCompleto =
        `${usuario.nombre} ${usuario.apellido}`
            .toLowerCase();

        return (
          nombreCompleto.includes(
            textoBusqueda
          )
          ||
          usuario.correo_electronico
            .toLowerCase()
            .includes(
              textoBusqueda
            )
          ||
          usuario.dni
            .toLowerCase()
            .includes(
              textoBusqueda
            )
          ||
          usuario.tipo_usuario
            .toLowerCase()
            .includes(
              textoBusqueda
            )
        );
      }
    );


  return (
    <section className="p-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Usuarios
          </h1>

          <p className="text-gray-500 mt-1">
            Administrá las cuentas
            de acceso al sistema.
          </p>
        </div>

        <button
          type="button"
          onClick={
            abrirNuevoUsuario
          }
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg"
        >
          + Nuevo usuario
        </button>
      </header>


      {error && (
        <p
          role="alert"
          className="mb-5 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200"
        >
          {error}
        </p>
      )}


      {mensaje && (
        <p
          role="status"
          className="mb-5 p-3 rounded-lg bg-green-50 text-green-700 border border-green-200"
        >
          {mensaje}
        </p>
      )}


      {mostrarFormulario && (
        <form
          onSubmit={
            guardarUsuario
          }
          className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-8"
        >
          <header className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {usuarioEditando
                ? "Editar usuario"
                : "Nuevo usuario"}
            </h2>

            {!usuarioEditando && (
              <p className="text-sm text-gray-500 mt-1">
                La contraseña ingresada
                será temporal. El usuario
                deberá cambiarla al iniciar
                sesión por primera vez.
              </p>
            )}
          </header>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="usuario-nombre"
                className="block text-sm font-semibold mb-2"
              >
                Nombre
              </label>

              <input
                id="usuario-nombre"
                type="text"
                required
                value={
                  formulario.nombre
                }
                onChange={(event) =>
                  cambiarCampo(
                    "nombre",
                    event.target.value
                  )
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>


            <div>
              <label
                htmlFor="usuario-apellido"
                className="block text-sm font-semibold mb-2"
              >
                Apellido
              </label>

              <input
                id="usuario-apellido"
                type="text"
                required
                value={
                  formulario.apellido
                }
                onChange={(event) =>
                  cambiarCampo(
                    "apellido",
                    event.target.value
                  )
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>


            <div>
              <label
                htmlFor="usuario-dni"
                className="block text-sm font-semibold mb-2"
              >
                DNI
              </label>

              <input
                id="usuario-dni"
                type="text"
                required
                value={
                  formulario.dni
                }
                onChange={(event) =>
                  cambiarCampo(
                    "dni",
                    event.target.value
                  )
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>


            <div>
              <label
                htmlFor="usuario-email"
                className="block text-sm font-semibold mb-2"
              >
                Correo electrónico
              </label>

              <input
                id="usuario-email"
                type="email"
                required
                value={
                  formulario.correo_electronico
                }
                onChange={(event) =>
                  cambiarCampo(
                    "correo_electronico",
                    event.target.value
                  )
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>


            <div>
              <label
                htmlFor="usuario-rol"
                className="block text-sm font-semibold mb-2"
              >
                Rol
              </label>

              <select
                id="usuario-rol"
                required
                value={
                  formulario.tipo_usuario
                }
                onChange={(event) =>
                  cambiarCampo(
                    "tipo_usuario",
                    event.target.value
                  )
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                {roles.map(
                  (rol) => (
                    <option
                      key={rol}
                      value={rol}
                    >
                      {rol}
                    </option>
                  )
                )}
              </select>
            </div>


            {!usuarioEditando && (
              <div>
                <label
                  htmlFor="usuario-contrasena"
                  className="block text-sm font-semibold mb-2"
                >
                  Contraseña temporal
                </label>

                <input
                  id="usuario-contrasena"
                  type="password"
                  required
                  minLength={6}
                  value={
                    formulario.contrasena
                  }
                  onChange={(event) =>
                    cambiarCampo(
                      "contrasena",
                      event.target.value
                    )
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            )}
          </div>


          <footer className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={
                cerrarFormulario
              }
              className="px-4 py-2 rounded-lg border border-gray-300"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={
                guardando
              }
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
            >
              {guardando
                ? "Guardando..."
                : usuarioEditando
                  ? "Guardar cambios"
                  : "Crear usuario"}
            </button>
          </footer>
        </form>
      )}


      <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <header className="p-5 border-b border-gray-200">
          <label
            htmlFor="buscar-usuario"
            className="sr-only"
          >
            Buscar usuario
          </label>

          <input
            id="buscar-usuario"
            type="search"
            placeholder="Buscar por nombre, correo, DNI o rol..."
            value={
              busqueda
            }
            onChange={(event) =>
              setBusqueda(
                event.target.value
              )
            }
            className="w-full md:max-w-xl border border-gray-300 rounded-lg px-3 py-2"
          />
        </header>


        {cargando ? (
          <p className="p-6 text-gray-500">
            Cargando usuarios...
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4">
                    Usuario
                  </th>

                  <th className="text-left p-4">
                    DNI
                  </th>

                  <th className="text-left p-4">
                    Rol
                  </th>

                  <th className="text-left p-4">
                    Estado
                  </th>

                  <th className="text-left p-4">
                    Primer ingreso
                  </th>

                  <th className="text-left p-4">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {usuariosFiltrados.map(
                  (usuario) => (
                    <tr
                      key={
                        usuario.id
                      }
                      className="border-t border-gray-200"
                    >
                      <td className="p-4">
                        <strong className="block">
                          {usuario.nombre}{" "}
                          {usuario.apellido}
                        </strong>

                        <span className="text-sm text-gray-500">
                          {usuario.correo_electronico}
                        </span>
                      </td>


                      <td className="p-4">
                        {usuario.dni}
                      </td>


                      <td className="p-4">
                        {usuario.tipo_usuario}
                      </td>


                      <td className="p-4">
                        {usuario.activo
                          ? "Activo"
                          : "Inactivo"}
                      </td>


                      <td className="p-4">
                        {usuario.debe_cambiar_contrasena
                          ? "Pendiente"
                          : "Realizado"}
                      </td>


                      <td className="p-4">
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              abrirEdicion(
                                usuario
                              )
                            }
                            className="text-blue-600 font-semibold hover:underline"
                          >
                            Editar
                          </button>


                          <button
                            type="button"
                            onClick={() =>
                              cambiarEstado(
                                usuario
                              )
                            }
                            className="text-amber-600 font-semibold hover:underline"
                          >
                            {usuario.activo
                              ? "Desactivar"
                              : "Activar"}
                          </button>


                          <button
                            type="button"
                            onClick={() =>
                              eliminarUsuario(
                                usuario
                              )
                            }
                            className="text-red-600 font-semibold hover:underline"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}


                {usuariosFiltrados.length
                  === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-gray-500"
                    >
                      No se encontraron usuarios.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}