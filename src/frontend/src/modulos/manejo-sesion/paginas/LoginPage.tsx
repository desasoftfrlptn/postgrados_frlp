
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../useAuth";
import imagenFondo from "../../../imagenes/hero-inicio.jpg";

import "./ManejoSesion.css";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  /*
   * CAPTCHA temporalmente deshabilitado para pruebas.
   *
   * Se conserva su estado para cuando se reactive:
   *
   * const [captchaToken, setCaptchaToken] = useState("");
   */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError(
        "Ingresá el correo electrónico y la contraseña."
      );
      return;
    }

    /*
     * CAPTCHA temporalmente deshabilitado.
     *
     * Cuando se reactive, validar el token antes
     * de realizar el login y verificarlo en Backend.
     */

    try {
      setEnviando(true);

      const sesion = await login(email, password);

      /*
       * Si es el primer ingreso, se solicita
       * el cambio obligatorio de contraseña.
       */
      if (sesion.debeCambiarContrasena) {
        navigate("/cambiar-contrasena-inicial", {
          replace: true,
        });
        return;
      }

      /*
       * Cada rol accede directamente
       * a su pantalla de inicio.
       */
      if (sesion.rol === "ADMIN") {
        navigate("/dashboard/administrador", {
          replace: true,
        });
        return;
      }

      if (sesion.rol === "DOCENTE") {
        navigate("/dashboard/docente", {
          replace: true,
        });
        return;
      }

      if (sesion.rol === "ASPIRANTE") {
        navigate("/dashboard", {
          replace: true,
        });
        return;
      }

      /*
       * El Equipo de Conducción accede
       * directamente a su panel de inicio.
       */
      if (sesion.rol === "COORDINADOR") {
        navigate("/dashboard/conduccion", {
          replace: true,
        });
        return;
      }

      /*
       * CPR mantiene el dashboard general
       * hasta contar con su panel específico.
       */
      navigate("/dashboard/general", {
        replace: true,
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar sesión."
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section
      className="sesion"
      style={{ backgroundImage: `url(${imagenFondo})` }}
      aria-labelledby="titulo-login"
    >
      <form
        className="sesion-formulario"
        onSubmit={handleSubmit}
      >
        <header className="sesion-encabezado">
          <h1 id="titulo-login">Iniciar Sesión</h1>
          <p>
            Ingresá tus credenciales para acceder al sistema
          </p>
        </header>

        {error && (
          <p className="sesion-error" role="alert">
            {error}
          </p>
        )}

        <label htmlFor="email">
          Correo Electrónico{" "}
          <span aria-hidden="true">*</span>
        </label>

        <input
          id="email"
          name="email"
          type="email"
          placeholder="usuario@frlp.utn.edu.ar"
          autoComplete="email"
          required
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
        />

        <label htmlFor="password">
          Contraseña{" "}
          <span aria-hidden="true">*</span>
        </label>

        <div className="sesion-password">
          <input
            id="password"
            name="password"
            type={mostrarPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
          />

          <button
            type="button"
            className="sesion-password-mostrar"
            onClick={() =>
              setMostrarPassword(!mostrarPassword)
            }
            aria-label={
              mostrarPassword
                ? "Ocultar contraseña"
                : "Mostrar contraseña"
            }
            aria-pressed={mostrarPassword}
            title={
              mostrarPassword
                ? "Ocultar contraseña"
                : "Mostrar contraseña"
            }
          >
            {mostrarPassword ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M9.9 5.1A10.9 10.9 0 0 1 12 5c5 0 9 4 10 7a12.7 12.7 0 0 1-4 4.7" />
                <path d="M6.3 6.3A12.7 12.7 0 0 0 2 12c1 3 5 7 10 7a10.8 10.8 0 0 0 4.2-.9" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        <Link
          className="sesion-recuperar"
          to="/recuperar-contrasena"
        >
          ¿Olvidaste tu contraseña?
        </Link>

        {/*
          CAPTCHA temporalmente comentado
          para las pruebas de inicio de sesión.

          Conservar el componente y sus callbacks
          para volver a habilitarlo posteriormente.

          <Captcha
            onVerify={(token: string) => {
              setCaptchaToken(token);

              if (token) {
                setError("");
              }
            }}
            onError={() => {
              setCaptchaToken("");
              setError("No se pudo cargar el CAPTCHA");
            }}
          />
        */}

        <button
          className="sesion-boton"
          type="submit"
          disabled={enviando}
        >
          {enviando ? "Ingresando..." : "Iniciar Sesión"}
        </button>
      </form>
    </section>
  );
}
