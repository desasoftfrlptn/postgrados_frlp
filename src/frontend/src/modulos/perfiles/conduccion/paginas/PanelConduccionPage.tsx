import { useAuth } from "../../../manejo-sesion/useAuth";
import { Link } from "react-router-dom";

import {
    useLegajosConduccion,
    SelectorCohorteConduccion
} from "../componentes/SeleccionLegajosConduccion";

import { formatearEstado } from "../datos/conduccionDatos";

import "../../shared/estilos/PerfilesCompartidos.css";
import "../estilos/PanelConduccion.css";

export default function PanelConduccionPage() {
    const { user } = useAuth();
    const datos = useLegajosConduccion();

    const listo =
        !!datos.cohorteId &&
        !datos.cargando &&
        !datos.cargandoLegajos &&
        !datos.error;

    const contarEstado = (estado: string) =>
        datos.legajos.filter(l => l.estado === estado).length;

    const aspirantesPendientes = datos.legajos.filter(l =>
        ["PENDIENTE", "EN_REVISION", "OBSERVADO"].includes(l.estado)
    );

    const seguimientoAcademico = datos.legajos.filter(l =>
        ["COMPLETADO", "EN_RIESGO"].includes(l.estado)
    );

    const resumenGeneral = [
        {
            titulo: "Carreras activas",
            valor: datos.carreras.filter(c => c.activo).length,
            color: "azul",
            ruta: "estadisticas"
        },
        {
            titulo: "Cohortes registradas",
            valor: datos.cohortes.length,
            color: "gris",
            ruta: "periodos-inscripcion"
        },
        {
            titulo: "Cohortes abiertas",
            valor: datos.cohortes.filter(c => c.abierta).length,
            color: "verde",
            ruta: "periodos-inscripcion"
        }
    ];

    const resumenCohorte = [
        {
            titulo: "Aspirantes pendientes",
            valor: contarEstado("PENDIENTE"),
            estado: "pendiente",
            descripcion: "Pendientes de iniciar revisión"
        },
        {
            titulo: "En revisión",
            valor: contarEstado("EN_REVISION"),
            estado: "revision",
            descripcion: "Inscripciones en evaluación"
        },
        {
            titulo: "Pendientes de matriculación",
            valor: contarEstado("COMPLETADO"),
            estado: "matricula",
            descripcion: "Inscripciones aprobadas"
        },
        {
            titulo: "Estudiantes activos",
            valor: contarEstado("ACTIVO"),
            estado: "activo",
            descripcion: "Legajos académicos activos"
        }
    ];

    const paneles = [
        {
            titulo: "Aspirantes pendientes de atención",
            descripcion: "Inscripciones pendientes, observadas o en revisión.",
            registros: aspirantesPendientes,
            vacio: "No hay aspirantes pendientes de atención.",
            ruta: "aspirantes",
            enlace: "Ver aspirantes"
        },
        {
            titulo: "Seguimiento académico",
            descripcion: "Matriculaciones pendientes y estudiantes en riesgo.",
            registros: seguimientoAcademico,
            vacio: "No hay legajos que requieran seguimiento académico.",
            ruta: "alertas",
            enlace: "Ver seguimiento académico"
        }
    ];

    const mensajeConsulta = datos.error
        ? "No se pudieron consultar los legajos."
        : datos.cargando || datos.cargandoLegajos
            ? "Cargando información..."
            : "Seleccioná una cohorte para consultar sus legajos.";

    return (
        <section className="perfil-pagina panel-conduccion">
            <header className="perfil-pagina-encabezado">
                <h1>Hola, {user?.nombre ?? "Coordinador"}!</h1>
                <p>
                    Consultá el estado de las inscripciones
                    y el seguimiento académico de posgrados.
                </p>
            </header>

            <section
                className="perfil-resumen"
                aria-label="Resumen general"
            >
                {resumenGeneral.map(m => (
                    <article
                        key={m.titulo}
                        className={`perfil-tarjeta-resumen perfil-tarjeta-${m.color}`}
                    >
                        <h2>{m.titulo}</h2>

                        <div className="perfil-tarjeta-contenido">
                            <strong>
                                {datos.cargando || datos.error
                                    ? "—"
                                    : m.valor}
                            </strong>

                            <Link
                                className="perfil-enlace"
                                to={`/dashboard/conduccion/${m.ruta}`}
                            >
                                Ver detalle →
                            </Link>
                        </div>
                    </article>
                ))}
            </section>

            <section className="perfil-panel perfil-dashboard-filtro">
                <header>
                    <h2>Seguimiento por cohorte</h2>
                </header>

                <div className="perfil-panel-interior">
                    <SelectorCohorteConduccion datos={datos} />
                </div>
            </section>

            <section aria-labelledby="resumen-cohorte">
                <h2
                    id="resumen-cohorte"
                    className="panel-conduccion-titulo"
                >
                    Resumen de la cohorte
                </h2>

                {!listo && (
                    <p
                        className="panel-conduccion-ayuda"
                        role={datos.error ? "alert" : "status"}
                    >
                        {mensajeConsulta}
                    </p>
                )}

                <div className="panel-conduccion-indicadores">
                    {resumenCohorte.map(m => (
                        <article
                            key={m.titulo}
                            className={`panel-conduccion-indicador panel-indicador-${m.estado}`}
                        >
                            <h3>{m.titulo}</h3>

                            <strong>
                                {listo ? m.valor : "—"}
                            </strong>

                            <p>{m.descripcion}</p>
                        </article>
                    ))}
                </div>
            </section>

            <div className="perfil-paneles perfil-dashboard-seguimiento">
                {paneles.map(panel => (
                    <article
                        className="perfil-panel"
                        key={panel.titulo}
                    >
                        <header>
                            <h2>{panel.titulo}</h2>
                        </header>

                        <p className="panel-conduccion-descripcion">
                            {panel.descripcion}
                        </p>

                        {!listo ? (
                            <p className="perfil-panel-interior">
                                {mensajeConsulta}
                            </p>
                        ) : panel.registros.length === 0 ? (
                            <p className="perfil-panel-interior">
                                {panel.vacio}
                            </p>
                        ) : (
                            <ul className="perfil-lista">
                                {panel.registros.slice(0, 5).map(l => (
                                    <li key={l.id}>
                                        <span>
                                            <strong>
                                                {l.apellido}, {l.nombre}
                                            </strong>

                                            <span
                                                className="panel-conduccion-estado"
                                                data-estado={l.estado}
                                            >
                                                {formatearEstado(l.estado)}
                                            </span>
                                        </span>

                                        <Link
                                            className="perfil-enlace"
                                            to={`/dashboard/conduccion/legajos/${encodeURIComponent(l.id)}`}
                                        >
                                            Consultar
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="perfil-panel-interior panel-conduccion-pie">
                            {listo && (
                                <small>
                                    {Math.min(panel.registros.length, 5)}
                                    {" de "}
                                    {panel.registros.length} registros
                                </small>
                            )}

                            <Link
                                className="perfil-enlace"
                                to={`/dashboard/conduccion/${panel.ruta}`}
                            >
                                {panel.enlace} →
                            </Link>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}
