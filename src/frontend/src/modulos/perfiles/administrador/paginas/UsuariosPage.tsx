// Permite al administrador gestionar los usuarios del sistema.

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";


import {
  api,
} from "../../../../shared/api/client";
import ConfirmacionModal from "../../../../shared/componentes/ConfirmacionModal/ConfirmacionModal";
import MensajeSistema from "../../../../shared/componentes/MensajeSistema/MensajeSistema";
import { useConfirmacion } from "../../../../shared/hooks/useConfirmacion";


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
  correo_acceso_enviado?: boolean;
  numeros_legajo?: string[];
}


interface FormularioUsuario {
  nombre: string;
  apellido: string;
  dni: string;
  correo_electronico: string;
  legajo_id: string;
  tipo_usuario: Rol;
}


const formularioInicial:
  FormularioUsuario = {
    nombre: "",
    apellido: "",
    dni: "",
    correo_electronico: "",
    legajo_id: "",
    tipo_usuario: "DOCENTE",
  };


const roles: Rol[] = [
  "ADMIN",
  "ALUMNO",
  "COORDINADOR",
  "CPR",
  "DOCENTE",
];


interface CandidatoCuenta { id: string; nombre: string; apellido: string; dni: string; correo_electronico: string; carrera: string; numero_seguimiento: string; numero_legajo?: string | null }

