import { useEffect, useState } from "react";
import GraficoIndicadores from "../../shared/componentes/GraficoIndicadores";
import { useResumenAdmin } from "../hooks/useResumenAdmin";
import MensajeSistema from "../../../../shared/componentes/MensajeSistema/MensajeSistema";
import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";
import {
    mostrarEstadoLegajo,
    ETIQUETAS_ESTADO_LEGAJO
} from "../../../../shared/utils/estadosLegajo";

import "../estilos/Administrador.css";
import "../estilos/FiltrosAcademicos.css";

type Grupo = Record<string, number>;
type Reporte = Record<string, Grupo>;

const grupos = [
    ["usuarios", "Estado de usuarios"],
    ["roles", "Usuarios por rol"],
    ["docentes", "Docentes"],
    ["admisiones", "Distribución de admisiones"],
    ["aspirantes", "Estados de aspirantes"],
    ["estudiantes", "Estados académicos"],
    ["becas", "Solicitudes de beca"],
    ["carreras", "Carreras"],
    ["tipos", "Carreras por tipo"],
    ["cohortes", "Cohortes"],
    ["seminarios", "Seminarios"],
    ["tutorias", "Tutorías"],
    ["trabajos", "Trabajos prácticos"],
    ["tesis", "Tesis"],
] as const;

const categorias = [
    ["general", "Todos los indicadores"],
    ["usuarios", "Usuarios y docentes"],
    ["admision", "Admisiones y becas"],
    ["oferta", "Oferta académica"],
    ["seminarios", "Seminarios"],
    ["tutorias", "Tutorías"],
    ["trabajos", "Trabajos prácticos y tesis"],
] as const;

const claves: Record<string, string[]> = {
    usuarios: ["usuarios", "roles", "docentes"],
    admision: ["admisiones", "aspirantes", "estudiantes", "becas"],
    oferta: ["carreras", "tipos", "cohortes"],
    seminarios: ["seminarios"],
    tutorias: ["tutorias"],
    trabajos: ["trabajos", "tesis"],
};

const totales = [
    ["usuarios", "Usuarios"],
    ["docentes", "Docentes"],
    ["aspirantes", "Aspirantes"],
    ["estudiantes", "Legajos de estudiantes"],
    ["carreras", "Carreras"],
    ["cohortes", "Cohortes"],
    ["seminarios", "Seminarios"],
    ["tutorias", "Tutorías"],
    ["trabajos", "Trabajos prácticos"],
    ["tesis", "Tesis"]
] as const;

const total = (grupo?: Grupo) =>
    grupo
        ? Object.values(grupo).reduce(
            (suma, valor) => suma + valor,
            0
        )
        : undefined;

const etiqueta = (grupo: string, nombre: string) =>
    ["admisiones", "aspirantes", "estudiantes"].includes(grupo)
        ? mostrarEstadoLegajo(nombre)
        : nombre.replaceAll("_", " ");

const celdaCSV = (valor: string | number) =>
    `"${String(valor).replaceAll('"', '""')}"`;

