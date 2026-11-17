// Página para solicitar la recuperación de contraseña.

import { useState } from "react";
import { Link } from "react-router-dom";
import Captcha from "../components/Captcha";

import imagenFondo from "../../../imagenes/hero-inicio.jpg";
import "./ManejoSesion.css";

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setMensaje("");
    setError("");

    if (!captchaToken) {
      setError(
        "Completá el CAPTCHA antes de recuperar la contraseña"
      );
      return;
    }

    setMensaje(
      "Se enviaron las instrucciones al correo ingresado."
    );
  };

  return (
    <section
      className="sesion"
      style={{ backgroundImage: `url(${imagenFondo})` }}
      aria-labelledby="titulo-recuperar"
    >
      <form
        className="sesion-formulario"
        onSubmit={handleSubmit}
      >
        <header className="sesion-encabezado">
          <h1 id="titulo-recuperar">
            Restaurar contraseña
          </h1>

          <p>
            Ingresá tu correo para recuperar el acceso al sistema
          </p>
        </header>

        {mensaje && (
          <p className="sesion-mensaje" role="status">
            {mensaje}
          </p>
        )}

        {error && (
          <p className="sesion-error" role="alert">
            {error}
          </p>
        )}

        <label htmlFor="email-recuperacion">
          Correo Electrónico{" "}
          <span aria-hidden="true">*</span>
        </label>

        <input
          id="email-recuperacion"
          name="email"
          type="email"
          placeholder="usuario@frlp.utn.edu.ar"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

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
          Recuperar
        </button>

        <Link
          to="/login"
          className="sesion-volver"
        >
          ← Volver a iniciar sesión
        </Link>
      </form>
    </section>
  );
}