
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

const campos = [
  {
    clave: "hero_titulo",
    etiqueta: "Título principal",
  },
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

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let activo = true;

    const cargarConfiguracion = async () => {
      try {
        const respuesta =
          await api.get<ConfiguracionPublicaRespuesta>(
            "/configuracion-publica/home"
          );

        if (!activo) return;

        setValores(respuesta.valores);
        setError("");
      } catch (error) {
        if (!activo) return;

        setError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la configuración del inicio"
        );
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    };

    void cargarConfiguracion();

    return () => {
      activo = false;
    };
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

    if (!user || guardando) return;

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      const respuesta =
        await api.put<ConfiguracionPublicaRespuesta>(
          "/configuracion-publica/home",
          { valores },
          user.token
        );

      setValores(respuesta.valores);
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
          <h2>Página de inicio</h2>
          <p>
            Administrá el contenido principal y los
            accesos destacados del Home.
          </p>
        </header>

        <form onSubmit={guardar}>
          <div className="admin-home-campos">
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
