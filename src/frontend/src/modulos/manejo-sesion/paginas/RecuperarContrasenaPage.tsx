// Página para solicitar la recuperación de contraseña.

import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../shared/api/client";
import Captcha from "../components/Captcha";

import imagenFondo from "../../../imagenes/hero-inicio.jpg";
import "./ManejoSesion.css";

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [ocupado, setOcupado] = useState(false);
  const [version, setVersion] = useState(0);
  const bloqueo = useRef(false);
  const verificar = useCallback((token: string) => setCaptchaToken(token), []);
  const falloCaptcha = useCallback(() => { setCaptchaToken(""); setError("No se pudo cargar el CAPTCHA"); }, []);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bloqueo.current) return;

    setMensaje("");
    setError("");

    if (!captchaToken) {
      setError(
        "Completá el CAPTCHA antes de recuperar la contraseña"
      );
      return;
    }

    bloqueo.current = true; setOcupado(true);
    try {
      await api.post("/autenticacion/recuperar-contrasena", { correo_electronico: email.trim(), captcha: captchaToken });
      setMensaje("Si la cuenta está habilitada, recibirás las instrucciones por correo. Revisá también el correo no deseado.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo solicitar la recuperación."); }
    finally { bloqueo.current = false; setOcupado(false); setCaptchaToken(""); setVersion(v => v + 1); }
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
          key={version}
          onVerify={verificar}
          onError={falloCaptcha}
        />

        <button
          className="sesion-boton"
          type="submit"
          disabled={ocupado}
        >
          {ocupado ? "Enviando…" : "Recuperar"}
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