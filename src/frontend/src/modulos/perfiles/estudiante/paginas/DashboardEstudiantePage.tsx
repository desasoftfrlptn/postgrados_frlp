import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../../../shared/api/client";
import { mostrarEstadoLegajo } from "../../../../shared/utils/estadosLegajo";
import MensajeSistema from "../../../../shared/componentes/MensajeSistema/MensajeSistema";
import { useAuth } from "../../../manejo-sesion/useAuth";

import "../estilos/SeguimientoEstudiante.css";

interface MiLegajo {
    id: string;
    carrera_elegida: string;
    estado: string;
    dni_pasaporte: string;
    numero_seguimiento: string;
}

interface Seguimiento {
    observaciones: string | null;
    documentacion_a_corregir: string[];
}

interface Cursada {
    inscripcion_id: string;
    seminario_nombre: string;
    fecha_inicio: string;
    asistencias: number;
    total_clases: number;
    porcentaje_asistencia: number | null;
    nota_final: number | null;
    estado: string;
}

type Datos =
    | {
        estado: "cargando" | "sin-legajo" | "error";
    }
    | {
        estado: "lista";
        legajo: MiLegajo;
        cursada: Cursada[] | null;
        seguimiento: Seguimiento | null;
    };

export default function DashboardEstudiantePage() {
    const { user } = useAuth();
    const token = user?.token;

    const [datos, setDatos] = useState<Datos>({
        estado: "cargando"
    });

    const [revision, setRevision] = useState(0);

    // La falta de legajo no equivale a una cursada vacía.
    useEffect(() => {
        let vigente = true;

        async function cargar() {
            if (!token) return;

            try {
                const legajo = await api.get<MiLegajo>(
                    "/inscripcion/mi-legajo",
                    token
                );

                if (!vigente) return;

                const [cursada, seguimiento] = await Promise.allSettled([
                    api.get<Cursada[]>(
                        "/seminarios/mi-cursada",
                        token
                    ),

                    api.get<Seguimiento>(
                        `/inscripcion/seguimiento/${encodeURIComponent(legajo.numero_seguimiento)}?dni_pasaporte=${encodeURIComponent(legajo.dni_pasaporte)}`
                    ),
                ]);

                if (vigente) {
                    setDatos({
                        estado: "lista",
                        legajo,

                        cursada: cursada.status === "fulfilled"
                            ? cursada.value
                            : null,

                        seguimiento: seguimiento.status === "fulfilled"
                            ? seguimiento.value
                            : null
                    });
                }

            } catch (error) {
                if (vigente) {
                    setDatos({
                        estado: error instanceof ApiError &&
                            error.status === 404
                            ? "sin-legajo"
                            : "error"
                    });
                }
            }
        }

        void cargar();

        return () => {
            vigente = false;
        };

    }, [token, revision]);

    function reintentar() {
        setDatos({ estado: "cargando" });
        setRevision(v => v + 1);
    }

    const lista = datos.estado === "lista"
        ? datos
        : null;

    const cursada = lista?.cursada;

    const aprobados = cursada?.filter(
        s => s.estado === "APROBADO"
    ).length ?? 0;

    const notas = cursada?.flatMap(s =>
        s.nota_final === null
            ? []
            : [s.nota_final]
    ) ?? [];

    const alertas = cursada?.filter(s =>
        s.nota_final !== null ||
        (
            s.total_clases > 0 &&
            s.porcentaje_asistencia !== null &&
            s.porcentaje_asistencia < 75
        )
    ) ?? [];

    const observaciones = lista?.seguimiento?.observaciones;

    const documentos =
        lista?.seguimiento?.documentacion_a_corregir ?? [];

    const disponible = cursada != null;

    const metricas = [
        {
            titulo: "Estado del legajo",
            valor: lista
                ? mostrarEstadoLegajo(lista.legajo.estado)
                : "Sin información",
            color: "verde",
            ruta: "/dashboard/perfil",
            enlace: "Mi perfil"
        },
        {
            titulo: "Seminarios inscriptos",
            valor: disponible
                ? String(cursada.length)
                : "—",
            color: "azul",
            ruta: "/dashboard/estado-academico",
            enlace: "Ver seminarios"
        },
        {
            titulo: "Seminarios aprobados",
            valor: disponible
                ? `${aprobados} / ${cursada.length}`
                : "—",
            color: "gris",
            ruta: "/dashboard/estado-academico",
            enlace: "Ver detalle"
        },
        {
            titulo: "Aprobación de seminarios cursados",
            valor: cursada?.length
                ? `${Math.round(aprobados / cursada.length * 100)}%`
                : "—",
            color: "amarilla",
            ruta: "/dashboard/estado-academico",
            enlace: "Ver progreso"
        },
        {
            titulo: "Inasistencias",
            valor: disponible
                ? String(
                    cursada.reduce(
                        (sum, s) =>
                            sum + Math.max(
                                0,
                                s.total_clases - s.asistencias
                            ),
                        0
                    )
                )
                : "—",
            color: "roja",
            ruta: "/dashboard/asistencias",
            enlace: "Ver asistencia"
        },
        {
            titulo: "Nota promedio",
            valor: notas.length
                ? (
                    notas.reduce((a, b) => a + b, 0) /
                    notas.length
                ).toFixed(1)
                : "—",
            color: "celeste",
            ruta: "/dashboard/estado-academico",
            enlace: "Ver notas"
        },
    ];

    return (
        <section className="perfil-pagina estudiante-seguimiento">
            <header className="perfil-pagina-encabezado">
                <h1>
                    Hola, {user?.nombre ?? "estudiante"}!
                </h1>

                <p>
                    {lista
                        ? `Carrera: ${lista.legajo.carrera_elegida}`
                        : "Consultá tu información académica."}
                </p>
            </header>

            {datos.estado === "cargando" && (
                <p role="status">
                    Cargando información académica…
                </p>
            )}

            {datos.estado === "error" && (
                <article className="perfil-panel">
                    <div className="estudiante-panel-cuerpo">
                        <MensajeSistema
                            tipo="error"
                            texto="No se pudo cargar tu información académica."
                        />

                        <button
                            className="estudiante-boton"
                            onClick={reintentar}
                        >
                            Reintentar
                        </button>
                    </div>
                </article>
            )}

            {datos.estado === "sin-legajo" && (
                <article className="perfil-panel">
                    <header>
                        <h2>Tu legajo académico</h2>
                    </header>

                    <div className="estudiante-panel-cuerpo estudiante-vacio">
                        <span
                            className="estudiante-emblema"
                            aria-hidden="true"
                        >
                            📋
                        </span>

                        <h3>
                            No encontramos un legajo asociado a tu cuenta
                        </h3>

                        <p>
                            Para acceder a tus datos académicos, el Equipo
                            de Conducción debe verificar tu inscripción y
                            tu cuenta de estudiante. Comunicate con el
                            equipo para revisar la vinculación.
                        </p>

                        <div className="estudiante-acciones">
                            <Link
                                className="perfil-enlace"
                                to="/dashboard/perfil"
                            >
                                Consultar mi perfil
                            </Link>

                            <button
                                className="estudiante-boton"
                                onClick={reintentar}
                            >
                                Volver a consultar
                            </button>
                        </div>
                    </div>
                </article>
            )}

            {lista && (
                <>
                    {(!disponible || !lista.seguimiento) && (
                        <div>
                            <MensajeSistema
                                tipo="advertencia"
                                duracion={0}
                                texto="Parte de tu información académica no está disponible. Podés volver a consultar."
                            />

                            <button
                                className="estudiante-boton"
                                onClick={reintentar}
                            >
                                Reintentar
                            </button>
                        </div>
                    )}

                    <section
                        className="perfil-resumen"
                        aria-label="Resumen académico"
                    >
                        {metricas.map(m => (
                            <article
                                className={`perfil-tarjeta-resumen perfil-tarjeta-${m.color}`}
                                key={m.titulo}
                            >
                                <h2>{m.titulo}</h2>

                                <div className="perfil-tarjeta-contenido">
                                    <strong>{m.valor}</strong>

                                    <Link
                                        className="perfil-enlace"
                                        to={m.ruta}
                                    >
                                        {m.enlace} →
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </section>

                    <div className="perfil-paneles">
                        <article className="perfil-panel">
                            <header>
                                <h2>Mis seminarios</h2>
                            </header>

                            {cursada?.length ? (
                                <ul className="perfil-lista">
                                    {cursada.map(s => (
                                        <li key={s.inscripcion_id}>
                                            <span>
                                                {s.seminario_nombre}
                                            </span>

                                            <span>{s.estado}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="estudiante-panel-cuerpo">
                                    <p>
                                        {disponible
                                            ? "Todavía no estás inscripto en ningún seminario."
                                            : "No se pudo consultar tu cursada."}
                                    </p>

                                    <Link
                                        className="perfil-enlace"
                                        to="/dashboard/estado-academico"
                                    >
                                        Consultar estado académico →
                                    </Link>
                                </div>
                            )}
                        </article>

                        <article className="perfil-panel">
                            <header>
                                <h2>
                                    Resumen de novedades académicas
                                </h2>
                            </header>

                            <div className="estudiante-panel-cuerpo">
                                {(observaciones || documentos.length > 0) && (
                                    <div className="estudiante-novedad">
                                        <strong>
                                            Observaciones del legajo
                                        </strong>

                                        {observaciones && (
                                            <p>{observaciones}</p>
                                        )}

                                        {documentos.length > 0 && (
                                            <p>
                                                Documentación a corregir:{" "}
                                                {documentos.join(", ")}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {alertas.map(s => (
                                    <div
                                        className="estudiante-novedad"
                                        key={s.inscripcion_id}
                                    >
                                        <strong>
                                            {s.seminario_nombre}
                                        </strong>

                                        {s.nota_final !== null && (
                                            <p>
                                                Calificación registrada:{" "}
                                                {s.nota_final}
                                            </p>
                                        )}

                                        {s.total_clases > 0 &&
                                            s.porcentaje_asistencia !== null &&
                                            s.porcentaje_asistencia < 75 && (
                                                <p>
                                                    Asistencia registrada:{" "}
                                                    {s.porcentaje_asistencia}%.
                                                </p>
                                            )}
                                    </div>
                                ))}

                                {disponible &&
                                    lista.seguimiento &&
                                    !observaciones &&
                                    !documentos.length &&
                                    !alertas.length && (
                                        <p>
                                            No se encontraron novedades en
                                            los datos consultados.
                                        </p>
                                    )}

                                {(!disponible || !lista.seguimiento) && (
                                    <p>
                                        La consulta de novedades está incompleta.
                                    </p>
                                )}
                            </div>
                        </article>
                    </div>

                    <article className="perfil-panel">
                        <header>
                            <h2>Trabajo final / Tesis</h2>
                        </header>

                        <div className="estudiante-panel-cuerpo">
                            <p>
                                Consultá los datos registrados por CPR.
                            </p>

                            <Link
                                className="perfil-enlace"
                                to="/dashboard/trabajo-final"
                            >
                                Ver mi seguimiento →
                            </Link>
                        </div>
                    </article>
                </>
            )}
        </section>
    );
}