// Permite cambiar la contraseña temporal en el primer ingreso.

import {
  useState,
  type FormEvent,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  api,
} from "../../../shared/api/client";

import {
  useAuth,
} from "../useAuth";

import "./ManejoSesion.css";


export default function CambiarContrasenaInicialPage() {
  const {
    user,
    confirmarCambioContrasena,
  } = useAuth();

  const navigate =
    useNavigate();


  const [
    contrasenaNueva,
    setContrasenaNueva,
  ] = useState("");

  const [
    repetirContrasena,
    setRepetirContrasena,
  ] = useState("");

  const [error, setError] =
    useState("");

  const [guardando, setGuardando] =
    useState(false);


  const continuarSegunRol = () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (user.rol === "DOCENTE") {
      navigate(
        "/dashboard/docente"
      );

      return;
    }

    if (user.rol === "ASPIRANTE") {
      navigate(
        "/dashboard"
      );

      return;
    }

    navigate(
      "/dashboard/general"
    );
  };


  const guardar = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!user) {
      navigate("/login");
      return;
    }

    if (
      contrasenaNueva
      !== repetirContrasena
    ) {
      setError(
        "Las contraseñas no coinciden"
      );

      return;
    }

    try {
      setGuardando(true);
      setError("");

      await api.post(
        "/autenticacion/cambiar-contrasena-inicial",
        {
          contrasena_nueva:
            contrasenaNueva,

          repetir_contrasena:
            repetirContrasena,
        },
        user.token
      );

      confirmarCambioContrasena();

      continuarSegunRol();

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : (
              "No se pudo cambiar la contraseña"
            )
      );
    } finally {
      setGuardando(false);
    }
  };


  return (
    <section className="sesion">
      <form
        className="sesion-formulario"
        onSubmit={guardar}
      >
        <header className="sesion-encabezado">
          <h1>
            Cambiar contraseña
          </h1>

          <p>
            Por seguridad, debés cambiar
            la contraseña temporal antes
            de continuar.
          </p>
        </header>


        {error && (
          <p
            className="sesion-error"
            role="alert"
          >
            {error}
          </p>
        )}


        <label htmlFor="contrasena-nueva">
          Nueva contraseña
        </label>

        <input
          id="contrasena-nueva"
          type="password"
          required
          minLength={6}
          value={contrasenaNueva}
          onChange={(event) =>
            setContrasenaNueva(
              event.target.value
            )
          }
        />


        <label htmlFor="repetir-contrasena">
          Repetir contraseña
        </label>

        <input
          id="repetir-contrasena"
          type="password"
          required
          minLength={6}
          value={repetirContrasena}
          onChange={(event) =>
            setRepetirContrasena(
              event.target.value
            )
          }
        />


        <button
          className="sesion-boton"
          type="submit"
          disabled={guardando}
        >
          {guardando
            ? "Guardando..."
            : "Cambiar contraseña"}
        </button>
      </form>
    </section>
  );
}