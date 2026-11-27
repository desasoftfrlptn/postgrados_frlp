import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { tesisApi, type RegistroTesis } from "../../../../shared/api/tesis";
import MensajeSistema from "../../../../shared/componentes/MensajeSistema/MensajeSistema";
import { useAuth } from "../../../manejo-sesion/useAuth";

import "../estilos/SeguimientoEstudiante.css";

type Consulta =
    | {
        estado: "cargando";
    }
    | {
        estado: "error";
    }
    | {
        estado: "lista";
        registros: RegistroTesis[];
    };

// Consulta personal: la API restringe los registros al alumno autenticado.

export default function TrabajoFinalPage() {
    const { user } = useAuth();
    const token = user?.token;

    const [consulta, setConsulta] = useState<Consulta>({
        estado: "cargando"
    });

    const [revision, setRevision] = useState(0);

    useEffect(() => {
        let vigente = true;

        if (token) {
            tesisApi.listar(token)
                .then(registros => {
                    if (vigente) {
                        setConsulta({
                            estado: "lista",
                            registros
                        });
                    }
                })
                .catch(() => {
                    if (vigente) {
                        setConsulta({
                            estado: "error"
                        });
                    }
                });
        }

        return () => {
            vigente = false;
        };

    }, [token, revision]);

    return (
        <section className="perfil-pagina estudiante-seguimiento">
            <header className="perfil-pagina-encabezado">
                <h1>Trabajo final / Tesis</h1>

                <p>
                    Consultá tu trabajo académico y la información registrada
                    por la Comisión de Posgrado Regional.
                </p>
            </header>

            {consulta.estado === "cargando" && (
                <p role="status">
                    Cargando información de tesis…
                </p>
            )}

            {consulta.estado === "error" && (
                <article className="perfil-panel">
                    <div className="estudiante-panel-cuerpo">
                        <MensajeSistema
                            tipo="error"
                            texto="No se pudo consultar tu información de tesis."
                        />

                        <button
                            className="estudiante-boton"
                            onClick={() => {
                                setConsulta({ estado: "cargando" });
                                setRevision(v => v + 1);
                            }}
                        >
                            Reintentar
                        </button>
                    </div>
                </article>
            )}

            {consulta.estado === "lista" &&
                consulta.registros.length === 0 && (
                    <article className="perfil-panel">
                        <header>
                            <h2>Mi seguimiento académico</h2>
                        </header>

                        <div className="estudiante-panel-cuerpo estudiante-vacio">
                            <span
                                className="estudiante-emblema"
                                aria-hidden="true"
                            >
                                📄
                            </span>

                            <h3>
                                Todavía no tenés una tesis registrada
                            </h3>

                            <p>
                                Cuando CPR registre tu tesis de maestría o
                                doctorado, podrás consultar acá el título,
                                la dirección y la aprobación correspondiente.
                                Si cursás una especialización, el seguimiento
                                del trabajo final todavía no está disponible
                                en esta sección.
                            </p>

                            <Link
                                className="perfil-enlace"
                                to="/dashboard/estado-academico"
                            >
                                Consultar mi estado académico →
                            </Link>
                        </div>
                    </article>
                )}

            {consulta.estado === "lista" &&
                consulta.registros.map(registro => (
                    <article
                        className="perfil-panel"
                        key={registro.id}
                    >
                        <header className="estudiante-cabecera-registro">
                            <div>
                                <p className="estudiante-secundario">
                                    {registro.carrera} · {registro.cohorte}
                                </p>

                                <h2>{registro.titulo}</h2>
                            </div>

                            <span
                                className={`estudiante-estado ${
                                    registro.fecha_aprobacion
                                        ? "estudiante-estado-aprobado"
                                        : ""
                                }`}
                            >
                                {registro.fecha_aprobacion
                                    ? "Aprobación registrada por CPR"
                                    : "Sin aprobación registrada"}
                            </span>
                        </header>

                        <div className="estudiante-panel-cuerpo">
                            <h3>Dirección académica</h3>

                            <dl className="estudiante-datos">
                                <div>
                                    <dt>Director</dt>
                                    <dd>{registro.director}</dd>
                                </div>

                                <div>
                                    <dt>Codirector</dt>

                                    <dd>
                                        {registro.codirector || "No registrado"}
                                    </dd>
                                </div>
                            </dl>

                            <h3>Aprobación y resolución</h3>

                            <dl className="estudiante-datos">
                                <div>
                                    <dt>Fecha de aprobación</dt>

                                    <dd>
                                        {registro.fecha_aprobacion
                                            ? registro.fecha_aprobacion
                                                .split("-")
                                                .reverse()
                                                .join("/")
                                            : "Sin registrar"}
                                    </dd>
                                </div>

                                <div>
                                    <dt>Número de resolución</dt>

                                    <dd>
                                        {registro.numero_resolucion ||
                                            "Sin registrar"}
                                    </dd>
                                </div>
                            </dl>

                            <p className="estudiante-secundario">
                                Esta información es de consulta. La gestiona CPR.
                            </p>
                        </div>
                    </article>
                ))}
        </section>
    );
}