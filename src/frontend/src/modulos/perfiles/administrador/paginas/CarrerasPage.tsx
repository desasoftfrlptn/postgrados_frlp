import "../estilos/Administrador.css";
// Permite realizar el ABML de las carreras de posgrado.

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import AsociacionesCarrera from "../componentes/AsociacionesCarrera";
import { api } from "../../../../shared/api/client";
import ConfirmacionModal from "../../../../shared/componentes/ConfirmacionModal/ConfirmacionModal";
import MensajeSistema from "../../../../shared/componentes/MensajeSistema/MensajeSistema";
import FiltroEstado, { type EstadoFiltro } from "../componentes/FiltroEstado";
import { coincideEstado } from "../utils/filtros";
import "../estilos/FiltrosAcademicos.css";
import { useConfirmacion } from "../../../../shared/hooks/useConfirmacion";

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
  const confirmacion = useConfirmacion();
  const [gestionId, setGestionId] = useState<string | null>(null);
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("todos");

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


  // Solicita confirmación antes de guardar.
  const guardarCarrera = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }

    confirmacion.solicitar({
      titulo: "Confirmar guardado de carrera",
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
      setGestionId(null);

      await cargarCarreras();

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la carrera"
      );
    }
  };


  const eliminar = (carrera: Carrera) => {
    if (!user?.token) return;
    const token = user.token;
    confirmacion.solicitar({ titulo: "Eliminar carrera", descripcion: `¿Eliminar ${carrera.nombre}? Se eliminarán definitivamente sus cohortes, seminarios, legajos, documentación, inscripciones, notas, asistencias, tutorías, tesis y trabajos prácticos asociados. Las cuentas de usuario se conservarán. Esta acción es irreversible.`, textoConfirmar: "Eliminar", peligroso: true, ejecutar: async () => {
      setError(""); setMensaje("");
      try { await api.delete<void>(`/carreras/${carrera.id}`, token); setMensaje("Registro eliminado correctamente."); await cargarCarreras(); }
      catch (e) { setError(e instanceof Error ? e.message : "No se pudo eliminar el registro."); }
    } });
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

    confirmacion.solicitar({
      titulo: "Confirmar cambio de estado",
      descripcion: `¿Querés ${accion} la carrera "${carrera.nombre}"?`,
      textoConfirmar: "Confirmar",
      peligroso: false,
      ejecutar: async () => {
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
      },
    });
  };


  const textoBusqueda =
    busqueda
      .trim()
      .toLowerCase();


  const carrerasFiltradas =
    carreras.filter(
      (carrera) => {
        if (!coincideEstado(carrera.activo, estadoFiltro) || (tipoFiltro !== "" && carrera.tipo !== tipoFiltro)) return false;
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



  const gestion = carreras.find(c => c.id === gestionId);
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

        {!gestion && <button
          type="button"
          onClick={() => { setGestionId(null); abrirNuevaCarrera(); }}
          className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          + Nueva carrera
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
          onSubmit={guardarCarrera}
          className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <header className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {carreraEditando
                ? "Gestionar carrera"
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


          {gestion && <p className="mt-4 text-sm text-gray-600">Estado: {gestion.activo ? "Activa" : "Inactiva"}</p>}
          <footer className="mt-6 flex flex-wrap justify-end gap-3">
            {gestion && <button type="button" className="rounded-md border px-4 py-2 font-semibold" onClick={() => cambiarEstado(gestion)}>{gestion.activo ? "Desactivar" : "Activar"}</button>}
            <button
              type="button"
              onClick={() => { cerrarFormulario(); setGestionId(null); }}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
            >
              {gestion ? "Volver al listado" : "Cancelar"}
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


      {gestion && user && <AsociacionesCarrera key={gestion.id} carrera={gestion} token={user.token} /> }
      {!gestion && <>
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


      <div className="admin-filtros-academicos">
        <FiltroEstado valor={estadoFiltro} alCambiar={setEstadoFiltro} />
        <div className="admin-filtro-campo"><label htmlFor="filtro-tipo-carrera">Tipo de carrera</label><select id="filtro-tipo-carrera" value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)}><option value="">Todos</option>{tiposCarrera.map(tipo => <option key={tipo} value={tipo}>{obtenerNombreTipo(tipo)}</option>)}</select></div>
        <button type="button" className="admin-limpiar-filtros" onClick={() => { setEstadoFiltro("todos"); setBusqueda(""); setTipoFiltro(""); }}>Limpiar filtros</button>
      </div>
      <p role="status" className="admin-resultado-filtros">{carrerasFiltradas.length} de {carreras.length} resultados</p>
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
                          <button type="button" className="admin-accion-gestionar" onClick={() => { setGestionId(carrera.id); abrirEdicion(carrera); }}>Gestionar carrera</button>
                          <button type="button" className="admin-accion-eliminar" onClick={() => eliminar(carrera)}>Eliminar</button>
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