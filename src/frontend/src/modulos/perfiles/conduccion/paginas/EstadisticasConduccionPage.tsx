import { useEffect, useState } from "react";
import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";
import MensajeSistema from "../../../../shared/componentes/MensajeSistema/MensajeSistema";
import GraficoIndicadores from "../../shared/componentes/GraficoIndicadores";

import {
    contarPorEstado,
    formatearEstado,
    construirCSV,
    descargarCSV,
    type LegajoConduccion,
    type CarreraConduccion,
    type CohorteConduccion
} from "../datos/conduccionDatos";

import "../../administrador/estilos/Administrador.css";
import "../estilos/EstadisticasConduccion.css";

interface DatosEstadisticas {
    legajos: LegajoConduccion[];
    carreras: CarreraConduccion[];
    cohortes: CohorteConduccion[];
}

const estadosAspirantes = [
    "PENDIENTE",
    "EN_REVISION",
    "OBSERVADO",
    "COMPLETADO",
    "RECHAZADO",
    "VENCIDO"
];

const estadosEstudiantes = [
    "ACTIVO",
    "EN_RIESGO",
    "GRADUADO"
];

function agrupar(registros: string[]) {
    const cantidades = new Map<string, number>();

    registros.forEach(nombre => {
        cantidades.set(nombre, (cantidades.get(nombre) ?? 0) + 1);
    });

    return [...cantidades.entries()].sort((a, b) => b[1] - a[1]);
}

