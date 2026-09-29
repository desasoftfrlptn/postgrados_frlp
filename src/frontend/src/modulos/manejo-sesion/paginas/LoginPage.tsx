// Página de inicio de sesión para acceder a las funciones privadas del sistema.

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
      setError("Completá el CAPTCHA antes de iniciar sesión");
      return;
    }

    try {
      const sesion = await login(email, password);
      console.log("Rol recibido:", sesion.rol);

      if (sesion.rol === "DOCENTE") {
        navigate("/dashboard/docente");
      } else if (sesion.rol === "ASPIRANTE" || sesion.rol === "ESTUDIANTE") {
        navigate("/dashboard");
      } else {
        navigate("/dashboard/general");
      }
    } catch {
      setError("No se pudo iniciar sesión. Revisá las credenciales y la conexión.");
      setCaptchaToken("");
    }
  };

  return (
    <section
      className="sesion animate-fade-in"
      style={{ backgroundImage: url( + imagenFondo + ) }}
      aria-labelledby="titulo-login"
    >
      <form
        className="sesion-formulario"
        onSubmit={handleSubmit}
      >
        <header className="sesion-encabezado">
          <h1 id="titulo-login">Iniciar Sesión</h1>
          <p>Ingresá tus credenciales para acceder al sistema</p>
        </header>

        {error && (
          <p className="sesion-error" role="alert">
            {error}
          </p>
        )}

        <label htmlFor="email">
          Correo Electrónico <span aria-hidden="true">*</span>
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
          Contraseña <span aria-hidden="true">*</span>
        </label>

        <div className="sesion-password relative flex">
          <input
            id="password"
            name="password"
            type={mostrarPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex-grow pr-10"
          />

          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded-md transition-colors"
            onClick={() =>
              setMostrarPassword(!mostrarPassword)
            }
            aria-label={
              mostrarPassword
                ? "Ocultar contraseña"
                : "Mostrar contraseña"
            }
          >
            {mostrarPassword ? "🙈" : "👁️"}
          </button>
        </div>

        <Link
          className="sesion-recuperar mt-4 block text-right"
          to="/recuperar-contrasena"
        >
          ¿Olvidaste tu contraseña?
        </Link>

        <div className="mt-6">
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
        </div>

        <button
          className="sesion-boton mt-6"
          type="submit"
        >
          Iniciar Sesión
        </button>
      </form>
    </section>
  );
}