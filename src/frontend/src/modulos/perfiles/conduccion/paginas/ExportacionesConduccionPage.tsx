import { useState } from "react";

import {
    CabeceraConduccion,
    SelectorCohorteConduccion,
    TablaLegajos,
    useLegajosConduccion
} from "../componentes/SeleccionLegajosConduccion";

import {
    csvLegajos,
    descargarCSV
} from "../datos/conduccionDatos";

export default function ExportacionesConduccionPage() {
    const datos = useLegajosConduccion();

    const [busqueda, setBusqueda] = useState("");
    const [seleccionado, setSeleccionado] = useState("");

    const legajos = datos.legajos.filter((legajo) =>
        `${legajo.nombre} ${legajo.apellido} ${legajo.dni_pasaporte}`
            .toLocaleLowerCase("es")
            .includes(busqueda.toLocaleLowerCase("es"))
    );

    const legajo = legajos.find(
        (item) => item.id === seleccionado
    );

    const filtrados = legajo ? [legajo] : legajos;

    function descargarCohorte() {
        if (!datos.cohorteId || !filtrados.length) return;

        descargarCSV(
            `legajos_${datos.cohorte?.anio ?? "cohorte"}.csv`,
            csvLegajos(filtrados)
        );
    }

    return (
        <section className="cc-pagina">
            <CabeceraConduccion
                titulo="Exportación de legajos"
                descripcion="Descargá la información de inscripciones por cohorte o por aspirante."
            />

            <div className="cc-aviso">
                Se descarga un archivo CSV compatible con Excel.
                Incluye los campos disponibles en el listado de
                inscripciones, no las calificaciones académicas.
            </div>

            <div className="cc-tarjeta">
                <h2>Seleccionar información</h2>

                <SelectorCohorteConduccion
                    datos={{
                        ...datos,
                        setCohorteId: id => {
                            setSeleccionado("");
                            datos.setCohorteId(id);
                        }
                    }}
                />

                <div className="cc-filtros">
                    <div className="cc-campo">
                        <label htmlFor="exportar-busqueda">
                            Buscar por nombre o DNI
                        </label>

                        <input
                            id="exportar-busqueda"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar aspirante"
                        />
                    </div>

                    <div className="cc-campo">
                        <label htmlFor="exportar-legajo">
                            Aspirante individual
                        </label>

                        <select
                            id="exportar-legajo"
                            value={seleccionado}
                            onChange={(e) => setSeleccionado(e.target.value)}
                        >
                            <option value="">
                                Seleccionar aspirante
                            </option>

                            {legajos.map((item) => (
                                <option
                                    key={item.id}
                                    value={item.id}
                                >
                                    {item.apellido}, {item.nombre} ·{" "}
                                    {item.dni_pasaporte}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="cc-acciones mt-6">
                    <button
                        className="cc-btn"
                        type="button"
                        onClick={descargarCohorte}
                        disabled={
                            !datos.cohorteId ||
                            !filtrados.length ||
                            datos.cargandoLegajos ||
                            !!datos.error
                        }
                    >
                        Descargar CSV ({filtrados.length})
                    </button>
                </div>
            </div>

            {datos.cohorteId && (
                <div className="cc-tarjeta">
                    <h2>Vista previa ({filtrados.length})</h2>

                    <TablaLegajos legajos={filtrados} />
                </div>
            )}
        </section>
    );
}