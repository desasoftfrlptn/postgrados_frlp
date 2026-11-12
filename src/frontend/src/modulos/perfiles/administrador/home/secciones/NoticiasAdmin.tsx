// Permite administrar las noticias publicadas en el sitio.

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  api,
  obtenerUrlArchivo,
} from "../../../../../shared/api/client";

import { useAuth } from "../../../../manejo-sesion/useAuth";

import MensajeHomeAdmin from "../componentes/MensajeHomeAdmin";


interface Noticia {
  id: string;
  titulo: string;
  categoria: string;
  resumen: string;
  contenido: string;
  fecha: string;
  imagen_url: string | null;
  activo: boolean;
}


interface FormularioNoticia {
  titulo: string;
  categoria: string;
  resumen: string;
  contenido: string;
  fecha: string;
}


const formularioInicial: FormularioNoticia = {
  titulo: "",
  categoria: "",
  resumen: "",
  contenido: "",
  fecha: "",
};


export default function NoticiasAdmin() {
  const { user } = useAuth();

  const [noticias, setNoticias] =
    useState<Noticia[]>([]);

  const [formulario, setFormulario] =
    useState<FormularioNoticia>(
      formularioInicial
    );

  const [imagen, setImagen] =
    useState<File | null>(null);

  const [vistaPrevia, setVistaPrevia] =
    useState("");

  const [
    noticiaEditando,
    setNoticiaEditando,
  ] = useState<Noticia | null>(null);

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

  const [cargando, setCargando] =
    useState(true);

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const [busqueda, setBusqueda] =
    useState("");


  const cargarNoticias = async () => {
    if (!user?.token) {
      return;
    }

    try {
      setCargando(true);
      setError("");

      const respuesta =
        await api.get<Noticia[]>(
          "/noticias",
          user.token
        );

      setNoticias(
        respuesta
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las noticias"
      );
    } finally {
      setCargando(false);
    }
  };


  useEffect(() => {
    if (!user?.token) {
      return;
    }

    const cargarNoticiasIniciales = async () => {
      try {
        setCargando(true);
        setError("");

        const respuesta =
          await api.get<Noticia[]>(
            "/noticias",
            user.token
          );

        setNoticias(
          respuesta
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las noticias"
        );
      } finally {
        setCargando(false);
      }
    };

    cargarNoticiasIniciales();
  }, [user?.token]);


  const abrirNuevaNoticia = () => {
    setNoticiaEditando(null);

    setFormulario(
      formularioInicial
    );

    setImagen(null);
    setVistaPrevia("");
    setError("");
    setMensaje("");

    setMostrarFormulario(
      true
    );
  };


  const abrirEdicion = (
    noticia: Noticia
  ) => {
    setNoticiaEditando(
      noticia
    );

    setFormulario({
      titulo:
        noticia.titulo,

      categoria:
        noticia.categoria,

      resumen:
        noticia.resumen,

      contenido:
        noticia.contenido,

      fecha:
        noticia.fecha,
    });

    setImagen(null);

    setVistaPrevia(
      obtenerUrlArchivo(
        noticia.imagen_url
      )
    );

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

    setNoticiaEditando(
      null
    );

    setFormulario(
      formularioInicial
    );

    setImagen(null);
    setVistaPrevia("");
  };


  const modificarCampo = (
    campo: keyof FormularioNoticia,
    valor: string
  ) => {
    setFormulario(
      (anterior) => ({
        ...anterior,
        [campo]: valor,
      })
    );
  };


  const seleccionarImagen = (
    archivo: File | null
  ) => {
    setImagen(
      archivo
    );

    if (!archivo) {
      setVistaPrevia("");
      return;
    }

    const urlTemporal =
      URL.createObjectURL(
        archivo
      );

    setVistaPrevia(
      urlTemporal
    );
  };


  const guardarNoticia = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!user?.token) {
      return;
    }

    const datos =
      new FormData();

    datos.append(
      "titulo",
      formulario.titulo
    );

    datos.append(
      "categoria",
      formulario.categoria
    );

    datos.append(
      "resumen",
      formulario.resumen
    );

    datos.append(
      "contenido",
      formulario.contenido
    );

    datos.append(
      "fecha",
      formulario.fecha
    );

    if (imagen) {
      datos.append(
        "imagen",
        imagen
      );
    }

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      if (noticiaEditando) {
        await api.putForm<Noticia>(
          `/noticias/${noticiaEditando.id}`,
          datos,
          user.token
        );

        setMensaje(
          "La noticia fue actualizada correctamente."
        );
      } else {
        await api.postForm<Noticia>(
          "/noticias",
          datos,
          user.token
        );

        setMensaje(
          "La noticia fue creada correctamente."
        );
      }

      cerrarFormulario();

      await cargarNoticias();

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la noticia"
      );
    } finally {
      setGuardando(false);
    }
  };


  const cambiarEstado = async (
    noticia: Noticia
  ) => {
    if (!user?.token) {
      return;
    }

    const nuevoEstado =
      !noticia.activo;

    const accion =
      nuevoEstado
        ? "publicar"
        : "despublicar";

    const confirmado =
      window.confirm(
        `¿Querés ${accion} "${noticia.titulo}"?`
      );

    if (!confirmado) {
      return;
    }

    try {
      setError("");
      setMensaje("");

      await api.patch<Noticia>(
        `/noticias/${noticia.id}/estado`,
        {
          activo:
            nuevoEstado,
        },
        user.token
      );

      setMensaje(
        nuevoEstado
          ? "La noticia fue publicada."
          : "La noticia fue despublicada."
      );

      await cargarNoticias();

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo modificar la noticia"
      );
    }
  };


  const textoBusqueda =
    busqueda
      .trim()
      .toLowerCase();


  const noticiasFiltradas =
    noticias.filter(
      (noticia) =>
        noticia.titulo
          .toLowerCase()
          .includes(
            textoBusqueda
          ) ||
        noticia.categoria
          .toLowerCase()
          .includes(
            textoBusqueda
          )
    );


  return (
    <>
      <MensajeHomeAdmin
        error={error}
        mensaje={mensaje}
      />

      <article className="admin-home-panel">
        <header className="admin-noticias-encabezado">
          <section>
            <h2>
              Noticias
            </h2>

            <p>
              Administrá las noticias y
              comunicados visibles en el
              sitio público.
            </p>
          </section>

          <button
            type="button"
            className="admin-noticias-nueva"
            onClick={
              abrirNuevaNoticia
            }
          >
            + Nueva noticia
          </button>
        </header>


        {mostrarFormulario && (
          <form
            className="admin-noticias-formulario"
            onSubmit={
              guardarNoticia
            }
          >
            <div className="admin-home-campos">
              <div className="admin-home-campo">
                <label htmlFor="noticia-titulo">
                  Título
                </label>

                <input
                  id="noticia-titulo"
                  type="text"
                  required
                  value={
                    formulario.titulo
                  }
                  onChange={(event) =>
                    modificarCampo(
                      "titulo",
                      event.target.value
                    )
                  }
                />
              </div>


              <div className="admin-home-campo">
                <label htmlFor="noticia-categoria">
                  Categoría
                </label>

                <input
                  id="noticia-categoria"
                  type="text"
                  required
                  placeholder="Ej.: Académico"
                  value={
                    formulario.categoria
                  }
                  onChange={(event) =>
                    modificarCampo(
                      "categoria",
                      event.target.value
                    )
                  }
                />
              </div>


              <div className="admin-home-campo">
                <label htmlFor="noticia-fecha">
                  Fecha
                </label>

                <input
                  id="noticia-fecha"
                  type="date"
                  required
                  value={
                    formulario.fecha
                  }
                  onChange={(event) =>
                    modificarCampo(
                      "fecha",
                      event.target.value
                    )
                  }
                />
              </div>


              <div className="admin-home-campo">
                <label htmlFor="noticia-imagen">
                  Imagen
                </label>

                <input
                  id="noticia-imagen"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    seleccionarImagen(
                      event.target.files?.[0]
                        ?? null
                    )
                  }
                />
              </div>


              <div className="admin-home-campo admin-noticias-campo-ancho">
                <label htmlFor="noticia-resumen">
                  Resumen
                </label>

                <textarea
                  id="noticia-resumen"
                  rows={3}
                  required
                  value={
                    formulario.resumen
                  }
                  onChange={(event) =>
                    modificarCampo(
                      "resumen",
                      event.target.value
                    )
                  }
                />
              </div>


              <div className="admin-home-campo admin-noticias-campo-ancho">
                <label htmlFor="noticia-contenido">
                  Contenido
                </label>

                <textarea
                  id="noticia-contenido"
                  rows={8}
                  required
                  value={
                    formulario.contenido
                  }
                  onChange={(event) =>
                    modificarCampo(
                      "contenido",
                      event.target.value
                    )
                  }
                />
              </div>
            </div>


            {vistaPrevia && (
              <figure className="admin-noticias-vista-previa">
                <img
                  src={vistaPrevia}
                  alt="Vista previa de la noticia"
                />

                <figcaption>
                  Vista previa de la imagen
                </figcaption>
              </figure>
            )}


            <footer className="admin-home-acciones">
              <button
                type="button"
                className="admin-noticias-cancelar"
                onClick={
                  cerrarFormulario
                }
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={
                  guardando
                }
              >
                {guardando
                  ? "Guardando..."
                  : noticiaEditando
                    ? "Guardar cambios"
                    : "Crear noticia"}
              </button>
            </footer>
          </form>
        )}


        <section className="admin-noticias-listado">
          <label
            htmlFor="buscar-noticia"
            className="sr-only"
          >
            Buscar noticia
          </label>

          <input
            id="buscar-noticia"
            type="search"
            placeholder="Buscar por título o categoría..."
            value={
              busqueda
            }
            onChange={(event) =>
              setBusqueda(
                event.target.value
              )
            }
            className="admin-noticias-buscador"
          />


          {cargando ? (
            <p className="admin-home-cargando">
              Cargando noticias...
            </p>
          ) : (
            <div className="admin-noticias-tabla-contenedor">
              <table className="admin-noticias-tabla">
                <thead>
                  <tr>
                    <th scope="col">
                      Imagen
                    </th>

                    <th scope="col">
                      Título
                    </th>

                    <th scope="col">
                      Categoría
                    </th>

                    <th scope="col">
                      Fecha
                    </th>

                    <th scope="col">
                      Estado
                    </th>

                    <th scope="col">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {noticiasFiltradas.map(
                    (noticia) => (
                      <tr key={noticia.id}>
                        <td>
                          {noticia.imagen_url ? (
                            <img
                              className="admin-noticias-miniatura"
                              src={
                                obtenerUrlArchivo(
                                  noticia.imagen_url
                                )
                              }
                              alt=""
                            />
                          ) : (
                            <span>
                              Sin imagen
                            </span>
                          )}
                        </td>

                        <td>
                          <strong>
                            {noticia.titulo}
                          </strong>
                        </td>

                        <td>
                          {noticia.categoria}
                        </td>

                        <td>
                          {noticia.fecha}
                        </td>

                        <td>
                          {noticia.activo
                            ? "Publicada"
                            : "No publicada"}
                        </td>

                        <td>
                          <div className="admin-noticias-acciones-fila">
                            <button
                              type="button"
                              onClick={() =>
                                abrirEdicion(
                                  noticia
                                )
                              }
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                cambiarEstado(
                                  noticia
                                )
                              }
                            >
                              {noticia.activo
                                ? "Despublicar"
                                : "Publicar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}

                  {noticiasFiltradas.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="admin-noticias-vacio"
                      >
                        No hay noticias registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </article>
    </>
  );
}