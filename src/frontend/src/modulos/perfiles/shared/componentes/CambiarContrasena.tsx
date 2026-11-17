// Permite al usuario autenticado cambiar su contraseña desde Mi Perfil.

import {
  useState,
  type FormEvent,
} from "react";

import {
  api,
} from "../../../../shared/api/client";

import {
  useAuth,
} from "../../../manejo-sesion/useAuth";


export default function CambiarContrasena() {
  const {
    user,
  } = useAuth();


  const [
    contrasenaActual,
    setContrasenaActual,
  ] = useState("");


  const [
    contrasenaNueva,
    setContrasenaNueva,
  ] = useState("");


  const [
    repetirContrasena,
    setRepetirContrasena,
  ] = useState("");


  const [
    mostrarActual,
    setMostrarActual,
  ] = useState(false);


  const [
    mostrarNueva,
    setMostrarNueva,
  ] = useState(false);


  const [
    mostrarRepetida,
    setMostrarRepetida,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    mensaje,
    setMensaje,
  ] = useState("");


  const [
    guardando,
    setGuardando,
  ] = useState(false);


  const guardar = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();


    if (!user) {
      return;
    }


    if (
      contrasenaNueva
      !== repetirContrasena
    ) {
      setMensaje("");

      setError(
        "Las contraseñas nuevas no coinciden."
      );

      return;
    }


    try {
      setGuardando(true);
      setError("");
      setMensaje("");


      await api.post(
        "/autenticacion/cambiar-contrasena",
        {
          contrasena_actual:
            contrasenaActual,

          contrasena_nueva:
            contrasenaNueva,

          repetir_contrasena:
            repetirContrasena,
        },
        user.token
      );


      setContrasenaActual("");
      setContrasenaNueva("");
      setRepetirContrasena("");


      setMensaje(
        "La contraseña fue actualizada correctamente."
      );

    } catch (error) {
      setMensaje("");

      setError(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar la contraseña."
      );

    } finally {
      setGuardando(false);
    }
  };


  return (
    <section
      className="mi-perfil-contrasena"
      aria-labelledby="titulo-cambiar-contrasena"
    >
      <header className="mi-perfil-contrasena-encabezado">
        <div className="mi-perfil-contrasena-icono">
          🔐
        </div>

        <div>
          <h2 id="titulo-cambiar-contrasena">
            Cambiar contraseña
          </h2>

          <p>
            Actualizá la contraseña que utilizás
            para acceder al sistema.
          </p>
        </div>
      </header>


      <div className="mi-perfil-contrasena-aviso">
        <span
          aria-hidden="true"
          className="mi-perfil-contrasena-aviso-icono"
        >
          ℹ️
        </span>

        <p>
          La nueva contraseña debe tener como
          mínimo 6 caracteres.
        </p>
      </div>


      {error && (
        <p
          role="alert"
          className="mi-perfil-error"
        >
          {error}
        </p>
      )}


      {mensaje && (
        <p
          role="status"
          className="mi-perfil-mensaje"
        >
          {mensaje}
        </p>
      )}


      <form
        onSubmit={guardar}
        className="mi-perfil-contrasena-formulario"
      >
        <div className="mi-perfil-contrasena-campo">
          <label htmlFor="perfil-contrasena-actual">
            Contraseña actual
          </label>

          <div className="mi-perfil-contrasena-input">
            <input
              id="perfil-contrasena-actual"
              type={
                mostrarActual
                  ? "text"
                  : "password"
              }
              required
              autoComplete="current-password"
              placeholder="Ingresá tu contraseña actual"
              value={contrasenaActual}
              onChange={(event) =>
                setContrasenaActual(
                  event.target.value
                )
              }
            />

            <button
              type="button"
              className="mi-perfil-contrasena-mostrar"
              onClick={() =>
                setMostrarActual(
                  !mostrarActual
                )
              }
              aria-label={
                mostrarActual
                  ? "Ocultar contraseña actual"
                  : "Mostrar contraseña actual"
              }
            >
              {mostrarActual
                ? "Ocultar"
                : "Ver"}
            </button>
          </div>
        </div>


        <div className="mi-perfil-contrasena-campo">
          <label htmlFor="perfil-contrasena-nueva">
            Nueva contraseña
          </label>

          <div className="mi-perfil-contrasena-input">
            <input
              id="perfil-contrasena-nueva"
              type={
                mostrarNueva
                  ? "text"
                  : "password"
              }
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Ingresá la nueva contraseña"
              value={contrasenaNueva}
              onChange={(event) =>
                setContrasenaNueva(
                  event.target.value
                )
              }
            />

            <button
              type="button"
              className="mi-perfil-contrasena-mostrar"
              onClick={() =>
                setMostrarNueva(
                  !mostrarNueva
                )
              }
              aria-label={
                mostrarNueva
                  ? "Ocultar nueva contraseña"
                  : "Mostrar nueva contraseña"
              }
            >
              {mostrarNueva
                ? "Ocultar"
                : "Ver"}
            </button>
          </div>
        </div>


        <div className="mi-perfil-contrasena-campo">
          <label htmlFor="perfil-repetir-contrasena">
            Repetir nueva contraseña
          </label>

          <div className="mi-perfil-contrasena-input">
            <input
              id="perfil-repetir-contrasena"
              type={
                mostrarRepetida
                  ? "text"
                  : "password"
              }
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Repetí la nueva contraseña"
              value={repetirContrasena}
              onChange={(event) =>
                setRepetirContrasena(
                  event.target.value
                )
              }
            />

            <button
              type="button"
              className="mi-perfil-contrasena-mostrar"
              onClick={() =>
                setMostrarRepetida(
                  !mostrarRepetida
                )
              }
              aria-label={
                mostrarRepetida
                  ? "Ocultar contraseña repetida"
                  : "Mostrar contraseña repetida"
              }
            >
              {mostrarRepetida
                ? "Ocultar"
                : "Ver"}
            </button>
          </div>
        </div>


        <footer className="mi-perfil-contrasena-acciones">
          <button
            type="submit"
            className="mi-perfil-guardar"
            disabled={guardando}
          >
            {guardando
              ? "Guardando..."
              : "Cambiar contraseña"}
          </button>
        </footer>
      </form>
    </section>
  );
}