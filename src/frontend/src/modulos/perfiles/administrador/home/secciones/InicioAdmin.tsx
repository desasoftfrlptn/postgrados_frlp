
import { useEffect, useState, type FormEvent } from "react";

import { api } from "../../../../../shared/api/client";
import { useAuth } from "../../../../manejo-sesion/useAuth";

import CampoConfiguracion from "../componentes/CampoConfiguracion";
import MensajeHomeAdmin from "../componentes/MensajeHomeAdmin";

import type {
  ConfiguracionPublicaRespuesta,
} from "../tipos/homeAdmin";

type AccionConfirmacion = "guardar" | "restablecer" | null;

const campos = [
  { clave: "hero_titulo", etiqueta: "Título principal" },
  {
    clave: "hero_descripcion",
    etiqueta: "Descripción principal",
    multilinea: true,
  },
  {
    clave: "boton_inscripcion",
    etiqueta: "Texto del botón de inscripción",
  },
  {
    clave: "boton_informacion",
    etiqueta: "Texto del botón de información",
  },
  {
    clave: "boton_estado_inscripcion",
    etiqueta: "Texto del botón de estado de inscripción",
  },
  {
    clave: "tarjeta_carreras_titulo",
    etiqueta: "Título de Carreras",
  },
  {
    clave: "tarjeta_carreras_descripcion",
    etiqueta: "Descripción de Carreras",
    multilinea: true,
  },
  {
    clave: "tarjeta_carreras_enlace",
    etiqueta: "Texto del enlace de Carreras",
  },
  {
    clave: "tarjeta_calendario_titulo",
    etiqueta: "Título de Calendario",
  },
  {
    clave: "tarjeta_calendario_descripcion",
    etiqueta: "Descripción de Calendario",
    multilinea: true,
  },
  {
    clave: "tarjeta_calendario_enlace",
    etiqueta: "Texto del enlace de Calendario",
  },
  {
    clave: "tarjeta_noticias_titulo",
    etiqueta: "Título de Noticias",
  },
  {
    clave: "tarjeta_noticias_descripcion",
    etiqueta: "Descripción de Noticias",
    multilinea: true,
  },
  {
    clave: "tarjeta_noticias_enlace",
    etiqueta: "Texto del enlace de Noticias",
  },
  {
    clave: "tarjeta_faq_titulo",
    etiqueta: "Título de Preguntas frecuentes",
  },
  {
    clave: "tarjeta_faq_descripcion",
    etiqueta: "Descripción de Preguntas frecuentes",
    multilinea: true,
  },
  {
    clave: "tarjeta_faq_enlace",
    etiqueta: "Texto del enlace de Preguntas frecuentes",
  },
];

