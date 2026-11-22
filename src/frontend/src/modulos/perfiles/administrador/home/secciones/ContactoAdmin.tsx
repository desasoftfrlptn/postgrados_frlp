import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { useAuth } from "../../../../manejo-sesion/useAuth";

import {
  obtenerConfiguracionContacto,
  actualizarConfiguracionContacto,
  restablecerConfiguracionContacto,
} from "../../../../../shared/api/contacto";

import {
  validarContacto,
  CAMPOS_CONTACTO,
  type CampoContacto,
  type ErroresContacto,
} from "../../../../../shared/validaciones/contacto";

import ConfirmacionModal from "../../../../../shared/componentes/ConfirmacionModal/ConfirmacionModal";

import CampoConfiguracion from "../componentes/CampoConfiguracion";
import MensajeHomeAdmin from "../componentes/MensajeHomeAdmin";

type AccionConfirmacion =
  | "guardar"
  | "cancelar"
  | "restablecer"
  | null;

interface DefinicionCampo {
  clave: CampoContacto;
  etiqueta: string;
  multilinea?: boolean;
  tipo?: "text" | "email";
  obligatorio?: boolean;
  maxLength?: number;
}

const campos: DefinicionCampo[] = [
  {
    clave: "titulo",
    etiqueta: "Título de la página",
    maxLength: 1000,
  },
  {
    clave: "descripcion",
    etiqueta: "Descripción principal",
    multilinea: true,
    maxLength: 1000,
  },
  {
    clave: "formulario_titulo",
    etiqueta: "Título del formulario",
    maxLength: 1000,
  },
  {
    clave: "formulario_descripcion",
    etiqueta: "Descripción del formulario",
    multilinea: true,
    maxLength: 1000,
  },
  {
    clave: "direccion",
    etiqueta: "Dirección",
    maxLength: 1000,
  },
  {
    clave: "email",
    etiqueta: "Correo electrónico",
    tipo: "email",
    maxLength: 254,
  },
  {
    clave: "telefono",
    etiqueta: "Teléfono",
    maxLength: 50,
  },
  {
    clave: "horario",
    etiqueta: "Horario de atención",
    maxLength: 1000,
  },
  {
    clave: "facebook",
    etiqueta: "Facebook",
    obligatorio: false,
    maxLength: 500,
  },
  {
    clave: "instagram",
    etiqueta: "Instagram",
    obligatorio: false,
    maxLength: 500,
  },
  {
    clave: "linkedin",
    etiqueta: "LinkedIn",
    obligatorio: false,
    maxLength: 500,
  },
  {
    clave: "youtube",
    etiqueta: "YouTube",
    obligatorio: false,
    maxLength: 500,
  },
];

const textosConfirmacion = {
  guardar: {
    titulo: "¿Guardar los cambios?",
    descripcion:
      "Los datos de contacto se actualizarán en el sitio público y el pie de página.",
    boton: "Confirmar guardado",
  },
  cancelar: {
    titulo: "¿Descartar los cambios?",
    descripcion:
      "Se perderán las modificaciones que todavía no guardaste.",
    boton: "Descartar cambios",
  },
  restablecer: {
    titulo: "¿Restablecer la configuración predeterminada?",
    descripcion:
      "Se reemplazarán los datos actuales de contacto y del pie de página por sus valores originales, incluidas las redes sociales.",
    boton: "Restablecer configuración",
  },
};

