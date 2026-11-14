import {
  useState,
  type FormEvent,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../useAuth";

import imagenFondo
  from "../../../imagenes/hero-inicio.jpg";

import "./ManejoSesion.css";


export default function LoginPage() {
  const {
    login,
  } = useAuth();

  const navigate =
    useNavigate();


  const [
    email,
    setEmail,
  ] = useState("");


  const [
    password,
    setPassword,
  ] = useState("");


  const [
    mostrarPassword,
    setMostrarPassword,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    enviando,
    setEnviando,
  ] = useState(false);


  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");


    if (
      !email.trim()
      || !password.trim()
    ) {
      setError(
        "Ingresá el correo electrónico y la contraseña."
      );

      return;
    }


    try {
      setEnviando(true);


      const sesion =
        await login(
          email,
          password
        );


      /*
       * CAPTCHA temporalmente deshabilitado.
       *
       * Cuando se reactive, la validación
       * debe realizarse antes del login.
       */


      /*
       * Si es el primer ingreso,
       * primero obligamos al usuario
       * a cambiar su contraseña.
       */
      if (
        sesion.debeCambiarContrasena
      ) {
        navigate(
          "/cambiar-contrasena-inicial",
          { replace: true }
        );

        return;
      }


      /*
       * Cada rol entra directamente
       * en su pantalla de inicio.
       */
      if (
        sesion.rol === "ADMIN"
      ) {
        navigate(
          "/dashboard/administrador",
          { replace: true }
        );

        return;
      }


      if (
        sesion.rol === "DOCENTE"
      ) {
        navigate(
          "/dashboard/docente",
          { replace: true }
        );

        return;
      }


      if (
        sesion.rol === "ASPIRANTE"
      ) {
        navigate(
          "/dashboard",
          { replace: true }
        );

        return;
      }


      /*
       * El Equipo de Conducción accede
       * directamente a su panel de inicio.
       */
      if (
        sesion.rol === "COORDINADOR"
      ) {
        navigate(
          "/dashboard/conduccion",
          { replace: true }
        );

        return;
      }


      /*
       * CPR mantiene el dashboard general
       * hasta contar con su panel específico.
       */
      navigate(
        "/dashboard/general",
        { replace: true }
      );

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
        onSubmit={
          handleSubmit
        }
      >
        <header className="sesion-encabezado">
          <h1 id="titulo-login">
            Iniciar Sesión
          </h1>

          <p>
            Ingresá tus credenciales
            para acceder al sistema
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
          value={
            email
          }
          onChange={(event) =>
            setEmail(
              event.target.value
            )
          }
        />


        <label htmlFor="password">
          Contraseña{" "}
          <span aria-hidden="true">*</span>
        </label>


        <div className="sesion-password relative flex">
          <input
            id="password"
            name="password"
            type={
              mostrarPassword
                ? "text"
                : "password"
            }
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />


          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded-md transition-colors"
            onClick={() =>
              setMostrarPassword(
                !mostrarPassword
              )
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

       {/* <Captcha
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
        /> */}

        <button
          className="sesion-boton mt-6"
          type="submit"
          disabled={
            enviando
          }
        >
          {enviando
            ? "Ingresando..."
            : "Iniciar Sesión"}
        </button>
      </form>
    </section>
  );
}