export default function ReportesPage() {
    const { user } = useAuth();
    const token = user?.token;
    const { datos } = useResumenAdmin();

    const [tipo, setTipo] = useState("general");
    const [carrera, setCarrera] = useState("");
    const [cohorte, setCohorte] = useState("");
    const [anio, setAnio] = useState("");
    const [rol, setRol] = useState("");
    const [estado, setEstado] = useState("");
    const [grafico, setGrafico] = useState("");
    const [intento, setIntento] = useState(0);

    const consulta = new URLSearchParams();

    if (carrera) {
        consulta.set("carrera_id", carrera);
    }

    if (cohorte) {
        consulta.set("cohorte_id", cohorte);
    }

    if (anio) {
        consulta.set("anio", anio);
    }

    if (rol) {
        consulta.set("rol", rol);
    }

    if (estado) {
        consulta.set("estado_legajo", estado);
    }

    const ruta = `/inscripcion/estadisticas-administrativas?${consulta.toString()}`;

    const [resultado, setResultado] = useState<{
        ruta: string;
        intento: number;
        token: string;
        reporte?: Reporte;
        error?: string;
    } | null>(null);

    useEffect(() => {
        if (!token) return;

        let vigente = true;

        api.get<Reporte>(ruta, token)
            .then(reporte => {
                if (vigente) {
                    setResultado({
                        ruta,
                        intento,
                        token,
                        reporte
                    });
                }
            })
            .catch(e => {
                if (vigente) {
                    setResultado({
                        ruta,
                        intento,
                        token,
                        error:
                            e instanceof Error
                                ? e.message
                                : "No se pudieron cargar las estadísticas."
                    });
                }
            });

        return () => {
            vigente = false;
        };

    }, [ruta, intento, token]);

    const actual =
        resultado?.ruta === ruta &&
        resultado.intento === intento &&
        resultado.token === token
            ? resultado
            : null;

    const reporte = actual?.reporte;

    const visibles = grupos.filter(
        ([clave]) =>
            tipo === "general" ||
            claves[tipo]?.includes(clave)
    );

    const graficos = visibles.filter(
        ([clave]) =>
            tipo !== "general" ||
            [
                "roles",
                "admisiones",
                "tipos",
                "cohortes",
                "becas",
                "tesis"
            ].includes(clave)
    );

    const principal =
        visibles.find(([clave]) => clave === grafico) ??
        graficos[0];

    const adicionales = graficos.filter(
        ([clave]) =>
            clave !== principal?.[0] &&
            reporte?.[clave] !== undefined
    );

    const metricas = totales
        .filter(([clave]) =>
            tipo === "general"
                ? [
                    "usuarios",
                    "aspirantes",
                    "carreras",
                    "seminarios"
                ].includes(clave)
                : claves[tipo]?.includes(clave)
        )
        .slice(0, 4);

    const anios = [
        ...new Set(
            (datos.cohortes ?? []).flatMap(c =>
                c.anio == null ? [] : [c.anio]
            )
        )
    ].sort((a, b) => b - a);

    const cohortes = (datos.cohortes ?? []).filter(
        c =>
            (!carrera || c.carrera_id === carrera) &&
            (!anio || String(c.anio) === anio)
    );

    function descargar() {
        if (!reporte) return;

        const filas = visibles.flatMap(
            ([clave, titulo]) =>
                Object.entries(reporte[clave] ?? {}).map(
                    ([nombre, valor]) =>
                        [
                            titulo,
                            etiqueta(clave, nombre),
                            valor
                        ]
                            .map(celdaCSV)
                            .join(";")
                )
        );

        const url = URL.createObjectURL(
            new Blob(
                [
                    "\ufeffGrupo;Indicador;Cantidad\r\n",
                    filas.join("\r\n")
                ],
                {
                    type: "text/csv;charset=utf-8"
                }
            )
        );

        const enlace = document.createElement("a");

        enlace.href = url;
        enlace.download = `reporte-${tipo}.csv`;

        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        window.setTimeout(
            () => URL.revokeObjectURL(url),
            1000
        );
    }

    return (
        <section className="admin-dashboard">
            <header className="admin-dashboard-encabezado admin-reportes-cabecera">
                <div>
                    <h1>Estadísticas y reportes</h1>

                    <p>
                        Información consolidada del sistema de posgrados.
                    </p>
                </div>

                <button
                    type="button"
                    className="admin-limpiar-filtros"
                    disabled={!reporte}
                    onClick={descargar}
                >
                    Descargar CSV
                </button>
            </header>

            <div className="admin-panel admin-reportes-filtros">
                <h2>Filtros de consulta</h2>

                <div className="admin-filtros-academicos">
                    <div className="admin-filtro-campo">
                        <label htmlFor="tipo-reporte">
                            Tipo de reporte
                        </label>

                        <select
                            id="tipo-reporte"
                            value={tipo}
                            onChange={e => {
                                setTipo(e.target.value);
                                setGrafico("");
                            }}
                        >
                            {categorias.map(([id, nombre]) => (
                                <option key={id} value={id}>
                                    {nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="admin-filtro-campo">
                        <label htmlFor="reporte-carrera">
                            Carrera
                        </label>

                        <select
                            id="reporte-carrera"
                            value={carrera}
                            onChange={e => {
                                setCarrera(e.target.value);
                                setCohorte("");
                            }}
                        >
                            <option value="">Todas</option>

                            {datos.carreras?.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.nombre ?? "Carrera"}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="admin-filtro-campo">
                        <label htmlFor="reporte-anio">
                            Año de cohorte
                        </label>

                        <select
                            id="reporte-anio"
                            value={anio}
                            onChange={e => {
                                setAnio(e.target.value);
                                setCohorte("");
                            }}
                        >
                            <option value="">Todos</option>

                            {anios.map(a => (
                                <option key={a} value={a}>
                                    {a}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="admin-filtro-campo">
                        <label htmlFor="reporte-cohorte">
                            Cohorte
                        </label>

                        <select
                            id="reporte-cohorte"
                            value={cohorte}
                            onChange={e => setCohorte(e.target.value)}
                        >
                            <option value="">Todas</option>

                            {cohortes.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.nombre ?? "Cohorte"}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="admin-filtro-campo">
                        <label htmlFor="reporte-rol">
                            Rol de usuario
                        </label>

                        <select
                            id="reporte-rol"
                            value={rol}
                            onChange={e => setRol(e.target.value)}
                        >
                            <option value="">Todos</option>

                            {[
                                "ADMIN",
                                "ALUMNO",
                                "DOCENTE",
                                "COORDINADOR",
                                "CPR"
                            ].map(r => (
                                <option key={r}>
                                    {r}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="admin-filtro-campo">
                        <label htmlFor="reporte-estado">
                            Estado del legajo
                        </label>

                        <select
                            id="reporte-estado"
                            value={estado}
                            onChange={e => setEstado(e.target.value)}
                        >
                            <option value="">Todos</option>

                            {Object.entries(
                                ETIQUETAS_ESTADO_LEGAJO
                            ).map(([codigo, nombre]) => (
                                <option key={codigo} value={codigo}>
                                    {nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        className="admin-limpiar-filtros"
                        onClick={() => {
                            setGrafico("");
                            setEstado("");
                            setTipo("general");
                            setCarrera("");
                            setAnio("");
                            setCohorte("");
                            setRol("");
                        }}
                    >
                        Limpiar filtros
                    </button>
                </div>

                <p className="text-sm text-gray-600">
                    Carrera, cohorte y año filtran la oferta y los legajos.
                    El estado filtra los legajos y sus registros vinculados.
                    Los seminarios se cuentan por carrera; usuarios y docentes
                    son globales, y el rol filtra usuarios. Los indicadores de
                    estudiantes cuentan legajos, no personas únicas.
                </p>
            </div>

            {!actual && (
                <p role="status">
                    Cargando indicadores…
                </p>
            )}

            {actual?.error && (
                <>
                    <MensajeSistema
                        tipo="error"
                        texto={actual.error}
                    />

                    <button
                        type="button"
                        onClick={() => setIntento(i => i + 1)}
                    >
                        Reintentar
                    </button>
                </>
            )}

            {reporte && (
                <>
                    <section
                        className="admin-reporte-metricas"
                        aria-label="Indicadores principales"
                    >
                        {metricas.map(([clave, nombre]) => (
                            <div key={clave}>
                                <span>{nombre}</span>

                                <strong>
                                    {total(reporte[clave]) ?? "—"}
                                </strong>
                            </div>
                        ))}
                    </section>

                    <section
                        className="admin-reporte-analisis"
                        aria-label="Análisis de indicadores"
                    >
                        <div className="admin-reporte-control">
                            <h2>Distribución de registros</h2>

                            <label htmlFor="grafico-reporte">
                                Indicador
                            </label>

                            <select
                                id="grafico-reporte"
                                value={principal?.[0] ?? ""}
                                onChange={e => setGrafico(e.target.value)}
                            >
                                {visibles.map(([clave, titulo]) => (
                                    <option key={clave} value={clave}>
                                        {titulo}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {principal && (
                            <GraficoIndicadores
                                titulo={principal[1]}
                                filas={Object.entries(
                                    reporte[principal[0]] ?? {}
                                ).map(([nombre, cantidad]) => [
                                    etiqueta(principal[0], nombre),
                                    cantidad
                                ] as const)}
                                mostrarPorcentajes
                            />
                        )}
                    </section>

                    <div className="admin-reportes-graficos">
                        {adicionales.map(([clave, titulo]) => (
                            <GraficoIndicadores
                                key={clave}
                                titulo={titulo}
                                filas={Object.entries(
                                    reporte[clave] ?? {}
                                ).map(([nombre, cantidad]) => [
                                    etiqueta(clave, nombre),
                                    cantidad
                                ] as const)}
                                distribucion={[
                                    "roles",
                                    "becas",
                                    "tipos"
                                ].includes(clave)}
                                mostrarPorcentajes
                            />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}