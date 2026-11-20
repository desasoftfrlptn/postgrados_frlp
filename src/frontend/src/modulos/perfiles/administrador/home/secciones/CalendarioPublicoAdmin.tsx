
import { useEffect, useState, type FormEvent } from "react";

import { api } from "../../../../../shared/api/client";
import { useAuth } from "../../../../manejo-sesion/useAuth";
import MensajeHomeAdmin from "../componentes/MensajeHomeAdmin";
import EventosAdmin from "./EventosAdmin";

interface ConfiguracionCalendario {
  valores: Record<string, string>;
}

export default function CalendarioPublicoAdmin() {
  const { user } = useAuth();

  const [valores, setValores] = useState<Record<string, string>>({});
  const [originales, setOriginales] = useState<Record<string, string>>({});

  const [editando, setEditando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
  if (!mensaje) return;

  const temporizador = window.setTimeout(() => {
    setMensaje("");
  }, 5000);

  return () => {
    window.clearTimeout(temporizador);
  };
  }, [mensaje]);

  useEffect(() => {
    let activo = true;

    async function cargarConfiguracion() {
      try {
        const respuesta = await api.get<ConfiguracionCalendario>(
          "/configuracion-publica/calendario"
        );

        if (activo) {
          setValores(respuesta.valores);
          setOriginales(respuesta.valores);
        }
      } catch {
        if (activo) {
          setError(
            "No se pudo cargar la configuración del calendario."
          );
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    void cargarConfiguracion();

    return () => {
      activo = false;
    };
  }, []);

  function modificar() {
    setError("");
    setMensaje("");
    setEditando(true);
  }

  function modificarCampo(clave: string, valor: string) {
    setValores((anterior) => ({
      ...anterior,
      [clave]: valor,
    }));
  }

  function cancelar() {
    setValores({ ...originales });
    setEditando(false);
    setError("");
    setMensaje("");
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.token) {
      setError("Necesitás iniciar sesión para guardar cambios.");
      return;
    }

    const minimo = Number(valores.anio_minimo);
    const maximo = Number(valores.anio_maximo);

    if (
      !Number.isInteger(minimo) ||
      !Number.isInteger(maximo) ||
      minimo > maximo
    ) {
      setError("El rango de años ingresado no es válido.");
      return;
    }

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      const respuesta = await api.put<ConfiguracionCalendario>(
        "/configuracion-publica/calendario",
        { valores },
        user.token
      );

      setValores(respuesta.valores);
      setOriginales(respuesta.valores);
      setEditando(false);

      setMensaje(
        "La configuración del calendario fue actualizada correctamente."
      );
    } catch {
      setError("No se pudieron guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <MensajeHomeAdmin error={error} mensaje={mensaje} />

      <article className="admin-home-panel">
        <header>
          <h2>Calendario público</h2>
          <p>
            Administrá la información general y el rango de años visible.
          </p>
        </header>

        {cargando ? (
          <p className="admin-home-cargando">
            Cargando configuración...
          </p>
        ) : !editando ? (
          <div className="admin-home-formulario-lectura">
            <div className="admin-home-campos">
              <div className="admin-home-campo">
                <strong>Título de la página</strong>
                <p>{valores.titulo}</p>
              </div>

              <div className="admin-home-campo">
                <strong>Descripción</strong>
                <p>{valores.descripcion}</p>
              </div>

              <div className="admin-home-campo">
                <strong>Año mínimo visible</strong>
                <p>{valores.anio_minimo}</p>
              </div>

              <div className="admin-home-campo">
                <strong>Año máximo visible</strong>
                <p>{valores.anio_maximo}</p>
              </div>
            </div>

            <footer className="admin-home-acciones">
              <button
                type="button"
                onClick={modificar}
              >
                Modificar
              </button>
            </footer>
          </div>
        ) : (
          <form onSubmit={guardar}>
            <div className="admin-home-campos">
              <div className="admin-home-campo">
                <label htmlFor="calendario-titulo">
                  Título de la página
                </label>
                <input
                  id="calendario-titulo"
                  type="text"
                  required
                  value={valores.titulo ?? ""}
                  onChange={(e) =>
                    modificarCampo("titulo", e.target.value)
                  }
                />
              </div>

              <div className="admin-home-campo">
                <label htmlFor="calendario-descripcion">
                  Descripción
                </label>
                <textarea
                  id="calendario-descripcion"
                  rows={3}
                  required
                  value={valores.descripcion ?? ""}
                  onChange={(e) =>
                    modificarCampo("descripcion", e.target.value)
                  }
                />
              </div>

              <div className="admin-home-campo">
                <label htmlFor="calendario-anio-minimo">
                  Año mínimo visible
                </label>
                <input
                  id="calendario-anio-minimo"
                  type="number"
                  required
                  value={valores.anio_minimo ?? ""}
                  onChange={(e) =>
                    modificarCampo("anio_minimo", e.target.value)
                  }
                />
              </div>

              <div className="admin-home-campo">
                <label htmlFor="calendario-anio-maximo">
                  Año máximo visible
                </label>
                <input
                  id="calendario-anio-maximo"
                  type="number"
                  required
                  value={valores.anio_maximo ?? ""}
                  onChange={(e) =>
                    modificarCampo("anio_maximo", e.target.value)
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

              <button type="submit" disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </footer>
          </form>
        )}
      </article>

      <EventosAdmin />
    </>
  );
}
