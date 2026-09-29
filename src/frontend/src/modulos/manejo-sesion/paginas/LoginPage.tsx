// PÃ¡gina de inicio de sesiÃ³n para acceder a las funciones privadas del sistema.

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../useAuth";
import Captcha from "../components/Captcha";

import imagenFondo from "../../../imagenes/hero-inicio.jpg";
import "./ManejoSesion.css";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!captchaToken) {
      setError("CompletÃ¡ el CAPTCHA antes de iniciar sesiÃ³n");
      return;
    }

     try {
      const sesion = await login(email, password);
      if (sesion.rol === "DOCENTE") {
        navigate("/dashboard/docente");
      } else {
        navigate("/dashboard");
      }
    } catch {
      setError("Credenciales invÃ¡lidas");
      setCaptchaToken("");
    }
  }

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
          <h1 id="titulo-login">Iniciar SesiÃ³n</h1>
          <p>IngresÃ¡ tus credenciales para acceder al sistema</p>
        </header>

        {error && (
          <p className="sesion-error" role="alert">
            {error}
          </p>
        )}

        <label htmlFor="email">
          Correo ElectrÃ³nico{" "}
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
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="password">
          ContraseÃ±a{" "}
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
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="button"
            onClick={() =>
              setMostrarPassword(!mostrarPassword)
            }
            aria-label={
              mostrarPassword
                ? "Ocultar contraseÃ±a"
                : "Mostrar contraseÃ±a"
            }
          >
            â—‰
          </button>
        </div>

        <Link
          className="sesion-recuperar"
          to="/recuperar-contrasena"
        >
          Â¿Olvidaste tu contraseÃ±a?
        </Link>

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

        <button
          className="sesion-boton"
          type="submit"
        >
          Iniciar SesiÃ³n
        </button>
      </form>
    </section>
  );
}
