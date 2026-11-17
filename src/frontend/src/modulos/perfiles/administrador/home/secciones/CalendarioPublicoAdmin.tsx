// Administra los parámetros generales del calendario académico público.

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


export default function CalendarioPublicoAdmin() {
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
            "/configuracion-publica/calendario"
          );

        setValores(
          respuesta.valores
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la configuración del calendario"
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

    const anioMinimo = Number(
      valores.anio_minimo
    );

    const anioMaximo = Number(
      valores.anio_maximo
    );

    if (
      !Number.isInteger(anioMinimo) ||
      !Number.isInteger(anioMaximo)
    ) {
      setError(
        "Los años deben ser números enteros."
      );

      return;
    }

    if (anioMinimo > anioMaximo) {
      setError(
        "El año mínimo no puede ser mayor que el año máximo."
      );

      return;
    }

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      const respuesta =
        await api.put<ConfiguracionPublicaRespuesta>(
          "/configuracion-publica/calendario",
          {
            valores,
          },
          user.token
        );

      setValores(
        respuesta.valores
      );

      setMensaje(
        "La configuración del calendario fue actualizada correctamente."
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
            Calendario público
          </h2>

          <p>
            Administrá la información general y
            el rango de años visible.
          </p>
        </header>

        <form onSubmit={guardar}>
          <div className="admin-home-campos">
            <CampoConfiguracion
              id="calendario-titulo"
              etiqueta="Título de la página"
              valor={
                valores.titulo ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "titulo",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="calendario-descripcion"
              etiqueta="Descripción"
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
              id="calendario-anio-minimo"
              etiqueta="Año mínimo visible"
              tipo="number"
              valor={
                valores.anio_minimo ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "anio_minimo",
                  valor
                )
              }
            />

            <CampoConfiguracion
              id="calendario-anio-maximo"
              etiqueta="Año máximo visible"
              tipo="number"
              valor={
                valores.anio_maximo ?? ""
              }
              alCambiar={(valor) =>
                modificarCampo(
                  "anio_maximo",
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