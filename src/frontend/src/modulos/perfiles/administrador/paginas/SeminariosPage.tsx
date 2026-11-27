import "../estilos/Administrador.css";
// Permite realizar el ABML de los seminarios.

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
  tipo_usuario: Rol;
  activo: boolean;
}


interface Seminario {
  id: string;
  nombre: string;

  carrera_id: string;
  carrera_nombre: string;

  docente_id: string | null;
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


function formatearFecha(fecha: string): string {
  if (!fecha) return "—";

  const [anio, mes, dia] = fecha.split("T")[0].split("-");

  return `${dia}/${mes}/${anio}`;
}

export default function SeminariosPage() {
  const confirmacion = useConfirmacion();
  const [carreraFiltro, setCarreraFiltro] = useState(() => new URLSearchParams(window.location.search).get("carrera") ?? "");
  const [docenteFiltro, setDocenteFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("todos");

  const { user } = useAuth();

  const [seminarios, setSeminarios] =
    useState<Seminario[]>([]);

  const [carreras, setCarreras] =
    useState<Carrera[]>([]);

  const [docentes, setDocentes] =
    useState<Usuario[]>([]);


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
           usuario.tipo_usuario === "DOCENTE" &&
           usuario.activo
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
        seminario.docente_id ?? "",

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


  // Solicita confirmación antes de guardar.
  const guardarSeminario = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }

    confirmacion.solicitar({
      titulo: "Confirmar guardado de seminario",
      descripcion: seminarioEditando && !formulario.docente_id ? "¿Confirmás desasociar al docente? El seminario quedará inactivo hasta que se asigne otro docente y se lo reactive." : "¿Confirmás que deseás guardar los datos ingresados?",
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

      if (seminarioEditando) {
        await api.put<Seminario>(
          `/seminarios/${seminarioEditando.id}`,
          {...formulario, docente_id: formulario.docente_id || null},
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

    confirmacion.solicitar({
      titulo: "Confirmar cambio de estado",
      descripcion: `¿Querés ${accion} el seminario "${seminario.nombre}"?`,
      textoConfirmar: "Confirmar",
      peligroso: false,
      ejecutar: async () => {
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
      },
    });
  };


  const eliminarSeminario = (seminario: Seminario) => {
    if (!user?.token) return;
    confirmacion.solicitar({
      titulo: "Eliminar seminario",
      descripcion: `¿Querés eliminar el seminario «${seminario.nombre}»? Se eliminarán definitivamente sus inscripciones, calificaciones y asistencias. Las cuentas y legajos de los estudiantes se conservarán. Esta acción es irreversible.`,
      textoConfirmar: "Eliminar",
      peligroso: true,
      ejecutar: async () => {
        setError("");
        setMensaje("");
        try {
          await api.delete<void>(`/seminarios/${seminario.id}`, user.token);
          setMensaje("El seminario fue eliminado correctamente.");
          await cargarSeminarios();
        } catch (error) {
          setError(error instanceof Error ? error.message : "No se pudo eliminar el seminario.");
        }
      },
    });
  };

  const seminariosFiltrados = seminarios.filter(seminario =>
    coincideEstado(seminario.activo, estadoFiltro) &&
    (!carreraFiltro || seminario.carrera_id === carreraFiltro) &&
    (!docenteFiltro || seminario.docente_id === docenteFiltro)
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

        {!mostrarFormulario && <button
          type="button"
          onClick={
            abrirNuevoSeminario
          }
          className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          + Nuevo seminario
        </button>}
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
            guardarSeminario
          }
          className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <header className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {seminarioEditando
                ? "Gestionar seminario"
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
                required={!seminarioEditando}
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
                  {seminarioEditando ? "Sin docente asignado" : "Seleccionar docente"}
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


          <footer className="mt-6 flex flex-wrap justify-end gap-3">
            {seminarioEditando && <button type="button" className="rounded-md border px-4 py-2 font-semibold" onClick={() => { const actual = seminarios.find(s => s.id === seminarioEditando.id); if (actual) void cambiarEstado(actual); }}>{seminarios.find(s => s.id === seminarioEditando.id)?.activo ? "Desactivar" : "Activar"}</button>}
            <button
              type="button"
              onClick={
                cerrarFormulario
              }
              className="rounded-md border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
            >
              {seminarioEditando ? "Volver al listado" : "Cancelar"}
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


      {!mostrarFormulario && <>
      <div className="admin-filtros-academicos">
        <FiltroEstado valor={estadoFiltro} alCambiar={setEstadoFiltro} />
        <div className="admin-filtro-campo"><label htmlFor="filtro-carrera-seminario">Carrera</label><select id="filtro-carrera-seminario" value={carreraFiltro} onChange={e => setCarreraFiltro(e.target.value)}><option value="">Todas</option>{carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
<div className="admin-filtro-campo"><label htmlFor="filtro-docente-seminario">Docente</label><select id="filtro-docente-seminario" value={docenteFiltro} onChange={e => setDocenteFiltro(e.target.value)}><option value="">Todos</option>{Array.from(new Map(seminarios.filter(s => s.docente_id !== null).map(s => [s.docente_id ?? "", s.docente_nombre])).entries()).map(([id,nombre]) => <option key={id} value={id}>{nombre}</option>)}</select></div>
        <button type="button" className="admin-limpiar-filtros" onClick={() => { setEstadoFiltro("todos"); setCarreraFiltro(""); setDocenteFiltro(""); }}>Limpiar filtros</button>
      </div>
      <p role="status" className="admin-resultado-filtros">{seminariosFiltrados.length} de {seminarios.length} resultados</p>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="admin-tabla-seminarios w-full text-left">
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
                      <td className="admin-seminario-nombre">
  {seminario.nombre}
</td>

                      <td className="admin-seminario-carrera">
  {seminario.carrera_nombre}
</td>

                      <td className="admin-seminario-docente">
  {seminario.docente_nombre}
</td>

                      <td className="admin-seminario-fecha">
  {formatearFecha(seminario.fecha_inicio)}
</td>

                      <td className="admin-seminario-fecha">
  {formatearFecha(seminario.fecha_fin)}
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
                        <div className="admin-seminario-acciones">
                          <button
                            type="button"
                            onClick={() =>
                              abrirEdicion(
                                seminario
                              )
                            }
                            className="admin-accion-gestionar"
                          >
  Gestionar
</button>


                          <button type="button" onClick={() => eliminarSeminario(seminario)}
                            className="admin-accion-eliminar">
                            Eliminar
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
      </>}
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