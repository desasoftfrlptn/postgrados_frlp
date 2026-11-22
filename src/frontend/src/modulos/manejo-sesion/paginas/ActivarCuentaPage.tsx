import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { api, ApiError } from "../../../shared/api/client";
import imagenFondo from "../../../imagenes/hero-inicio.jpg";
import "./ManejoSesion.css";
import "./ActivarCuentaPage.css";

type Estado = "validando" | "valido" | "invalido" | "error" | "completado";
const mensajeEnlace = "El enlace no es válido, ha vencido o ya fue utilizado.";

export default function ActivarCuentaPage() {
  const ubicacion = useLocation();
  return <FormularioAcceso key={ubicacion.pathname + ubicacion.hash}
    recuperacion={ubicacion.pathname === "/restablecer-contrasena"}
    token={new URLSearchParams(ubicacion.hash.slice(1)).get("token") ?? ""} />;
}

function FormularioAcceso({ recuperacion, token }: { recuperacion: boolean; token: string }) {
  const [estado, setEstado] = useState<Estado>(token ? "validando" : "invalido");
  const [version, setVersion] = useState(0);
  const [clave, setClave] = useState("");
  const [repetir, setRepetir] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const bloqueo = useRef(false);
  useEffect(() => {
    if (!token) return;
    let vigente = true;
    api.post("/autenticacion/validar-enlace-acceso", { token, recuperacion })
      .then(() => { if (vigente) setEstado("valido"); })
      .catch((e: unknown) => {
        if (!vigente) return;
        setEstado(e instanceof ApiError && [400, 403, 404, 422].includes(e.status) ? "invalido" : "error");
      });
    return () => { vigente = false; };
  }, [token, recuperacion, version]);

  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (bloqueo.current || estado !== "valido") return;
    if (clave.length < 8 || clave.length > 128 || clave !== repetir) {
      setError("Ingresá entre 8 y 128 caracteres y verificá que las contraseñas coincidan.");
      return;
    }
    bloqueo.current = true;
    setOcupado(true);
    setError("");
    try {
      await api.post(recuperacion ? "/autenticacion/restablecer-contrasena" : "/autenticacion/activar-cuenta", {
        token, contrasena_nueva: clave, repetir_contrasena: repetir,
      });
      setCompletado();
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    } catch (e) {
      if (e instanceof ApiError && [400, 403, 404].includes(e.status)) {
        setEstado("validando");
        setVersion(v => v + 1);
      }
      setError(e instanceof Error ? e.message : "No se pudo guardar la contraseña.");
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }

  function setCompletado() {
    setEstado("completado");
    setClave("");
    setRepetir("");
  }

  return (
    <section className="sesion sesion-acceso" style={{ backgroundImage: `url(${imagenFondo})` }} aria-labelledby="titulo-acceso">
      <form className="sesion-formulario sesion-acceso-formulario" onSubmit={guardar} aria-busy={ocupado || estado === "validando"}>
        <header className="sesion-encabezado">
          <h1 id="titulo-acceso">{recuperacion ? "Restablecer contraseña" : "Activar cuenta"}</h1>
          <p>Posgrados UTN FRLP</p>
        </header>
        {estado === "validando" && <p role="status">Verificando el enlace…</p>}
        {estado === "error" && <>
          <p className="sesion-error" role="alert">No se pudo verificar el enlace. Intentá nuevamente.</p>
          <button className="sesion-boton" type="button" onClick={() => { setEstado("validando"); setVersion(v => v + 1); }}>Reintentar</button>
        </>}
        {estado === "invalido" && <>
          <p className="sesion-error" role="alert">{mensajeEnlace}</p>
          <p className="sesion-acceso-ayuda">Solicitá un nuevo enlace para recuperar el acceso. Si necesitás activar tu cuenta, contactá a Administración.</p>
          <Link className="sesion-boton sesion-acceso-link" to="/recuperar-contrasena">Solicitar un nuevo enlace</Link>
        </>}
        {estado === "completado" && <>
          <div className="sesion-acceso-exito" role="status">
            <span aria-hidden="true" className="sesion-acceso-check">✓</span>
            <strong>{recuperacion ? "Contraseña restablecida correctamente." : "Cuenta activada correctamente."}</strong>
            <p>Ya podés ingresar al sistema con tu nueva contraseña.</p>
          </div>
          <Link className="sesion-boton sesion-acceso-link" to="/login">Ir a iniciar sesión</Link>
        </>}
        {estado === "valido" && <>
          <p className="sesion-acceso-ayuda" id="ayuda-clave">Elegí una contraseña de entre 8 y 128 caracteres.</p>
          {error && <p role="alert" className="sesion-error">{error}</p>}
          <label htmlFor="clave-activacion">Nueva contraseña</label>
          <input id="clave-activacion" type={visible ? "text" : "password"} autoComplete="new-password" aria-describedby="ayuda-clave" minLength={8} maxLength={128} required value={clave} onChange={e => setClave(e.target.value)} disabled={ocupado} />
          <label htmlFor="repetir-activacion">Repetir contraseña</label>
          <input id="repetir-activacion" type={visible ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={128} required value={repetir} onChange={e => setRepetir(e.target.value)} disabled={ocupado} />
          <label className="sesion-acceso-visible"><input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} /> Mostrar contraseñas</label>
          <button type="submit" className="sesion-boton" disabled={ocupado}>{ocupado ? "Guardando…" : recuperacion ? "Restablecer contraseña" : "Activar cuenta"}</button>
        </>}
        <Link className="sesion-volver" to={estado === "completado" ? "/" : "/login"}>{estado === "completado" ? "Volver al inicio" : "Volver a iniciar sesión"}</Link>
      </form>
    </section>
  );
}
