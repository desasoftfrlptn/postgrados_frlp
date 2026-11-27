import { useEffect, useState } from "react";
import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";

import {
    SelectorCohorteConduccion,
    useLegajosConduccion
} from "../componentes/SeleccionLegajosConduccion";

import { formatearEstado } from "../datos/conduccionDatos";

import "../../shared/estilos/PerfilesCompartidos.css";
import "../estilos/ConduccionModulos.css";
import "../../administrador/estilos/FiltrosAcademicos.css";
import "../estilos/PerfilesAcademicos.css";
import "../estilos/ConduccionInstitucional.css";

type Perfil = "estudiantes" | "docentes" | "cpr" | "aspirantes";

type Persona = {
    id: string;
    nombre: string;
    apellido: string;
    correo_electronico: string;
    rol: string;
    activo: boolean;
};

const opciones: { id: Perfil; texto: string }[] = [
    { id: "estudiantes", texto: "Estudiantes" },
    { id: "docentes", texto: "Docentes" },
    { id: "cpr", texto: "CPR" },
    { id: "aspirantes", texto: "Aspirantes" }
];

const estadosAcademicos = [
    "ACTIVO",
    "EN_RIESGO",
    "GRADUADO"
];

export default function PerfilesAcademicosConduccionPage() {
    const datos = useLegajosConduccion();
    const { user } = useAuth();
    const token = user?.token;

    const [perfil, setPerfil] = useState<Perfil>("estudiantes");
    const [busqueda, setBusqueda] = useState("");
    const [estadoFiltro, setEstadoFiltro] = useState("");
    const [seleccion, setSeleccion] = useState("");

    const [resultado, setResultado] = useState<{
        personas?: Persona[];
        error?: string;
    } | null>(null);

    const [revision, setRevision] = useState(0);

    const personal =
        perfil === "docentes" ||
        perfil === "cpr";

    useEffect(() => {
        if (!token || !personal) return;

        let vigente = true;

        api.get<Persona[]>("/conduccion/perfiles-academicos", token)
            .then(personas => {
                if (vigente) {
                    setResultado({ personas });
                }
            })
            .catch(() => {
                if (vigente) {
                    setResultado({
                        error: "No se pudo cargar el personal académico."
                    });
                }
            });

        return () => {
            vigente = false;
        };

    }, [token, personal, revision]);

    const coincide = (texto: string) =>
        texto.toLocaleLowerCase()
            .includes(busqueda.trim().toLocaleLowerCase());

    const legajosBase = datos.legajos.filter(l =>
        (
            perfil === "estudiantes"
                ? estadosAcademicos.includes(l.estado)
                : ![...estadosAcademicos, "BORRADOR"].includes(l.estado)
        )
    );

    const personasBase = (resultado?.personas ?? []).filter(p =>
        p.rol === (perfil === "docentes" ? "DOCENTE" : "CPR")
    );

    const legajos = legajosBase.filter(l =>
        coincide(`${l.nombre} ${l.apellido} ${l.apellido} ${l.nombre} ${l.dni_pasaporte} ${l.correo_electronico ?? ""}`) &&
        (!estadoFiltro || l.estado === estadoFiltro)
    );

    const personas = personasBase.filter(p =>
        coincide(`${p.nombre} ${p.apellido} ${p.apellido} ${p.nombre} ${p.correo_electronico}`) &&
        (!estadoFiltro || (p.activo ? "ACTIVO" : "INACTIVO") === estadoFiltro)
    );

    const detalle = personal
        ? personas.find(p => p.id === seleccion)
        : legajos.find(l => l.id === seleccion);


    const registros = personal ? personas : legajos;
    const cantidadTotal = personal
        ? personasBase.length
        : legajosBase.length;

    const estadosDisponibles = personal
        ? ["ACTIVO", "INACTIVO"]
        : [...new Set(legajosBase.map(l => l.estado))].sort();

    const listo = personal
        ? !!resultado?.personas
        : !!datos.cohorteId &&
          !datos.cargando &&
          !datos.cargandoLegajos &&
          !datos.error;

    function limpiarFiltros() {
        setBusqueda("");
        setEstadoFiltro("");
        setSeleccion("");
    }

    return (
        <section className="perfil-pagina perfiles-academicos conduccion-institucional">
            <header className="perfil-pagina-encabezado">
                <h1>Perfiles académicos</h1>
                <p>
                    Consultá la información de estudiantes,
                    docentes, CPR y aspirantes de posgrados.
                </p>
            </header>

            <nav
                className="perfiles-academicos-pestanas"
                aria-label="Tipos de perfil"
            >
                {opciones.map(o => (
                    <button
                        type="button"
                        key={o.id}
                        className={perfil === o.id ? "activa" : ""}
                        aria-pressed={perfil === o.id}
                        onClick={() => {
                            setPerfil(o.id);
                            limpiarFiltros();
                        }}
                    >
                        {o.texto}
                    </button>
                ))}
            </nav>

            <div className="admin-filtros-academicos perfiles-academicos-filtros">
                <div className="admin-filtro-campo">
                    <label htmlFor="perfil-busqueda">
                        Buscar perfil
                    </label>

                    <input
                        id="perfil-busqueda"
                        type="search"
                        value={busqueda}
                        onChange={e => {
                            setBusqueda(e.target.value);
                            setSeleccion("");
                        }}
                        placeholder={
                            personal
                                ? "Nombre, apellido o correo"
                                : "Nombre, documento o correo"
                        }
                    />
                </div>

                {!personal && (
                    <div
                        className="perfiles-academicos-cohorte"
                        onChange={() => {
                            setSeleccion("");
                            setEstadoFiltro("");
                        }}
                    >
                        <SelectorCohorteConduccion datos={datos} />
                    </div>
                )}

                <div className="admin-filtro-campo">
                    <label htmlFor="perfil-estado">Estado</label>

                    <select
                        id="perfil-estado"
                        value={estadoFiltro}
                        onChange={e => {
                            setEstadoFiltro(e.target.value);
                            setSeleccion("");
                        }}
                    >
                        <option value="">Todos</option>

                        {estadosDisponibles.map(estado => (
                            <option key={estado} value={estado}>
                                {personal
                                    ? estado === "ACTIVO"
                                        ? "Activo"
                                        : "Inactivo"
                                    : formatearEstado(estado)}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    type="button"
                    className="admin-limpiar-filtros"
                    onClick={limpiarFiltros}
                >
                    Limpiar filtros de búsqueda
                </button>
            </div>

            {listo && (
                <p
                    role="status"
                    className="admin-resultado-filtros"
                >
                    {registros.length} de {cantidadTotal} resultados
                </p>
            )}

            <div className="perfiles-academicos-tabla-contenedor">
                {personal && !resultado ? (
                    <p className="perfiles-academicos-vacio" role="status">
                        Cargando perfiles…
                    </p>
                ) : personal && resultado?.error ? (
                    <div className="perfiles-academicos-vacio">
                        <p role="alert">{resultado.error}</p>

                        <button
                            type="button"
                            className="admin-limpiar-filtros"
                            onClick={() => {
                                setResultado(null);
                                setRevision(v => v + 1);
                            }}
                        >
                            Reintentar
                        </button>
                    </div>
                ) : !personal && datos.error ? (
                    <p className="perfiles-academicos-vacio" role="alert">
                        No se pudieron cargar los perfiles académicos.
                    </p>
                ) : !personal && (datos.cargando || datos.cargandoLegajos) ? (
                    <p className="perfiles-academicos-vacio" role="status">
                        Cargando información académica…
                    </p>
                ) : !personal && !datos.cohorteId ? (
                    <p className="perfiles-academicos-vacio">
                        Seleccioná una cohorte para consultar los perfiles.
                    </p>
                ) : (
                    <table className="perfiles-academicos-tabla">
                        <thead>
                            <tr>
                                <th scope="col">Apellido y nombre</th>
                                <th scope="col">
                                    {personal ? "Correo electrónico" : "Documento"}
                                </th>
                                <th scope="col">
                                    {personal ? "Rol" : "Carrera"}
                                </th>
                                <th scope="col">Estado</th>
                                <th scope="col">Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {registros.map(p => {
                                const esPersonal = "rol" in p;

                                const estado = esPersonal
                                    ? p.activo ? "ACTIVO" : "INACTIVO"
                                    : p.estado;

                                return (
                                    <tr key={p.id}>
                                        <td className="perfiles-academicos-nombre">
                                            {p.apellido}, {p.nombre}
                                        </td>

                                        <td>
                                            {esPersonal
                                                ? p.correo_electronico
                                                : p.dni_pasaporte}
                                        </td>

                                        <td>
                                            {esPersonal
                                                ? p.rol
                                                : p.carrera_elegida}
                                        </td>

                                        <td>
                                            <span
                                                className="perfiles-academicos-estado"
                                                data-estado={estado}
                                            >
                                                {esPersonal
                                                    ? p.activo
                                                        ? "Activo"
                                                        : "Inactivo"
                                                    : formatearEstado(p.estado)}
                                            </span>
                                        </td>

                                        <td>
                                            <button
                                                type="button"
                                                className="perfiles-academicos-consultar"
                                                aria-label={`Consultar ${p.apellido}, ${p.nombre}`}
                                                onClick={() => setSeleccion(p.id)}
                                            >
                                                Consultar
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}

                            {registros.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="perfiles-academicos-vacio"
                                    >
                                        No se encontraron perfiles
                                        para los filtros seleccionados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {listo && detalle && (
                <article className="perfil-panel perfiles-academicos-detalle">
                    <header>
                        <div>
                            <h2>{detalle.apellido}, {detalle.nombre}</h2>
                            <p>Información del perfil · Solo lectura</p>
                        </div>

                        <button
                            type="button"
                            className="admin-limpiar-filtros"
                            onClick={() => setSeleccion("")}
                        >
                            Cerrar detalle
                        </button>
                    </header>

                    <div className="perfil-panel-interior">
                        <dl className="perfiles-academicos-datos">
                            <div>
                                <dt>Correo electrónico</dt>
                                <dd>{detalle.correo_electronico}</dd>
                            </div>

                            {"rol" in detalle ? (
                                <>
                                    <div>
                                        <dt>Rol</dt>
                                        <dd>{detalle.rol}</dd>
                                    </div>

                                    <div>
                                        <dt>Estado</dt>
                                        <dd>
                                            {detalle.activo
                                                ? "Activo"
                                                : "Inactivo"}
                                        </dd>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <dt>Documento</dt>
                                        <dd>{detalle.dni_pasaporte}</dd>
                                    </div>

                                    <div>
                                        <dt>Carrera</dt>
                                        <dd>{detalle.carrera_elegida}</dd>
                                    </div>

                                    <div>
                                        <dt>Estado</dt>
                                        <dd>
                                            {formatearEstado(detalle.estado)}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt>Cohorte</dt>
                                        <dd>{datos.cohorte?.nombre ?? "—"}</dd>
                                    </div>
                                </>
                            )}
                        </dl>
                    </div>
                </article>
            )}
        </section>
    );
}
