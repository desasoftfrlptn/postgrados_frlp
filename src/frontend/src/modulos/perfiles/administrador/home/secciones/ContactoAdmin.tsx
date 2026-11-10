// Administra la información visible en la página pública de contacto.

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


export default function ContactoAdmin() {
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
            "/configuracion-publica/contacto"
          );

        setValores(
          respuesta.valores
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la configuración de contacto"
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
          "/configuracion-publica/contacto",
          {
            valores,
          },
          user.token
        );

      setValores(
        respuesta.valores
      );

      setMensaje(
        "La información de contacto fue actualizada correctamente."
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
            Contacto
          </h2>

          <p>
            Administrá los textos y datos de contacto
            visibles para los visitantes.
          </p>
        </header>

        <form onSubmit={guardar}>
          <div className="admin-home-campos">
            <CampoConfiguracion
              id="contacto-titulo"
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
              id="contacto-descripcion"
              etiqueta="Descripción principal"
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
              id="contacto-formulario-titulo"
              etiqueta="Título del formulario"
              valor={
                valores.formulario_titulo ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "formulario_titulo",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="contacto-formulario-descripcion"
              etiqueta="Descripción del formulario"
              multilinea
              valor={
                valores.formulario_descripcion ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "formulario_descripcion",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="contacto-direccion"
              etiqueta="Dirección"
              valor={
                valores.direccion ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "direccion",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="contacto-email"
              etiqueta="Correo electrónico"
              tipo="email"
              valor={
                valores.email ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "email",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="contacto-telefono"
              etiqueta="Teléfono"
              valor={
                valores.telefono ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "telefono",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="contacto-horario"
              etiqueta="Horario de atención"
              valor={
                valores.horario ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "horario",
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