export default function InicioAdmin() {
  const { user } = useAuth();

  const [valores, setValores] =
    useState<Record<string, string>>({});
  const [valoresGuardados, setValoresGuardados] =
    useState<Record<string, string>>({});

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [confirmacion, setConfirmacion] =
    useState<AccionConfirmacion>(null);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      try {
        const respuesta =
          await api.get<ConfiguracionPublicaRespuesta>(
            "/configuracion-publica/home"
          );

        if (!activo) return;

        setValores({ ...respuesta.valores });
        setValoresGuardados({ ...respuesta.valores });
      } catch (error) {
        if (!activo) return;

        setError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la configuración."
        );
      } finally {
        if (activo) setCargando(false);
      }
    };

    void cargar();

    return () => {
      activo = false;
    };
  }, []);

  const modificarCampo = (clave: string, valor: string) => {
    setValores((actual) => ({
      ...actual,
      [clave]: valor,
    }));
  };

  const comenzarEdicion = () => {
    setError("");
    setMensaje("");
    setEditando(true);
  };

  const cancelarEdicion = () => {
    setValores({ ...valoresGuardados });
    setEditando(false);
    setError("");
    setMensaje("");
  };

  const solicitarGuardado = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();

    if (!editando || guardando || !user) return;

    if (campos.some((campo) => !valores[campo.clave]?.trim())) {
      setError("Todos los campos de Inicio deben tener contenido.");
      return;
    }

    setError("");
    setConfirmacion("guardar");
  };

  const confirmarAccion = async () => {
    if (!user || !confirmacion || guardando) return;

    const accion = confirmacion;

    setConfirmacion(null);
    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      let respuesta: ConfiguracionPublicaRespuesta;

      if (accion === "restablecer") {
        respuesta = await api.post<ConfiguracionPublicaRespuesta>(
          "/configuracion-publica/home/restablecer",
          undefined,
          user.token
        );
      } else {
        respuesta = await api.put<ConfiguracionPublicaRespuesta>(
          "/configuracion-publica/home",
          { valores },
          user.token
        );
      }

      setValores({ ...respuesta.valores });
      setValoresGuardados({ ...respuesta.valores });
      setEditando(false);

      setMensaje(
        accion === "restablecer"
          ? "Se restableció la configuración predeterminada del Inicio."
          : "La página de inicio fue actualizada correctamente."
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo completar la operación."
      );
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <p className="admin-home-cargando">
        Cargando configuración...
      </p>
    );
  }

  return (
    <>
      <MensajeHomeAdmin error={error} mensaje={mensaje} />

      <article className="admin-home-panel">
        <header>
          <h2>Página de inicio</h2>
          <p>
            Administrá el contenido principal y los accesos
            destacados del Home.
          </p>
        </header>

        {editando && (
          <p className="admin-inicio-aviso" role="status">
            Estás modificando la página pública de Inicio.
            Los cambios se aplicarán cuando confirmes el guardado.
          </p>
        )}

        <form onSubmit={solicitarGuardado}>
          <fieldset
            className="admin-home-campos admin-inicio-campos"
            disabled={!editando || guardando}
          >
            {campos.map((campo) => (
              <CampoConfiguracion
                key={campo.clave}
                id={`home-${campo.clave.replaceAll("_", "-")}`}
                etiqueta={campo.etiqueta}
                multilinea={campo.multilinea ?? false}
                valor={valores[campo.clave] ?? ""}
                alCambiar={(valor) =>
                  modificarCampo(campo.clave, valor)
                }
              />
            ))}
          </fieldset>

          <footer className="admin-home-acciones admin-inicio-acciones">
            {editando ? (
              <>
                <button
                  type="button"
                  className="admin-inicio-boton-secundario"
                  onClick={cancelarEdicion}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button type="submit" disabled={guardando}>
                  {guardando ? "Guardando..." : "Guardar cambios"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="admin-inicio-boton-secundario"
                  onClick={() => setConfirmacion("restablecer")}
                  disabled={guardando || !user}
                >
                  Restablecer configuración predeterminada
                </button>

                <button
                  type="button"
                  onClick={comenzarEdicion}
                  disabled={guardando || !user}
                >
                  Modificar
                </button>
              </>
            )}
          </footer>
        </form>
      </article>

      {confirmacion && (
        <div className="admin-inicio-modal-fondo">
          <section
            className="admin-inicio-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="inicio-confirmacion-titulo"
            aria-describedby="inicio-confirmacion-descripcion"
          >
            <h3 id="inicio-confirmacion-titulo">
              {confirmacion === "guardar"
                ? "¿Guardar los cambios?"
                : "¿Restablecer la configuración?"}
            </h3>

            <p id="inicio-confirmacion-descripcion">
              {confirmacion === "guardar"
                ? "Los nuevos textos se mostrarán en el Inicio público después de guardar."
                : "Se reemplazarán todos los textos actuales del Inicio por los valores predeterminados. Esta acción se guardará en el sistema."}
            </p>

            <div className="admin-inicio-modal-acciones">
              <button
                type="button"
                className="admin-inicio-boton-secundario"
                onClick={() => setConfirmacion(null)}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void confirmarAccion()}
              >
                {confirmacion === "guardar"
                  ? "Confirmar guardado"
                  : "Confirmar restablecimiento"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