export default function UsuariosPage() {
  const confirmacion = useConfirmacion();
  const [candidatos, setCandidatos] = useState<CandidatoCuenta[]>([]);
  const [estadoCandidatos, setEstadoCandidatos] = useState<"inactivo" | "cargando" | "listo" | "error">("inactivo");
  const [intentoCandidatos, setIntentoCandidatos] = useState(0);

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


  const token = user?.token;
  const seleccionAlumno = mostrarFormulario && !usuarioEditando && formulario.tipo_usuario === "ALUMNO";
  useEffect(() => {
    if (!token || !seleccionAlumno) return;
    let vigente = true;
    api.get<CandidatoCuenta[]>("/autenticacion/usuarios/candidatos", token)
      .then(datos => { if (vigente) { setCandidatos(datos); setEstadoCandidatos("listo");
      } })
      .catch(() => { if (vigente) { setCandidatos([]); setEstadoCandidatos("error"); } });
    return () => { vigente = false; };
  }, [token, seleccionAlumno, intentoCandidatos]);

  function seleccionarLegajo(id: string) {
    const candidato = candidatos.find(c => c.id === id);
    setFormulario(f => ({ ...f, legajo_id: id, nombre: candidato?.nombre ?? "", apellido: candidato?.apellido ?? "", dni: candidato?.dni ?? "", correo_electronico: candidato?.correo_electronico ?? "" }));
  }

  function reenviarAcceso(usuario: Usuario) {
    if (!token) return;
    confirmacion.solicitar({ titulo: "Gestionar acceso", descripcion: `Se enviará un enlace de ${usuario.debe_cambiar_contrasena ? "activación" : "recuperación de contraseña"} a ${usuario.correo_electronico}.`, textoConfirmar: "Reenviar", ejecutar: async () => {
      setError(""); setMensaje("");
      try { await api.post(`/autenticacion/usuarios/${usuario.id}/reenviar-acceso`, {}, token); setMensaje("Correo de acceso enviado."); }
      catch (e) { setError(e instanceof Error ? e.message : "No se pudo enviar el acceso."); }
    } });
  }

  const cambiarCampo = (
    campo:
      keyof FormularioUsuario,
    valor: string
  ) => {
    if (campo === "tipo_usuario" && !usuarioEditando) {
      setCandidatos([]);
      setEstadoCandidatos(valor === "ALUMNO" ? "cargando" : "inactivo");
      setFormulario({ ...formularioInicial, tipo_usuario: valor as Rol });
      return;
    }
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

      legajo_id: "",

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


  // Solicita confirmación antes de guardar.
  const guardarUsuario = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }

    if (seleccionAlumno && !formulario.legajo_id) {
      setError("Seleccioná un alumno matriculado.");
      return;
    }
    confirmacion.solicitar({
      titulo: "Confirmar guardado de usuario",
      descripcion: "¿Confirmás que deseás guardar los datos ingresados?",
      textoConfirmar: "Confirmar guardado",
      ejecutar: ejecutarGuardado,
    });
  };

  // Persiste los datos después de confirmar.
  const ejecutarGuardado = async () => {

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
        const respuesta = await api.post<Usuario>(
          "/autenticacion/usuarios",
          { nombre: formulario.nombre, apellido: formulario.apellido, dni: formulario.dni,
            correo_electronico: formulario.correo_electronico, tipo_usuario: formulario.tipo_usuario,
            ...(seleccionAlumno ? { legajo_id: formulario.legajo_id } : {}) },
          user.token
        );
        setMensaje((respuesta.correo_acceso_enviado
          ? "Usuario creado correctamente. Se envió el enlace de activación."
          : "Usuario creado. El correo de acceso no se pudo enviar. Utilizá Gestionar acceso.") + (respuesta.numeros_legajo?.length ? ` Legajo: ${respuesta.numeros_legajo.join(", ")}.` : ""));
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


    confirmacion.solicitar({
      titulo: "Confirmar cambio de estado",
      descripcion: `¿Querés ${accion} a `
        + `${usuario.nombre} `
        + `${usuario.apellido}?`,
      textoConfirmar: "Confirmar",
      peligroso: false,
      ejecutar: async () => {
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
      },
    });
  };


  const eliminarUsuario = async (
    usuario: Usuario
  ) => {
    if (!user?.token || usuario.id === user.id) {
      return;
    }


    confirmacion.solicitar({
      titulo: "Confirmar eliminación",
      descripcion: "¿Seguro que querés eliminar "
        + "definitivamente a "
        + `${usuario.nombre} `
        + `${usuario.apellido}? `
        + "Se eliminará la cuenta de acceso y se conservará el historial académico. Los seminarios y tutorías asignados quedarán sin docente. Esta acción no se puede deshacer.",
      textoConfirmar: "Confirmar",
      peligroso: true,
      ejecutar: async () => {
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
      },
    });
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
          usuario.numeros_legajo?.some(numero => numero.toLowerCase().includes(textoBusqueda)) ||
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
                Se enviará un enlace de activación al correo del usuario para que establezca su contraseña.
              </p>
            )}
          </header>


          {seleccionAlumno && <div className="mb-5">
            <label htmlFor="legajo-cuenta" className="block text-sm font-semibold mb-2">Alumno matriculado</label>
            <select id="legajo-cuenta" required value={formulario.legajo_id} disabled={estadoCandidatos !== "listo"} onChange={e => seleccionarLegajo(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option value="">Seleccioná un legajo</option>
              {candidatos.map(c => <option key={c.id} value={c.id}>{c.apellido}, {c.nombre} · {c.carrera} · {c.numero_legajo ? `Legajo ${c.numero_legajo}` : "Legajo a generar"} · {c.numero_seguimiento}</option>)}
            </select>
            {estadoCandidatos === "cargando" && <p role="status">Cargando alumnos matriculados…</p>}
            {estadoCandidatos === "listo" && !candidatos.length && <p>No hay alumnos matriculados sin cuenta.</p>}
            {estadoCandidatos === "error" && <><p role="alert">No se pudieron cargar los alumnos.</p><button type="button" onClick={() => {setEstadoCandidatos("cargando"); setIntentoCandidatos(v => v + 1);}}>Reintentar</button></>}
          </div>}
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
                readOnly={seleccionAlumno}
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
                readOnly={seleccionAlumno}
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
                readOnly={seleccionAlumno}
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
                readOnly={seleccionAlumno}
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
            placeholder="Buscar por nombre, correo, DNI, legajo o rol..."
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

                  <th className="text-left p-4">Legajo</th>
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
                      <td className="p-4">{usuario.numeros_legajo?.length ? usuario.numeros_legajo.join(", ") : "—"}</td>


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


                          <button type="button" disabled={!usuario.activo || usuario.tipo_usuario === "ASPIRANTE"} title={usuario.debe_cambiar_contrasena ? "Enviar enlace de activación" : "Enviar enlace de recuperación"} onClick={() => reenviarAcceso(usuario)} className="text-blue-600 font-semibold hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed">Gestionar acceso</button>
                          {usuario.id !== user?.id && <button
                            type="button"
                            onClick={() =>
                              eliminarUsuario(
                                usuario
                              )
                            }
                            className="text-red-600 font-semibold hover:underline"
                          >
                            Eliminar
                          </button>}
                        </div>
                      </td>
                    </tr>
                  )
                )}


                {usuariosFiltrados.length
                  === 0 && (
                  <tr>
                    <td
                      colSpan={7}
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