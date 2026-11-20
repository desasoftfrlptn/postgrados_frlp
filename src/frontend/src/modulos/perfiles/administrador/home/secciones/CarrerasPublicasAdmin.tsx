
import { useEffect, useState } from "react";

import { api } from "../../../../../shared/api/client";
import { useAuth } from "../../../../manejo-sesion/useAuth";

import CampoConfiguracion from "../componentes/CampoConfiguracion";
import MensajeHomeAdmin from "../componentes/MensajeHomeAdmin";

import type {
  ConfiguracionPublicaRespuesta,
} from "../tipos/homeAdmin";

const campos = [
  {
    clave: "titulo",
    etiqueta: "Título de la página",
  },
  {
    clave: "descripcion",
    etiqueta: "Descripción de la página",
    multilinea: true,
  },
  {
    clave: "inscripcion_titulo",
    etiqueta: "Título del bloque de inscripción",
  },
  {
    clave: "inscripcion_descripcion",
    etiqueta: "Descripción del bloque de inscripción",
    multilinea: true,
  },
  {
    clave: "inscripcion_boton",
    etiqueta: "Texto del botón de inscripción",
  },
];

export default function CarrerasPublicasAdmin() {
  const { user } = useAuth();

  const [valores, setValores] =
    useState<Record<string, string>>({});

  const [valoresGuardados, setValoresGuardados] =
    useState<Record<string, string>>({});

  const [cargando, setCargando] =
    useState(true);

  const [guardando, setGuardando] =
    useState(false);

  const [editando, setEditando] =
    useState(false);

  const [confirmarGuardado, setConfirmarGuardado] =
    useState(false);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const hayCambios = campos.some(
    (campo) =>
      (valores[campo.clave] ?? "") !==
      (valoresGuardados[campo.clave] ?? "")
  );

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      try {
        const respuesta =
          await api.get<ConfiguracionPublicaRespuesta>(
            "/configuracion-publica/carreras"
          );

        if (!activo) return;

        setValores({ ...respuesta.valores });
        setValoresGuardados({
          ...respuesta.valores,
        });
        setError("");
      } catch (error) {
        if (!activo) return;

        setError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la configuración de Carreras."
        );
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    };

    void cargar();

    return () => {
      activo = false;
    };
  }, []);

  const modificarCampo = (
    clave: string,
    valor: string
  ) => {
    if (!editando || guardando) return;

    setValores((anteriores) => ({
      ...anteriores,
      [clave]: valor,
    }));
  };

  const comenzarEdicion = () => {
    if (guardando || !user) return;

    setValores({ ...valoresGuardados });
    setConfirmarGuardado(false);
    setError("");
    setMensaje("");
    setEditando(true);
  };

  const cancelarEdicion = () => {
    if (guardando) return;

    setValores({ ...valoresGuardados });
    setEditando(false);
    setConfirmarGuardado(false);
    setError("");
    setMensaje("");
  };

  const solicitarGuardado = () => {
    if (
      !user ||
      !editando ||
      guardando ||
      !hayCambios
    ) {
      return;
    }

    const hayCamposVacios = campos.some(
      (campo) =>
        !(valores[campo.clave] ?? "").trim()
    );

    if (hayCamposVacios) {
      setError(
        "Todos los campos de Carreras deben tener contenido."
      );
      return;
    }

    setError("");
    setConfirmarGuardado(true);
  };

  const guardar = async () => {
    if (
      !user ||
      !editando ||
      guardando ||
      !confirmarGuardado ||
      !hayCambios
    ) {
      return;
    }

    setConfirmarGuardado(false);
    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const respuesta =
        await api.put<ConfiguracionPublicaRespuesta>(
          "/configuracion-publica/carreras",
          { valores },
          user.token
        );

      setValores({ ...respuesta.valores });
      setValoresGuardados({
        ...respuesta.valores,
      });
      setEditando(false);

      setMensaje(
        "La configuración de Carreras fue actualizada correctamente."
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los cambios."
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
      <MensajeHomeAdmin
        error={error}
        mensaje={mensaje}
      />

      <article className="admin-home-panel">
        <header>
          <h2>Carreras públicas</h2>

          <p>
            Administrá los textos generales que
            acompañan a la oferta académica pública.
          </p>
        </header>

        {editando && (
          <p
            className="admin-inicio-aviso"
            role="status"
          >
            Estás modificando la página pública
            de Carreras. Los cambios se aplicarán
            cuando confirmes el guardado.
          </p>
        )}

        <fieldset
          className="admin-home-campos admin-inicio-campos"
          disabled={!editando || guardando}
        >
          {campos.map((campo) => (
            <CampoConfiguracion
              key={campo.clave}
              id={`carreras-${campo.clave.replaceAll(
                "_",
                "-"
              )}`}
              etiqueta={campo.etiqueta}
              multilinea={
                campo.multilinea ?? false
              }
              valor={
                valores[campo.clave] ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  campo.clave,
                  valor
                )
              }
            />
          ))}
        </fieldset>

        <footer
          className="admin-home-acciones admin-inicio-acciones"
        >
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

              <button
                type="button"
                onClick={solicitarGuardado}
                disabled={
                  guardando || !hayCambios
                }
              >
                {guardando
                  ? "Guardando..."
                  : "Guardar cambios"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={comenzarEdicion}
              disabled={
                guardando || !user
              }
            >
              Modificar
            </button>
          )}
        </footer>
      </article>

      {confirmarGuardado && (
        <div className="admin-inicio-modal-fondo">
          <section
            className="admin-inicio-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="carreras-confirmacion-titulo"
            aria-describedby="carreras-confirmacion-descripcion"
          >
            <h3 id="carreras-confirmacion-titulo">
              ¿Guardar los cambios?
            </h3>

            <p id="carreras-confirmacion-descripcion">
              Los nuevos textos se mostrarán
              en la página pública de Carreras
              después de guardar.
            </p>

            <div className="admin-inicio-modal-acciones">
              <button
                type="button"
                className="admin-inicio-boton-secundario"
                onClick={() =>
                  setConfirmarGuardado(false)
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void guardar()}
              >
                Confirmar guardado
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