export default function ContactoAdmin() {
  const { user } = useAuth();

  const [valores, setValores] =
    useState<Record<string, string>>({});

  const [valoresGuardados, setValoresGuardados] =
    useState<Record<string, string>>({});

  const [errores, setErrores] =
    useState<ErroresContacto>({});

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const [intentoCarga, setIntentoCarga] = useState(0);

  const [confirmacion, setConfirmacion] =
    useState<AccionConfirmacion>(null);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const hayCambios = CAMPOS_CONTACTO.some(
    (campo) =>
      (valores[campo] ?? "") !==
      (valoresGuardados[campo] ?? "")
  );

  const textoModal = confirmacion
    ? textosConfirmacion[confirmacion]
    : textosConfirmacion.guardar;

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const respuesta =
          await obtenerConfiguracionContacto();

        if (!activo) return;

        setValores({ ...respuesta.valores });
        setValoresGuardados({ ...respuesta.valores });
        setErrorCarga(false);
        setError("");
      } catch (error) {
        if (!activo) return;

        setErrorCarga(true);

        setError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la configuración de contacto."
        );
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    void cargar();

    return () => {
      activo = false;
    };
  }, [intentoCarga]);

  function reintentarCarga() {
    setCargando(true);
    setErrorCarga(false);
    setError("");
    setIntentoCarga((anterior) => anterior + 1);
  }

  function comenzarEdicion() {
    if (!user || guardando || errorCarga) return;

    setValores({ ...valoresGuardados });
    setErrores({});
    setError("");
    setMensaje("");
    setEditando(true);
  }

  function modificarCampo(
    campo: CampoContacto,
    valor: string
  ) {
    if (!editando || guardando || confirmacion) {
      return;
    }

    setValores((anteriores) => ({
      ...anteriores,
      [campo]: valor,
    }));

    setErrores((anteriores) => ({
      ...anteriores,
      [campo]: undefined,
    }));
  }

  function descartarCambios() {
    setValores({ ...valoresGuardados });
    setErrores({});
    setError("");
    setMensaje("");
    setEditando(false);
    setConfirmacion(null);
  }

  function cancelarEdicion() {
    if (guardando) return;

    if (hayCambios) {
      setConfirmacion("cancelar");
    } else {
      descartarCambios();
    }
  }

  function solicitarRestablecimiento() {
    if (
      !user ||
      editando ||
      guardando ||
      errorCarga ||
      confirmacion
    ) {
      return;
    }

    setError("");
    setMensaje("");
    setConfirmacion("restablecer");
  }

  function solicitarGuardado(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !user ||
      !editando ||
      !hayCambios ||
      guardando ||
      confirmacion
    ) {
      return;
    }

    const erroresDetectados = validarContacto(valores);

    setErrores(erroresDetectados);
    setMensaje("");

    if (Object.keys(erroresDetectados).length > 0) {
      setError(
        "Revisá los campos indicados antes de guardar."
      );
      return;
    }

    setError("");
    setConfirmacion("guardar");
  }

  async function ejecutarOperacion(
    accion: "guardar" | "restablecer"
  ) {
    if (!user || guardando) return;

    if (accion === "guardar") {
      if (!editando || !hayCambios) return;

      const erroresDetectados = validarContacto(valores);

      if (Object.keys(erroresDetectados).length > 0) {
        setErrores(erroresDetectados);
        setConfirmacion(null);
        setError("Revisá los campos indicados.");
        return;
      }
    }

    if (accion === "restablecer" && editando) {
      return;
    }

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      const respuesta =
        accion === "restablecer"
          ? await restablecerConfiguracionContacto(
              user.token
            )
          : await actualizarConfiguracionContacto(
              Object.fromEntries(
                CAMPOS_CONTACTO.map((campo) => [
                  campo,
                  (valores[campo] ?? "").trim(),
                ])
              ),
              user.token
            );

      setValores({ ...respuesta.valores });
      setValoresGuardados({ ...respuesta.valores });
      setErrores({});
      setEditando(false);

      setMensaje(
        accion === "restablecer"
          ? "Se restableció la configuración predeterminada de contacto."
          : "La información de contacto fue actualizada correctamente."
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo completar la operación."
      );
    } finally {
      setGuardando(false);
      setConfirmacion(null);
    }
  }

  function confirmarAccion() {
    if (confirmacion === "cancelar") {
      descartarCambios();
      return;
    }

    if (
      confirmacion === "guardar" ||
      confirmacion === "restablecer"
    ) {
      return ejecutarOperacion(confirmacion);
    }
  }

  if (cargando) {
    return (
      <p
        className="admin-home-cargando"
        role="status"
      >
        Cargando configuración de contacto...
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
          <h2>Contacto y pie de página</h2>

          <p>
            Administrá la información de contacto y
            los datos institucionales que se muestran
            en el sitio público.
          </p>
        </header>

        {errorCarga ? (
          <div className="admin-home-formulario-lectura">
            <div className="admin-home-acciones">
              <button
                type="button"
                onClick={reintentarCarga}
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={solicitarGuardado}
            aria-busy={guardando}
          >
            {editando && (
              <p
                className="admin-inicio-aviso"
                role="status"
              >
                Los cambios se aplicarán al sitio
                público después de confirmar el
                guardado.
              </p>
            )}

            <fieldset
              className="admin-home-campos admin-inicio-campos"
              disabled={
                !editando ||
                guardando ||
                confirmacion !== null
              }
            >
              {campos.map((campo) => (
                <CampoConfiguracion
                  key={campo.clave}
                  id={`contacto-${campo.clave.replaceAll("_", "-")}`}
                  etiqueta={campo.etiqueta}
                  tipo={campo.tipo}
                  multilinea={campo.multilinea}
                  obligatorio={campo.obligatorio ?? true}
                  maxLength={campo.maxLength}
                  valor={valores[campo.clave] ?? ""}
                  error={errores[campo.clave]}
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
                    disabled={
                      guardando || confirmacion !== null
                    }
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={
                      !user ||
                      !hayCambios ||
                      guardando ||
                      confirmacion !== null
                    }
                  >
                    {guardando
                      ? "Guardando..."
                      : "Guardar cambios"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="admin-inicio-boton-secundario"
                    onClick={solicitarRestablecimiento}
                    disabled={
                      !user ||
                      guardando ||
                      confirmacion !== null
                    }
                  >
                    Restablecer configuración predeterminada
                  </button>

                  <button
                    type="button"
                    onClick={comenzarEdicion}
                    disabled={
                      !user ||
                      guardando ||
                      confirmacion !== null
                    }
                  >
                    Modificar
                  </button>
                </>
              )}
            </footer>
          </form>
        )}
      </article>

      <ConfirmacionModal
        abierto={confirmacion !== null}
        titulo={textoModal.titulo}
        descripcion={textoModal.descripcion}
        textoConfirmar={textoModal.boton}
        textoCancelar="Volver"
        peligroso={
          confirmacion === "cancelar" ||
          confirmacion === "restablecer"
        }
        confirmando={guardando}
        alConfirmar={confirmarAccion}
        alCancelar={() => setConfirmacion(null)}
      />
    </>
  );
}