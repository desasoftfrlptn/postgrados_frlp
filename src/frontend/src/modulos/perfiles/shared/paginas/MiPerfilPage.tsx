import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { api, ApiError } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";
import MensajeSistema from "../../../../shared/componentes/MensajeSistema/MensajeSistema";
import ConfirmacionModal from "../../../../shared/componentes/ConfirmacionModal/ConfirmacionModal";
import CambiarContrasena from "../componentes/CambiarContrasena";
import "../estilos/MiPerfilPage.css";
interface DatosPerfil {
    nacionalidad: string;
    correo_alternativo: string | null;
    telefono_movil: string;
    domicilio: string;
    pais: string;
    provincia: string;
    ciudad: string;
    notificaciones_automaticas: boolean;
}
interface Perfil {
    datos: DatosPerfil;
    foto: string | null;
    version: number;
    carreras: {
        id: string;
        carrera: string;
        cohorte: string;
    }[];
}
type Cambio = {
    datos: Partial<DatosPerfil>;
} | {
    foto: string | null;
};
const campos = [
    { clave: "nacionalidad", etiqueta: "Nacionalidad", max: 100 },
    { clave: "correo_alternativo", etiqueta: "Correo alternativo", max: 255, tipo: "email" },
    { clave: "telefono_movil", etiqueta: "Teléfono móvil", max: 30, tipo: "tel" },
    { clave: "domicilio", etiqueta: "Domicilio", max: 255 },
    { clave: "pais", etiqueta: "País", max: 100 },
    { clave: "provincia", etiqueta: "Provincia", max: 200 },
    { clave: "ciudad", etiqueta: "Ciudad", max: 200 },
] as const;
export default function MiPerfilPage() {
    const { user } = useAuth();
    return user ? <PerfilPersonal key={`${user.id}:${user.token}`} usuario={user} /> : null;
}
function PerfilPersonal({ usuario }: {
    usuario: NonNullable<ReturnType<typeof useAuth>["user"]>;
}) {
    const token = usuario.token;
    const [perfil, setPerfil] = useState<Perfil | null>(null);
    const [borrador, setBorrador] = useState<DatosPerfil | null>(null);
    const [pendiente, setPendiente] = useState<Cambio | null>(null);
    const [tab, setTab] = useState("Datos personales");
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [conflicto, setConflicto] = useState(false);
    const bloqueo = useRef(false);
    const [revisionCarga, setRevisionCarga] = useState(0);
    function cargar() {
        setCargando(true);
        setError("");
        setRevisionCarga(actual => actual + 1);
    }
    useEffect(() => {
        let vigente = true;
        api.get<Perfil>("/autenticacion/mi-perfil", token).then(datos => {
            if (!vigente)
                return;
            setPerfil(datos);
            setBorrador(null);
            setConflicto(false);
        }).catch((e: unknown) => {
            if (vigente)
                setError(e instanceof Error ? e.message : "No se pudo cargar el perfil.");
        }).finally(() => {
            if (vigente)
                setCargando(false);
        });
        return () => { vigente = false; };
    }, [token, revisionCarga]);
    async function guardar() {
        if (!perfil || !pendiente || bloqueo.current)
            return;
        bloqueo.current = true;
        setGuardando(true);
        setError("");
        setMensaje("");
        try {
            const resultado = await api.patch<Perfil>("/autenticacion/mi-perfil", { version: perfil.version, ...pendiente }, token);
            setPerfil(resultado);
            setBorrador(null);
            setMensaje("Los cambios se guardaron correctamente.");
            window.dispatchEvent(new CustomEvent("perfil-actualizado", { detail: { id: usuario.id, foto: resultado.foto, notificaciones_automaticas: resultado.datos.notificaciones_automaticas } }));
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "No se pudo guardar el perfil.");
            if (e instanceof ApiError && e.status === 409)
                setConflicto(true);
        }
        finally {
            bloqueo.current = false;
            setGuardando(false);
            setPendiente(null);
        }
    }
    function elegirFoto(e: ChangeEvent<HTMLInputElement>) {
        const archivo = e.target.files?.[0];
        e.target.value = "";
        if (!archivo || guardando || conflicto)
            return;
        setError("");
        setMensaje("");
        if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type) || !archivo.size || archivo.size > 2 * 1024 * 1024) {
            setError("Seleccioná una imagen JPG, PNG o WebP de hasta 2 MB.");
            return;
        }
        const lector = new FileReader();
        lector.onload = () => {
            if (typeof lector.result === "string")
                setPendiente({ foto: lector.result });
        };
        lector.onerror = () => setError("No se pudo leer la imagen.");
        lector.readAsDataURL(archivo);
    }
    function solicitarGuardado(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!borrador || !perfil || conflicto || guardando)
            return;
        const datos = {
            ...borrador, correo_alternativo: borrador.correo_alternativo?.trim() || null,
            telefono_movil: borrador.telefono_movil.replace(/[\s()-]/g, "")
        };
        if (datos.telefono_movil !== perfil.datos.telefono_movil && datos.telefono_movil && !/^\+?\d{7,15}$/.test(datos.telefono_movil)) {
            setError("Ingresá un teléfono de 7 a 15 dígitos.");
            return;
        }
        if (datos.correo_alternativo !== perfil.datos.correo_alternativo && datos.correo_alternativo?.toLowerCase() === usuario.email.toLowerCase()) {
            setError("El correo alternativo debe ser diferente al correo de acceso.");
            return;
        }
        if (datos.correo_alternativo !== perfil.datos.correo_alternativo && datos.correo_alternativo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo_alternativo)) {
            setError("Ingresá un correo alternativo válido.");
            return;
        }
        const cambios = Object.fromEntries(Object.entries(datos).filter(([k, v]) => v !== perfil.datos[k as keyof DatosPerfil])) as Partial<DatosPerfil>;
        if (!Object.keys(cambios).length) {
            setBorrador(null);
            return;
        }
        setError("");
        setPendiente({ datos: cambios });
    }
    const datos = borrador ?? perfil?.datos;
    const pestanas = ["Datos personales", ...(usuario.rol === "ALUMNO" ? ["Información académica"] : []), "Notificaciones", "Seguridad"];
    return <section className="perfil-pagina mi-perfil">
        <header className="perfil-pagina-encabezado">
            <h1>Mi perfil</h1>
            <p>Consultá y actualizá tus datos personales y preferencias.</p>
        </header>
        {error && <MensajeSistema tipo="error" texto={error} duracion={0} />}
        {mensaje && <MensajeSistema tipo="exito" texto={mensaje} />}
        {cargando && <p role="status">Cargando perfil…</p>}
        {(!perfil || conflicto) && !cargando && <button type="button" className="mi-perfil-guardar" onClick={() => void cargar()}>Volver a cargar</button>}
        {perfil && datos && !cargando && <div className="mi-perfil-contenido">
            <article className="mi-perfil-tarjeta-personal">
                <header>
                    {usuario.rol}
                </header>
                <div className="mi-perfil-avatar-contenedor">
                    {perfil.foto ? <img src={perfil.foto} alt="Tu fotografía de perfil" className="mi-perfil-avatar" /> : <span className="mi-perfil-avatar mi-perfil-avatar-vacio" aria-hidden="true">
                        {usuario.nombre[0]}
                        {usuario.apellido[0]}
                    </span>}
                    <label className="mi-perfil-boton-foto">Cambiar fotografía<input className="mi-perfil-input-foto" type="file" accept="image/jpeg,image/png,image/webp" disabled={guardando || conflicto || !!borrador} onChange={elegirFoto} /></label>
                    {perfil.foto && <button type="button" className="mi-perfil-eliminar-foto" disabled={guardando || conflicto || !!borrador} onClick={() => setPendiente({ foto: null })}>Quitar fotografía</button>}
                    <h2>
                        {usuario.nombre}{" "}{usuario.apellido}
                    </h2>
                    <p>
                        {usuario.email}
                    </p>
                </div>
                <div className="mi-perfil-resumen-personal">
                    <dl>
                        <div>
                            <dt>Documento</dt>
                            <dd>
                                {usuario.dni}
                            </dd>
                        </div>
                    </dl>
                    <p>Los datos de identificación son administrados por Administración.</p>
                </div>
            </article>
            <article className="mi-perfil-datos">
                <nav className="mi-perfil-pestanas" aria-label="Secciones de mi perfil">
                    {pestanas.map(p => <button key={p} type="button" aria-pressed={tab === p} disabled={guardando || !!borrador} className={`mi-perfil-pestana ${tab === p ? "activa" : ""}`} onClick={() => { setTab(p); setError(""); setMensaje(""); }}>
                        {p}
                    </button>)}
                </nav>
                {tab === "Seguridad" ? <CambiarContrasena /> : tab === "Información académica" ? <section>
                    <h2>Carreras matriculadas</h2>
                    {perfil.carreras.length ? <ul>
                        {perfil.carreras.map(c => <li key={c.id}><strong>
                            {c.carrera}
                        </strong> · {c.cohorte}</li>)}
                    </ul> : <p>No hay matrículas activas registradas.</p>}
                </section> :
                    <form onSubmit={solicitarGuardado} aria-busy={guardando} noValidate>
                        <h2>
                            {tab}
                        </h2>
                        {tab === "Datos personales" ? <>
                            <p>Los cambios actualizan tu perfil actual, sin modificar el historial de inscripción.</p>
                            <div className="mi-perfil-grilla">
                                {campos.map(c => <div className="mi-perfil-campo" key={c.clave}>
                                    <label htmlFor={`perfil-${c.clave}`}>
                                        {c.etiqueta}
                                    </label>
                                    <input id={`perfil-${c.clave}`} type={"tipo" in c ? c.tipo : "text"} maxLength={c.max} readOnly={!borrador} disabled={guardando} value={datos[c.clave] ?? ""} onChange={e => setBorrador(prev => prev ? { ...prev, [c.clave]: e.target.value } : prev)} />
                                </div>)}
                            </div>
                        </> : <label><input type="checkbox" checked={datos.notificaciones_automaticas} disabled={!borrador || guardando} onChange={e => setBorrador(prev => prev ? { ...prev, notificaciones_automaticas: e.target.checked } : prev)} /> Actualizar automáticamente las notificaciones del encabezado</label>}
                        <footer className="mi-perfil-acciones">
                            {borrador ? <>
                                <button type="button" className="mi-perfil-cancelar" disabled={guardando} onClick={() => setBorrador(null)}>Cancelar</button>
                                <button type="submit" className="mi-perfil-guardar" disabled={guardando || conflicto}>Guardar cambios</button>
                            </> : <button type="button" className="mi-perfil-guardar" disabled={conflicto} onClick={() => setBorrador({ ...perfil.datos })}>Modificar</button>}
                        </footer>
                    </form>}
            </article>
        </div>}
        <ConfirmacionModal abierto={!!pendiente} titulo="Actualizar perfil" descripcion={pendiente && "foto" in pendiente ? "¿Confirmás cambiar tu fotografía de perfil?" : "¿Confirmás guardar los datos y preferencias del perfil?"} alConfirmar={guardar} alCancelar={() => setPendiente(null)} confirmando={guardando} />
    </section>;
}
