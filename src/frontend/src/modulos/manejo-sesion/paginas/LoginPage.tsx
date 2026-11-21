
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../useAuth";
import { obtenerRutaInicioPorRol } from "../rutasPorRol";
import imagenFondo from "../../../imagenes/hero-inicio.jpg";

import "./ManejoSesion.css";

export default function LoginPage() {
  const { login, motivoCierre } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (enviando) return;

    setError("");

    if (!email.trim() || !password.trim()) {
      setError(
        "Ingresá el correo electrónico y la contraseña."
      );
      return;
    }

    // CAPTCHA pendiente de reactivación y validación en Backend.

    try {
      setEnviando(true);

      const sesion = await login(email, password);

      // El aspirante permanece en el sitio público.
      if (sesion.rol === "ASPIRANTE") {
        navigate("/", { replace: true });
        return;
      }

      // Cambio obligatorio de contraseña en el primer ingreso.
      if (sesion.debeCambiarContrasena) {
        navigate("/cambiar-contrasena-inicial", {
          replace: true,
        });
        return;
      }

      // Redirección centralizada según el rol.
      navigate(obtenerRutaInicioPorRol(sesion.rol), {
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

  const textoMostrarPassword = mostrarPassword
    ? "Ocultar contraseña"
    : "Mostrar contraseña";

  return (
    <section
      className="sesion"
      style={{ backgroundImage: `url(${imagenFondo})` }}
      aria-labelledby="titulo-login"
    >
      <form
        className="sesion-formulario"
        onSubmit={handleSubmit}
        aria-busy={enviando}
      >
        {motivoCierre && (
          <p className="sesion-error" role="status">
            {motivoCierre}
          </p>
        )}

        <header className="sesion-encabezado">
          <h1 id="titulo-login">Iniciar sesión</h1>
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
          Correo electrónico{" "}
          <span aria-hidden="true">*</span>
        </label>

        <input
          id="email"
          name="email"
          type="email"
          placeholder="usuario@frlp.utn.edu.ar"
          autoComplete="email"
          required
          disabled={enviando}
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
            disabled={enviando}
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
          />

          <button
            type="button"
            className="sesion-password-mostrar"
            onClick={() =>
              setMostrarPassword((actual) => !actual)
            }
            aria-label={textoMostrarPassword}
            aria-pressed={mostrarPassword}
            title={textoMostrarPassword}
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

        <button
          className="sesion-boton"
          type="submit"
          disabled={enviando}
        >
          {enviando ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>
    </section>
  );
}
