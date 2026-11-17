// Administra los textos configurables de la página pública de inicio.

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


export default function InicioAdmin() {
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
    const cargarConfiguracion = async () => {
      try {
        setCargando(true);
        setError("");

        const respuesta =
          await api.get<ConfiguracionPublicaRespuesta>(
            "/configuracion-publica/home"
          );

        setValores(
          respuesta.valores
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la configuración del inicio"
        );
      } finally {
        setCargando(false);
      }
    };

    cargarConfiguracion();
  }, []);


  const modificarCampo = (
    clave: string,
    valor: string
  ) => {
    setValores(
      (anteriores) => ({
        ...anteriores,
        [clave]: valor,
      })
    );
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
          "/configuracion-publica/home",
          {
            valores,
          },
          user.token
        );

      setValores(
        respuesta.valores
      );

      setMensaje(
        "La página de inicio fue actualizada correctamente."
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
            Página de inicio
          </h2>

          <p>
            Administrá el contenido principal
            y los accesos destacados del Home.
          </p>
        </header>

        <form onSubmit={guardar}>
          <div className="admin-home-campos">
            <CampoConfiguracion
              id="home-hero-titulo"
              etiqueta="Título principal"
              valor={
                valores.hero_titulo ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "hero_titulo",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="home-hero-descripcion"
              etiqueta="Descripción principal"
              multilinea
              valor={
                valores.hero_descripcion ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "hero_descripcion",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="home-boton-inscripcion"
              etiqueta="Texto del botón de inscripción"
              valor={
                valores.boton_inscripcion ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "boton_inscripcion",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="home-boton-informacion"
              etiqueta="Texto del botón de información"
              valor={
                valores.boton_informacion ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "boton_informacion",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="home-carreras-titulo"
              etiqueta="Título de Carreras"
              valor={
                valores.tarjeta_carreras_titulo ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "tarjeta_carreras_titulo",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="home-carreras-descripcion"
              etiqueta="Descripción de Carreras"
              multilinea
              valor={
                valores.tarjeta_carreras_descripcion ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "tarjeta_carreras_descripcion",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="home-carreras-enlace"
              etiqueta="Texto del enlace de Carreras"
              valor={
                valores.tarjeta_carreras_enlace ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "tarjeta_carreras_enlace",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="home-calendario-titulo"
              etiqueta="Título de Calendario"
              valor={
                valores.tarjeta_calendario_titulo ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "tarjeta_calendario_titulo",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="home-calendario-descripcion"
              etiqueta="Descripción de Calendario"
              multilinea
              valor={
                valores.tarjeta_calendario_descripcion ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "tarjeta_calendario_descripcion",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="home-calendario-enlace"
              etiqueta="Texto del enlace de Calendario"
              valor={
                valores.tarjeta_calendario_enlace ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "tarjeta_calendario_enlace",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="home-noticias-titulo"
              etiqueta="Título de Noticias"
              valor={
                valores.tarjeta_noticias_titulo ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "tarjeta_noticias_titulo",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="home-noticias-descripcion"
              etiqueta="Descripción de Noticias"
              multilinea
              valor={
                valores.tarjeta_noticias_descripcion ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "tarjeta_noticias_descripcion",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="home-noticias-enlace"
              etiqueta="Texto del enlace de Noticias"
              valor={
                valores.tarjeta_noticias_enlace ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "tarjeta_noticias_enlace",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="home-faq-titulo"
              etiqueta="Título de Preguntas frecuentes"
              valor={
                valores.tarjeta_faq_titulo ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "tarjeta_faq_titulo",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="home-faq-descripcion"
              etiqueta="Descripción de Preguntas frecuentes"
              multilinea
              valor={
                valores.tarjeta_faq_descripcion ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "tarjeta_faq_descripcion",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="home-faq-enlace"
              etiqueta="Texto del enlace de Preguntas frecuentes"
              valor={
                valores.tarjeta_faq_enlace ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "tarjeta_faq_enlace",
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