export default function EstadisticasConduccionPage() {
    const { user } = useAuth();
    const token = user?.token;

    const [datos, setDatos] = useState<DatosEstadisticas | null>(null);
    const [error, setError] = useState("");
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        if (!token) return;

        let vigente = true;

        Promise.all([
            api.get<LegajoConduccion[]>("/inscripcion/", token),
            api.get<CarreraConduccion[]>("/carreras", token),
            api.get<CohorteConduccion[]>("/cohortes", token)
        ])
            .then(([legajos, carreras, cohortes]) => {
                if (vigente) {
                    setDatos({ legajos, carreras, cohortes });
                    setError("");
                }
            })
            .catch((err: unknown) => {
                if (vigente) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "No se pudieron cargar las estadísticas."
                    );
                }
            });

        return () => {
            vigente = false;
        };
    }, [token, revision]);

    const legajos = datos?.legajos ?? [];
    const carreras = datos?.carreras ?? [];
    const cohortes = datos?.cohortes ?? [];

    const aspirantes = legajos.filter(l =>
        estadosAspirantes.includes(l.estado)
    );

    const estudiantes = legajos.filter(l =>
        estadosEstudiantes.includes(l.estado)
    );

    const cantidades = contarPorEstado(legajos);

    const becas = aspirantes.filter(l =>
        l.solicitud_beca != null && l.solicitud_beca > 0
    ).length;

    const metricas = [
        {
            titulo: "Aspirantes pendientes",
            valor: cantidades.PENDIENTE ?? 0,
            color: "amarillo"
        },
        {
            titulo: "Pendientes de matriculación",
            valor: cantidades.COMPLETADO ?? 0,
            color: "azul"
        },
        {
            titulo: "Estudiantes activos",
            valor: cantidades.ACTIVO ?? 0,
            color: "verde"
        },
        {
            titulo: "Estudiantes en riesgo",
            valor: cantidades.EN_RIESGO ?? 0,
            color: "rojo"
        }
    ];

    const admisiones = [
        {
            titulo: "Estados de aspirantes",
            filas: estadosAspirantes.map(estado => [
                formatearEstado(estado),
                cantidades[estado] ?? 0
            ] as const)
        },
        {
            titulo: "Situación académica",
            filas: estadosEstudiantes.map(estado => [
                formatearEstado(estado),
                cantidades[estado] ?? 0
            ] as const),
            distribucion: true
        },
        {
            titulo: "Aspirantes por carrera",
            filas: agrupar(
                aspirantes.map(l => l.carrera_elegida || "Sin carrera")
            )
        },
        {
            titulo: "Solicitudes de beca de aspirantes",
            filas: [
                ["Con solicitud", becas],
                ["Sin solicitud", aspirantes.length - becas]
            ] as const,
            distribucion: true
        }
    ];

    const oferta = [
        {
            titulo: "Estudiantes por carrera",
            filas: agrupar(
                estudiantes.map(l => l.carrera_elegida || "Sin carrera")
            )
        },
        {
            titulo: "Cohortes por año",
            filas: agrupar(cohortes.map(c => String(c.anio)))
        },
        {
            titulo: "Estado de las inscripciones por cohorte",
            filas: [
                ["Abiertas", cohortes.filter(c => c.abierta).length],
                ["Cerradas", cohortes.filter(c => !c.abierta).length]
            ] as const,
            distribucion: true
        },
        {
            titulo: "Estado de las carreras",
            filas: [
                ["Activas", carreras.filter(c => c.activo).length],
                ["Inactivas", carreras.filter(c => !c.activo).length]
            ] as const,
            distribucion: true
        }
    ];

    const graficos = [...admisiones, ...oferta];

    function descargar() {
        if (!datos || error) return;

        const filas = [
            ...metricas.map(m => [
                "Indicadores principales",
                m.titulo,
                m.valor
            ]),
            ...graficos.flatMap(g =>
                g.filas.map(([nombre, cantidad]) => [
                    g.titulo,
                    nombre,
                    cantidad
                ])
            )
        ];

        descargarCSV(
            "estadisticas-coordinador.csv",
            construirCSV(
                ["Grupo", "Indicador", "Cantidad"],
                filas
            )
        );
    }

    return (
        <section className="admin-dashboard estadisticas-generales-conduccion">
            <header className="admin-dashboard-encabezado admin-reportes-cabecera">
                <div>
                    <h1>Estadísticas y reportes</h1>
                    <p>
                        Información consolidada de la gestión académica
                        de posgrados.
                    </p>
                </div>

                <button
                    type="button"
                    className="estadisticas-descargar"
                    disabled={!datos || !!error}
                    onClick={descargar}
                >
                    Descargar CSV
                </button>
            </header>

            {!datos && !error && (
                <div className="estadisticas-mensaje" role="status">
                    Cargando indicadores académicos…
                </div>
            )}

            {error && (
                <>
                    <MensajeSistema
                        tipo="error"
                        texto={error}
                    />

                    <button
                        type="button"
                        className="estadisticas-descargar"
                        onClick={() => {
                            setDatos(null);
                            setError("");
                            setRevision(v => v + 1);
                        }}
                    >
                        Reintentar
                    </button>
                </>
            )}

            {datos && !error && (
                <>
                    <section
                        className="estadisticas-metricas"
                        aria-label="Indicadores principales"
                    >
                        {metricas.map(m => (
                            <article
                                key={m.titulo}
                                className={`estadisticas-metrica metrica-${m.color}`}
                            >
                                <h2>{m.titulo}</h2>
                                <strong>{m.valor}</strong>
                            </article>
                        ))}
                    </section>

                    <section aria-labelledby="titulo-admisiones">
                        <h2
                            id="titulo-admisiones"
                            className="estadisticas-seccion-titulo"
                        >
                            Admisiones y seguimiento académico
                        </h2>

                        <div className="admin-reportes-graficos">
                            {admisiones.map(g => (
                                <GraficoIndicadores
                                    key={g.titulo}
                                    titulo={g.titulo}
                                    filas={g.filas}
                                    distribucion={g.distribucion}
                                    mostrarPorcentajes
                                />
                            ))}
                        </div>
                    </section>

                    <section aria-labelledby="titulo-oferta">
                        <h2
                            id="titulo-oferta"
                            className="estadisticas-seccion-titulo"
                        >
                            Oferta académica
                        </h2>

                        <div className="admin-reportes-graficos">
                            {oferta.map(g => (
                                <GraficoIndicadores
                                    key={g.titulo}
                                    titulo={g.titulo}
                                    filas={g.filas}
                                    distribucion={g.distribucion}
                                    mostrarPorcentajes
                                />
                            ))}
                        </div>
                    </section>

                    <p className="estadisticas-aclaracion">
                        Los indicadores académicos contabilizan legajos,
                        no personas únicas.
                    </p>
                </>
            )}
        </section>
    );
}
