// Administra los textos generales de la página pública de carreras.

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { api } from "../../../../../shared/api/client";
import { useAuth } from "../../../../manejo-sesion/useAuth";

import CampoConfiguracion from "../componentes/CampoConfiguracion";
import MensajeHomeAdmin from "../componentes/MensajeHomeAdmin";

import type {
  ConfiguracionPublicaRespuesta,
} from "../tipos/homeAdmin";


export default function CarrerasPublicasAdmin() {
  const { user } = useAuth();

  const [valores, setValores] =
    useState<Record<string, string>>({});

  const [cargando, setCargando] =
    useState(true);

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");


  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);
        setError("");

        const respuesta =
          await api.get<ConfiguracionPublicaRespuesta>(
            "/configuracion-publica/carreras"
          );

        setValores(
          respuesta.valores
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la configuración de carreras"
        );
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, []);


  const modificarCampo = (
    clave: string,
    valor: string
  ) => {
    setValores((anteriores) => ({
      ...anteriores,
      [clave]: valor,
    }));
  };


  const guardar = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      const respuesta =
        await api.put<ConfiguracionPublicaRespuesta>(
          "/configuracion-publica/carreras",
          {
            valores,
          },
          user.token
        );

      setValores(
        respuesta.valores
      );

      setMensaje(
        "La configuración de Carreras fue actualizada correctamente."
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los cambios"
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
          <h2>
            Carreras públicas
          </h2>

          <p>
            Administrá los textos generales que
            acompañan a la oferta académica pública.
          </p>
        </header>

        <form onSubmit={guardar}>
          <div className="admin-home-campos">
            <CampoConfiguracion
              id="carreras-titulo"
              etiqueta="Título de la página"
              valor={valores.titulo ?? ""}
              alCambiar={(valor) =>
                modificarCampo(
                  "titulo",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="carreras-descripcion"
              etiqueta="Descripción de la página"
              multilinea
              valor={
                valores.descripcion ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "descripcion",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="carreras-inscripcion-titulo"
              etiqueta="Título del bloque de inscripción"
              valor={
                valores.inscripcion_titulo ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "inscripcion_titulo",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="carreras-inscripcion-descripcion"
              etiqueta="Descripción del bloque de inscripción"
              multilinea
              valor={
                valores.inscripcion_descripcion ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "inscripcion_descripcion",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="carreras-inscripcion-boton"
              etiqueta="Texto del botón de inscripción"
              valor={
                valores.inscripcion_boton ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "inscripcion_boton",
                  valor
                )
              }
            />
          </div>

          <footer className="admin-home-acciones">
            <button
              type="submit"
              disabled={guardando}
            >
              {guardando
                ? "Guardando..."
                : "Guardar cambios"}
            </button>
          </footer>
        </form>
      </article>
    </>
  );
}