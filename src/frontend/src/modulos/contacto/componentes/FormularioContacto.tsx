import { useRef, useState } from "react";
import type { FormEvent } from "react";

import {
  enviarConsultaContacto,
  type ConsultaContacto,
} from "../../../shared/api/contacto";

import {
  emailValido,
} from "../../../shared/validaciones/contacto";

import ConfirmacionModal from "../../../shared/componentes/ConfirmacionModal/ConfirmacionModal";

import MensajeSistema from "../../../shared/componentes/MensajeSistema/MensajeSistema";

type ErroresFormulario = Partial<
  Record<keyof ConsultaContacto, string>
>;

const formularioInicial: ConsultaContacto = {
  nombre: "",
  email: "",
  asunto: "",
  mensaje: "",
};

const campos = [
  {
    clave: "nombre",
    etiqueta: "Nombre y apellido",
    tipo: "text",
    maxLength: 120,
    autoComplete: "name",
  },
  {
    clave: "email",
    etiqueta: "Correo electrónico",
    tipo: "email",
    maxLength: 254,
    autoComplete: "email",
  },
  {
    clave: "asunto",
    etiqueta: "Asunto",
    tipo: "text",
    maxLength: 150,
    autoComplete: "off",
  },
] as const;

function validarFormulario(
  datos: ConsultaContacto
): ErroresFormulario {
  const errores: ErroresFormulario = {};

  if (
    datos.nombre.trim().length < 2 ||
    datos.nombre.length > 120
  ) {
    errores.nombre = "Ingresá un nombre válido.";
  }

  if (!emailValido(datos.email.trim())) {
    errores.email = "Ingresá un correo electrónico válido.";
  }

  if (
    datos.asunto.trim().length < 3 ||
    datos.asunto.length > 150
  ) {
    errores.asunto = "Ingresá un asunto de al menos 3 caracteres.";
  }

  if (
    datos.mensaje.trim().length < 10 ||
    datos.mensaje.length > 3000
  ) {
    errores.mensaje =
      "El mensaje debe contener entre 10 y 3000 caracteres.";
  }

  return errores;
}

export default function FormularioContacto() {
  const [datos, setDatos] =
    useState<ConsultaContacto>(formularioInicial);

  const [errores, setErrores] =
    useState<ErroresFormulario>({});

  const [confirmacion, setConfirmacion] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const envioEnCurso = useRef(false);

  function modificarCampo(
    campo: keyof ConsultaContacto,
    valor: string
  ) {
    setDatos((anteriores) => ({
      ...anteriores,
      [campo]: valor,
    }));

    setErrores((anteriores) => ({
      ...anteriores,
      [campo]: undefined,
    }));

    setMensaje("");
  }

  function solicitarEnvio(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (enviando || confirmacion) return;

    const erroresDetectados = validarFormulario(datos);

    setErrores(erroresDetectados);
    setError("");
    setMensaje("");

    if (Object.keys(erroresDetectados).length > 0) {
      setError("Revisá los campos indicados.");
      return;
    }

    setConfirmacion(true);
  }

  async function confirmarEnvio() {
    if (envioEnCurso.current) return;

    const erroresDetectados = validarFormulario(datos);

    if (Object.keys(erroresDetectados).length > 0) {
      setErrores(erroresDetectados);
      setConfirmacion(false);
      setError("Revisá los campos indicados.");
      return;
    }

    envioEnCurso.current = true;

    setEnviando(true);
    setError("");
    setMensaje("");

    try {
      const respuesta = await enviarConsultaContacto({
        nombre: datos.nombre.trim(),
        email: datos.email.trim(),
        asunto: datos.asunto.trim(),
        mensaje: datos.mensaje.trim(),
      });

      setMensaje(respuesta.mensaje);
      setDatos({ ...formularioInicial });
      setErrores({});
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo enviar la consulta."
      );
    } finally {
      envioEnCurso.current = false;
      setEnviando(false);
      setConfirmacion(false);
    }
  }

  return (
    <>
      {error && (
        <MensajeSistema
          tipo="error"
          texto={error}
          alCerrar={() => setError("")}
        />
      )}

      {mensaje && (
        <MensajeSistema
          tipo="exito"
          texto={mensaje}
          alCerrar={() => setMensaje("")}
        />
      )}

      <form
        onSubmit={solicitarEnvio}
        noValidate
        aria-busy={enviando}
      >
        <fieldset
          className="contacto-campos"
          disabled={enviando || confirmacion}
        >
          {campos.map((campo) => (
            <div
              className="contacto-campo"
              key={campo.clave}
            >
              <label htmlFor={`consulta-${campo.clave}`}>
                {campo.etiqueta} *
              </label>

              <input
                id={`consulta-${campo.clave}`}
                name={campo.clave}
                type={campo.tipo}
                autoComplete={campo.autoComplete}
                maxLength={campo.maxLength}
                value={datos[campo.clave]}
                onChange={(evento) =>
                  modificarCampo(
                    campo.clave,
                    evento.target.value
                  )
                }
                aria-invalid={Boolean(
                  errores[campo.clave]
                )}
                aria-describedby={
                  errores[campo.clave]
                    ? `error-${campo.clave}`
                    : undefined
                }
                required
              />

              {errores[campo.clave] && (
                <span
                  className="contacto-error-campo"
                  id={`error-${campo.clave}`}
                >
                  {errores[campo.clave]}
                </span>
              )}
            </div>
          ))}

          <div className="contacto-campo">
            <label htmlFor="consulta-mensaje">
              Mensaje *
            </label>

            <textarea
              id="consulta-mensaje"
              name="mensaje"
              rows={4}
              maxLength={3000}
              value={datos.mensaje}
              onChange={(evento) =>
                modificarCampo(
                  "mensaje",
                  evento.target.value
                )
              }
              aria-invalid={Boolean(errores.mensaje)}
              aria-describedby={
                errores.mensaje
                  ? "error-mensaje"
                  : undefined
              }
              required
            />

            {errores.mensaje && (
              <span
                id="error-mensaje"
                className="contacto-error-campo"
              >
                {errores.mensaje}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={enviando || confirmacion}
          >
            {enviando
              ? "Enviando..."
              : "Enviar consulta"}
          </button>
        </fieldset>
      </form>

      <ConfirmacionModal
        abierto={confirmacion}
        titulo="¿Enviar consulta?"
        descripcion="Tu mensaje será enviado al equipo de Posgrado."
        textoConfirmar="Confirmar envío"
        textoCancelar="Volver"
        confirmando={enviando}
        alConfirmar={confirmarEnvio}
        alCancelar={() => setConfirmacion(false)}
      />
    </>
  );
}