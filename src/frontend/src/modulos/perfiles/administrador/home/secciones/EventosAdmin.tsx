
import { useEffect, useState, type FormEvent } from "react";

import { api } from "../../../../../shared/api/client";
import { useAuth } from "../../../../manejo-sesion/useAuth";
import MensajeHomeAdmin from "../componentes/MensajeHomeAdmin";

interface Evento {
  id: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  tipo: string;
  activo: boolean;
}

const tiposEvento: Record<string, string> = {
  clases: "Inicio de clases",
  inscripcion: "Inscripciones",
  examen: "Mesa de final",
  feriado: "Feriados",
  receso: "Receso académico",
  fin_clases: "Finalización de clases",
  entrega: "Entrega de trabajos",
  actividad: "Actividades académicas",
  otros: "Otro evento",
};

const formularioVacio = {
  titulo: "",
  descripcion: "",
  fecha: "",
  tipo: "clases",
};

function obtenerNombreTipo(tipo: string) {
  if (tipo.startsWith("otros:")) {
    return tipo.slice(6);
  }

  return tiposEvento[tipo] ?? tipo;
}

export default function EventosAdmin() {
  const { user } = useAuth();
  const token = user?.token;

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [formulario, setFormulario] = useState(formularioVacio);
  const [otroTipo, setOtroTipo] = useState("");

  const [editando, setEditando] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // Evento que espera una confirmación de activación/desactivación.
  const [eventoAConfirmar, setEventoAConfirmar] =
    useState<Evento | null>(null);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // Ocultar los mensajes de éxito después de 5 segundos.
  useEffect(() => {
    if (!mensaje) return;

    const temporizador = window.setTimeout(() => {
      setMensaje("");
    }, 5000);

    return () => {
      window.clearTimeout(temporizador);
    };
  }, [mensaje]);

  // Cargar los eventos registrados.

  useEffect(() => {
    if (!token) return;

    let activo = true;

    async function cargar() {
      try {
        const datos = await api.get<Evento[]>("/eventos", token);

        if (activo) {
          setEventos(datos);
        }
      } catch {
        if (activo) {
          setError("No se pudieron cargar los eventos.");
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    void cargar();

    return () => {
      activo = false;
    };
  }, [token]);


  // Refrescar el listado después de una operación.
  async function cargarEventos() {
    if (!token) return;

    const datos = await api.get<Evento[]>("/eventos", token);
    setEventos(datos);
  }

  function modificarCampo(
    campo: keyof typeof formularioVacio,
    valor: string
  ) {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  // Abrir el formulario para crear un evento.
  function nuevoEvento() {
    setFormulario(formularioVacio);
    setOtroTipo("");
    setEditando(null);
    setMostrarFormulario(true);
    setError("");
    setMensaje("");
  }

  // Abrir el formulario para editar un evento.
  function editar(evento: Evento) {
    const esPersonalizado = evento.tipo.startsWith("otros:");

    setFormulario({
      titulo: evento.titulo,
      descripcion: evento.descripcion,
      fecha: evento.fecha,
      tipo: esPersonalizado ? "otros" : evento.tipo,
    });

    setOtroTipo(
      esPersonalizado ? evento.tipo.slice(6) : ""
    );

    setEditando(evento.id);
    setMostrarFormulario(true);
    setError("");
    setMensaje("");
  }

  function cancelar() {
    setFormulario(formularioVacio);
    setOtroTipo("");
    setEditando(null);
    setMostrarFormulario(false);
  }

  // Crear o modificar un evento.
  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("Necesitás iniciar sesión para guardar eventos.");
      return;
    }

    let tipoFinal = formulario.tipo;

    if (formulario.tipo === "otros") {
      const nombre = otroTipo.trim();

      if (!nombre) {
        setError("Debés especificar el tipo de evento.");
        return;
      }

      if (nombre.length > 24) {
        setError(
          "El tipo personalizado no puede superar los 24 caracteres."
        );
        return;
      }

      tipoFinal = `otros:${nombre}`;
    }

    const datos = {
      ...formulario,
      tipo: tipoFinal,
    };

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      if (editando) {
        await api.put(
          `/eventos/${editando}`,
          datos,
          token
        );
      } else {
        await api.post(
          "/eventos",
          datos,
          token
        );
      }

      await cargarEventos();
      cancelar();

      setMensaje(
        editando
          ? "El evento fue actualizado correctamente."
          : "El evento fue creado correctamente."
      );
    } catch {
      setError("No se pudo guardar el evento.");
    } finally {
      setGuardando(false);
    }
  }

  // Abrir la confirmación antes de cambiar el estado.
  function solicitarCambioEstado(evento: Evento) {
    setEventoAConfirmar(evento);
    setError("");
    setMensaje("");
  }

  function cancelarCambioEstado() {
    if (guardando) return;
    setEventoAConfirmar(null);
  }

  // Confirmar la activación o desactivación.
  async function cambiarEstado() {
    if (!token || !eventoAConfirmar || guardando) return;

    const evento = eventoAConfirmar;

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      await api.patch(
        `/eventos/${evento.id}/estado`,
        { activo: !evento.activo },
        token
      );

      await cargarEventos();

      setEventoAConfirmar(null);

      setMensaje(
        evento.activo
          ? "El evento fue desactivado correctamente."
          : "El evento fue activado correctamente."
      );
    } catch {
      setError("No se pudo modificar el estado del evento.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <MensajeHomeAdmin error={error} mensaje={mensaje} />

      {/* Confirmación de activación o desactivación */}
      {eventoAConfirmar && (
        <div className="admin-evento-confirmacion-fondo">
          <section
            className="admin-evento-confirmacion"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmacion-evento"
            aria-describedby="descripcion-confirmacion-evento"
          >
            <h2 id="titulo-confirmacion-evento">
              ¿{eventoAConfirmar.activo
                ? "Desactivar"
                : "Activar"}{" "}
              evento?
            </h2>

            <p id="descripcion-confirmacion-evento">
              ¿Querés{" "}
              {eventoAConfirmar.activo
                ? "desactivar"
                : "activar"}{" "}
              <strong>
                «{eventoAConfirmar.titulo}»
              </strong>
              ?
            </p>

            <p>
              {eventoAConfirmar.activo
                ? "El evento dejará de aparecer en el calendario público, pero podrás volver a activarlo."
                : "El evento volverá a aparecer en el calendario público."}
            </p>

            <div className="admin-evento-confirmacion-acciones">
              <button
                type="button"
                className="admin-noticias-cancelar"
                onClick={cancelarCambioEstado}
                disabled={guardando}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void cambiarEstado()}
                disabled={guardando}
              >
                {guardando
                  ? "Guardando..."
                  : eventoAConfirmar.activo
                    ? "Desactivar evento"
                    : "Activar evento"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Administración de eventos */}
      <article className="admin-home-panel admin-calendario-eventos">
        <header className="admin-noticias-encabezado">
          <div>
            <h2>Eventos académicos</h2>
            <p>
              Administrá las fechas visibles en el calendario público.
            </p>
          </div>

          <button
            type="button"
            className="admin-noticias-nueva"
            onClick={nuevoEvento}
          >
            + Nuevo evento
          </button>
        </header>

        {/* Formulario de creación y edición */}
        {mostrarFormulario && (
          <form
            onSubmit={guardar}
            className="admin-noticias-formulario"
          >
            <h3 className="mb-4 text-lg font-semibold">
              {editando ? "Modificar evento" : "Nuevo evento"}
            </h3>

            <div className="admin-home-campos">
              <div className="admin-home-campo">
                <label htmlFor="evento-titulo">
                  Título
                </label>

                <input
                  id="evento-titulo"
                  type="text"
                  required
                  value={formulario.titulo}
                  onChange={(e) =>
                    modificarCampo("titulo", e.target.value)
                  }
                />
              </div>

              <div className="admin-home-campo">
                <label htmlFor="evento-fecha">
                  Fecha
                </label>

                <input
                  id="evento-fecha"
                  type="date"
                  required
                  value={formulario.fecha}
                  onChange={(e) =>
                    modificarCampo("fecha", e.target.value)
                  }
                />
              </div>

              <div className="admin-home-campo">
                <label htmlFor="evento-tipo">
                  Tipo de evento
                </label>

                <select
                  id="evento-tipo"
                  value={formulario.tipo}
                  onChange={(e) => {
                    modificarCampo("tipo", e.target.value);
                    setOtroTipo("");
                  }}
                >
                  {Object.entries(tiposEvento).map(
                    ([valor, nombre]) => (
                      <option key={valor} value={valor}>
                        {nombre}
                      </option>
                    )
                  )}
                </select>
              </div>

              {formulario.tipo === "otros" && (
                <div className="admin-home-campo">
                  <label htmlFor="evento-otro-tipo">
                    Especificá el tipo de evento
                  </label>

                  <input
                    id="evento-otro-tipo"
                    type="text"
                    required
                    maxLength={24}
                    placeholder="Ej.: Defensa de tesis"
                    value={otroTipo}
                    onChange={(e) =>
                      setOtroTipo(e.target.value)
                    }
                  />
                </div>
              )}

              <div className="admin-home-campo admin-noticias-campo-ancho">
                <label htmlFor="evento-descripcion">
                  Descripción
                </label>

                <textarea
                  id="evento-descripcion"
                  rows={3}
                  required
                  value={formulario.descripcion}
                  onChange={(e) =>
                    modificarCampo("descripcion", e.target.value)
                  }
                />
              </div>
            </div>

            <footer className="admin-home-acciones">
              <button
                type="button"
                className="admin-noticias-cancelar"
                onClick={cancelar}
                disabled={guardando}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando}
              >
                {guardando
                  ? "Guardando..."
                  : editando
                    ? "Guardar cambios"
                    : "Crear evento"}
              </button>
            </footer>
          </form>
        )}

        {/* Listado de eventos */}
        <div className="admin-noticias-listado">
          <h3 className="mb-4 text-lg font-semibold">
            Eventos registrados
          </h3>

          {cargando ? (
            <p>Cargando eventos...</p>
          ) : (
            <div className="admin-noticias-tabla-contenedor">
              <table className="admin-noticias-tabla">
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col">Título</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {eventos.map((evento) => (
                    <tr key={evento.id}>
                      <td>{evento.fecha}</td>
                      <td>{evento.titulo}</td>

                      <td>
                        {obtenerNombreTipo(evento.tipo)}
                      </td>

                      <td>
                        {evento.activo
                          ? "Activo"
                          : "Inactivo"}
                      </td>

                      <td>
                        <div className="admin-noticias-acciones-fila">
                          <button
                            type="button"
                            onClick={() => editar(evento)}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              solicitarCambioEstado(evento)
                            }
                          >
                            {evento.activo
                              ? "Desactivar"
                              : "Activar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {eventos.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="admin-noticias-vacio"
                      >
                        No hay eventos registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </article>
    </>
  );
}
