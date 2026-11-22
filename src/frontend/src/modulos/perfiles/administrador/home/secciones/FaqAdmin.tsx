import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "../../../../manejo-sesion/useAuth";
import {
  faqApi,
  type DatosPreguntaFrecuente,
  type PreguntaFrecuente,
} from "../../../../../shared/api/faq";

import ConfirmacionModal from "../../../../../shared/componentes/ConfirmacionModal/ConfirmacionModal";
import { useConfirmacion } from "../../../../../shared/hooks/useConfirmacion";

import MensajeHomeAdmin from "../componentes/MensajeHomeAdmin";

const formularioInicial: DatosPreguntaFrecuente = {
  categoria: "",
  pregunta: "",
  respuesta: "",
  orden: 1,
  activa: true,
};

export default function FaqAdmin() {
  const { user } = useAuth();
  const token = user?.token;

  const confirmacion = useConfirmacion();

  const [preguntas, setPreguntas] = useState<PreguntaFrecuente[]>([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [editando, setEditando] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [intento, setIntento] = useState(0);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const ocupado = confirmacion.abierto || confirmacion.procesando;

  // Recupera preguntas registradas.
  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        if (!token) {
          throw new Error("Necesitás iniciar sesión.");
        }

        const respuesta = await faqApi.listarAdministracion(token);

        if (activo) {
          setPreguntas(respuesta);
          setErrorCarga(false);
        }
      } catch (error) {
        if (activo) {
          setErrorCarga(true);
          setError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las preguntas."
          );
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    void cargar();

    return () => {
      activo = false;
    };
  }, [token, intento]);

  function reintentar() {
    setCargando(true);
    setError("");
    setErrorCarga(false);
    setIntento((valor) => valor + 1);
  }

  function limpiarFormulario() {
    setFormulario({ ...formularioInicial });
    setEditando(null);
    setMostrarFormulario(false);
  }

  // Prepara una nueva pregunta.
  function nuevaPregunta() {
    setFormulario({
      ...formularioInicial,
      orden: Math.min(
        9999,
        Math.max(0, ...preguntas.map((p) => p.orden)) + 1
      ),
    });

    setEditando(null);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  // Recupera los datos para la edición.
  function editarPregunta(item: PreguntaFrecuente) {
    setFormulario({
      categoria: item.categoria,
      pregunta: item.pregunta,
      respuesta: item.respuesta,
      orden: item.orden,
      activa: item.activa,
    });

    setEditando(item.id);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  function cancelarEdicion() {
    confirmacion.solicitar({
      titulo: "¿Descartar los cambios?",
      descripcion: "Se cerrará el formulario sin guardar los datos.",
      textoConfirmar: "Descartar cambios",
      peligroso: true,
      ejecutar: limpiarFormulario,
    });
  }

  // Valida y confirma altas y modificaciones.
  function solicitarGuardado(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || ocupado) return;

    const datos = {
      ...formulario,
      categoria: formulario.categoria.trim(),
      pregunta: formulario.pregunta.trim(),
      respuesta: formulario.respuesta.trim(),
    };

    if (
      !datos.categoria ||
      datos.categoria.length > 100 ||
      datos.pregunta.length < 5 ||
      datos.pregunta.length > 300 ||
      datos.respuesta.length < 5 ||
      datos.respuesta.length > 10000 ||
      !Number.isInteger(datos.orden) ||
      datos.orden < 1 ||
      datos.orden > 9999
    ) {
      setError("Revisá los campos ingresados antes de guardar.");
      return;
    }

    setError("");
    setMensaje("");

    const id = editando;

    confirmacion.solicitar({
      titulo: id
        ? "Confirmar modificación"
        : "Confirmar nueva pregunta",
      descripcion: "¿Deseás guardar esta pregunta frecuente?",
      textoConfirmar: "Confirmar guardado",
      ejecutar: async () => {
        try {
          const respuesta = id
            ? await faqApi.modificar(id, datos, token)
            : await faqApi.crear(datos, token);

          setPreguntas((anteriores) =>
            id
              ? anteriores.map((item) =>
                  item.id === id ? respuesta : item
                )
              : [...anteriores, respuesta]
          );

          limpiarFormulario();

          setMensaje(
            id
              ? "Pregunta modificada correctamente."
              : "Pregunta creada correctamente."
          );
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "No se pudo guardar la pregunta."
          );
        }
      },
    });
  }

  // Baja lógica o reactivación.
  function solicitarCambioEstado(item: PreguntaFrecuente) {
    if (!token || ocupado) return;

    setError("");
    setMensaje("");

    const activa = !item.activa;

    confirmacion.solicitar({
      titulo: activa
        ? "¿Activar pregunta?"
        : "¿Desactivar pregunta?",
      descripcion: activa
        ? "La pregunta volverá a mostrarse en el sitio público."
        : "La pregunta dejará de mostrarse en el sitio público.",
      textoConfirmar: activa ? "Activar" : "Desactivar",
      peligroso: !activa,
      ejecutar: async () => {
        try {
          const respuesta = await faqApi.cambiarEstado(
            item.id,
            activa,
            token
          );

          setPreguntas((anteriores) =>
            anteriores.map((pregunta) =>
              pregunta.id === item.id ? respuesta : pregunta
            )
          );

          setMensaje(
            activa
              ? "Pregunta activada correctamente."
              : "Pregunta desactivada correctamente."
          );
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "No se pudo cambiar el estado."
          );
        }
      },
    });
  }

  const textoBusqueda = busqueda.trim().toLowerCase();

  const preguntasFiltradas = preguntas
    .filter((item) =>
      `${item.categoria} ${item.pregunta}`
        .toLowerCase()
        .includes(textoBusqueda)
    )
    .sort((a, b) =>
      a.orden - b.orden ||
      a.categoria.localeCompare(b.categoria)
    );

  return (
    <>
      <MensajeHomeAdmin
        error={error}
        mensaje={mensaje}
        alCerrarError={() => setError("")}
        alCerrarMensaje={() => setMensaje("")}
      />

      <article className="admin-home-panel">
        <header className="admin-noticias-encabezado">
          <div>
            <h2>Preguntas frecuentes</h2>
            <p>Administrá las consultas visibles en el sitio público.</p>
          </div>

          <button
            type="button"
            className="admin-noticias-nueva"
            onClick={nuevaPregunta}
            disabled={
              !token || ocupado || cargando ||
              errorCarga || mostrarFormulario
            }
          >
            + Nueva pregunta
          </button>
        </header>

        {mostrarFormulario && (
          <form onSubmit={solicitarGuardado}>
            <h3>
              {editando ? "Modificar pregunta" : "Nueva pregunta"}
            </h3>

            <fieldset
              className="admin-home-campos admin-inicio-campos"
              disabled={ocupado}
            >
              <div className="admin-home-campo">
                <label htmlFor="faq-categoria">Categoría</label>
                <input
                  id="faq-categoria"
                  required
                  maxLength={100}
                  value={formulario.categoria}
                  onChange={(e) =>
                    setFormulario((actual) => ({
                      ...actual,
                      categoria: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="admin-home-campo">
                <label htmlFor="faq-orden">Orden</label>
                <input
                  id="faq-orden"
                  type="number"
                  min={1}
                  max={9999}
                  step={1}
                  required
                  value={formulario.orden}
                  onChange={(e) =>
                    setFormulario((actual) => ({
                      ...actual,
                      orden: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="admin-home-campo admin-noticias-campo-ancho">
                <label htmlFor="faq-pregunta">Pregunta</label>
                <input
                  id="faq-pregunta"
                  required
                  minLength={5}
                  maxLength={300}
                  value={formulario.pregunta}
                  onChange={(e) =>
                    setFormulario((actual) => ({
                      ...actual,
                      pregunta: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="admin-home-campo admin-noticias-campo-ancho">
                <label htmlFor="faq-respuesta">Respuesta</label>
                <textarea
                  id="faq-respuesta"
                  required
                  rows={6}
                  minLength={5}
                  maxLength={10000}
                  value={formulario.respuesta}
                  onChange={(e) =>
                    setFormulario((actual) => ({
                      ...actual,
                      respuesta: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="admin-home-campo">
                <label htmlFor="faq-activa">Estado</label>
                <select
                  id="faq-activa"
                  value={formulario.activa ? "activa" : "inactiva"}
                  onChange={(e) =>
                    setFormulario((actual) => ({
                      ...actual,
                      activa: e.target.value === "activa",
                    }))
                  }
                >
                  <option value="activa">Activa</option>
                  <option value="inactiva">Inactiva</option>
                </select>
              </div>
            </fieldset>

            <footer className="admin-home-acciones">
              <button
                type="button"
                className="admin-noticias-cancelar"
                disabled={ocupado}
                onClick={cancelarEdicion}
              >
                Cancelar
              </button>

              <button type="submit" disabled={ocupado}>
                Guardar pregunta
              </button>
            </footer>
          </form>
        )}

        <section className="admin-noticias-listado">
          {cargando ? (
            <p role="status">Cargando preguntas...</p>
          ) : errorCarga ? (
            <button type="button" onClick={reintentar}>
              Reintentar
            </button>
          ) : (
            <>
              <label htmlFor="buscar-faq" className="sr-only">
                Buscar pregunta
              </label>

              <input
                id="buscar-faq"
                className="admin-noticias-buscador"
                type="search"
                placeholder="Buscar por pregunta o categoría..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />

              <div className="admin-noticias-tabla-contenedor">
                <table className="admin-noticias-tabla">
                  <thead>
                    <tr>
                      <th scope="col">Categoría</th>
                      <th scope="col">Pregunta</th>
                      <th scope="col">Orden</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {preguntasFiltradas.map((item) => (
                      <tr key={item.id}>
                        <td>{item.categoria}</td>
                        <td>{item.pregunta}</td>
                        <td>{item.orden}</td>
                        <td>{item.activa ? "Activa" : "Inactiva"}</td>

                        <td>
                          <div className="admin-noticias-acciones-fila">
                            <button
                              type="button"
                              disabled={ocupado || mostrarFormulario}
                              onClick={() => editarPregunta(item)}
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              disabled={ocupado || mostrarFormulario}
                              onClick={() => solicitarCambioEstado(item)}
                            >
                              {item.activa ? "Desactivar" : "Activar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {!preguntasFiltradas.length && (
                      <tr>
                        <td colSpan={5} className="admin-noticias-vacio">
                          No se encontraron preguntas frecuentes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
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
    </>
  );
}
