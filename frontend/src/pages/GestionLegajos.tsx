import { useCallback, useEffect, useState } from 'react';

import { extraerErrorApi, useApiClient } from '../shared/api/useApiClient';
import type {
    AccionWorkflowLegajo,
    Cohorte,
    EstadoLegajo,
    LegajoDetalle,
    LegajoEstadoRespuesta,
    LegajoListado,
} from '../types';

const ACCIONES_POR_ESTADO: Partial<Record<EstadoLegajo, Array<{ accion: AccionWorkflowLegajo; etiqueta: string }>>> = {
    Pendiente: [{ accion: 'REVISAR', etiqueta: 'Pasar a En Revisión' }],
    'En Revisión': [
        { accion: 'APROBAR', etiqueta: 'Aprobar legajo' },
        { accion: 'OBSERVAR', etiqueta: 'Observar legajo' },
        { accion: 'RECHAZAR', etiqueta: 'Rechazar legajo' },
    ],
    Completado: [{ accion: 'MATRICULAR', etiqueta: 'Matricular (Activo)' }],
    Activo: [{ accion: 'DAR_DE_BAJA', etiqueta: 'Dar de baja' }],
    'En Riesgo': [{ accion: 'DAR_DE_BAJA', etiqueta: 'Dar de baja' }],
};

function badgeEstado(estado: EstadoLegajo): string {
    switch (estado) {
        case 'Pendiente':
            return 'bg-slate-200 text-slate-700';
        case 'En Revisión':
            return 'bg-blue-100 text-blue-700';
        case 'Observado':
        case 'Rechazado':
        case 'Vencido':
            return 'bg-red-100 text-red-700';
        case 'Completado':
            return 'bg-green-100 text-green-700';
        case 'Activo':
        case 'Graduado':
            return 'bg-teal-100 text-teal-700';
        case 'En Riesgo':
            return 'bg-amber-100 text-amber-800';
        case 'Baja':
        default:
            return 'bg-stone-200 text-stone-700';
    }
}

export default function GestionLegajos() {
    const { solicitar, descargarArchivo } = useApiClient();

    const [cohortes, setCohortes] = useState<Cohorte[]>([]);
    const [legajos, setLegajos] = useState<LegajoListado[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mensajeExito, setMensajeExito] = useState<string | null>(null);
    const [exportando, setExportando] = useState(false);

    const [busqueda, setBusqueda] = useState('');
    const [busquedaDebounced, setBusquedaDebounced] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('Todos');
    const [filtroCohorte, setFiltroCohorte] = useState('Todas');
    const [filtroCarrera, setFiltroCarrera] = useState('Todas');
    const [filtroBeca, setFiltroBeca] = useState('Todos');

    const [observacionModal, setObservacionModal] = useState<{ legajo: LegajoListado; comentario: string } | null>(null);
    const [detalleLegajo, setDetalleLegajo] = useState<LegajoDetalle | null>(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);
    const [procesandoId, setProcesandoId] = useState<string | null>(null);

    useEffect(() => {
        document.title = 'Gestión de Legajos | Sistema de Posgrado';
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setBusquedaDebounced(busqueda.trim());
        }, 250);
        return () => window.clearTimeout(timer);
    }, [busqueda]);

    const construirQuery = useCallback(() => {
        const params = new URLSearchParams();
        if (filtroEstado !== 'Todos') params.set('estado', filtroEstado);
        if (filtroCohorte !== 'Todas') params.set('cohorte_id', filtroCohorte);
        if (filtroCarrera !== 'Todas') params.set('carrera', filtroCarrera);
        if (filtroBeca === 'Sí') params.set('tiene_beca', 'true');
        if (filtroBeca === 'No') params.set('tiene_beca', 'false');
        if (/^\d{7,8}$/.test(busquedaDebounced)) {
            params.set('dni', busquedaDebounced);
        } else if (busquedaDebounced.length >= 3) {
            params.set('apellido', busquedaDebounced);
        }
        const qs = params.toString();
        return qs ? `?${qs}` : '';
    }, [busquedaDebounced, filtroBeca, filtroCarrera, filtroCohorte, filtroEstado]);

    const cargarLegajos = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            const resp = await solicitar(`/legajos${construirQuery()}`);
            if (!resp.ok) {
                throw new Error(await extraerErrorApi(resp, 'No se pudieron cargar los legajos.'));
            }
            const datos: LegajoListado[] = await resp.json();
            setLegajos(datos);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudieron cargar los legajos.');
        } finally {
            setCargando(false);
        }
    }, [construirQuery, solicitar]);

    useEffect(() => {
        let cancelado = false;
        const ejecutar = async () => {
            try {
                const resp = await solicitar('/cohortes/gestion');
                if (resp.ok && !cancelado) {
                    const datos: Cohorte[] = await resp.json();
                    setCohortes(datos);
                }
            } catch {
                // Si falla la carga de cohortes, se mantiene lista vacía
            }
        };
        void ejecutar();
        return () => {
            cancelado = true;
        };
    }, [solicitar]);

    useEffect(() => {
        let cancelado = false;
        const ejecutar = async () => {
            try {
                const resp = await solicitar(`/legajos${construirQuery()}`);
                if (!resp.ok) {
                    throw new Error(await extraerErrorApi(resp, 'No se pudieron cargar los legajos.'));
                }
                const datos: LegajoListado[] = await resp.json();
                if (!cancelado) {
                    setLegajos(datos);
                    setError(null);
                }
            } catch (err) {
                if (!cancelado) {
                    setError(err instanceof Error ? err.message : 'No se pudieron cargar los legajos.');
                }
            } finally {
                if (!cancelado) {
                    setCargando(false);
                }
            }
        };
        void ejecutar();
        return () => {
            cancelado = true;
        };
    }, [construirQuery, solicitar]);

    const ejecutarTransicion = async (legajoId: string, accion: AccionWorkflowLegajo, comentario?: string) => {
        setProcesandoId(legajoId);
        setError(null);
        setMensajeExito(null);
        try {
            const body: { accion: AccionWorkflowLegajo; comentario?: string } = { accion };
            if (comentario) body.comentario = comentario;
            const resp = await solicitar(`/legajos/${legajoId}/estado`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!resp.ok) {
                throw new Error(await extraerErrorApi(resp, 'No se pudo actualizar el estado del legajo.'));
            }
            const resultado: LegajoEstadoRespuesta = await resp.json();
            const sufijoNumero = resultado.numero_legajo ? ` · N° ${resultado.numero_legajo}` : '';
            setMensajeExito(`${resultado.mensaje}${sufijoNumero}`);
            setObservacionModal(null);
            await cargarLegajos();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado del legajo.');
        } finally {
            setProcesandoId(null);
        }
    };

    const handleSeleccionAccion = (legajo: LegajoListado, accion: AccionWorkflowLegajo) => {
        if (accion === 'OBSERVAR') {
            setObservacionModal({ legajo, comentario: '' });
            return;
        }
        void ejecutarTransicion(legajo.id, accion);
    };

    const abrirDetalle = async (legajoId: string) => {
        setCargandoDetalle(true);
        setError(null);
        try {
            const resp = await solicitar(`/legajos/${legajoId}`);
            if (!resp.ok) {
                throw new Error(await extraerErrorApi(resp, 'No se pudo obtener el detalle del legajo.'));
            }
            const datos: LegajoDetalle = await resp.json();
            setDetalleLegajo(datos);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo obtener el detalle del legajo.');
        } finally {
            setCargandoDetalle(false);
        }
    };

    const handleExportar = async () => {
        setExportando(true);
        setError(null);
        try {
            await descargarArchivo(`/legajos/exportar${construirQuery()}`, 'legajos.xlsx');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo exportar el Excel.');
        } finally {
            setExportando(false);
        }
    };

    return (
        <div className="flex flex-col flex-grow bg-white font-sans text-slate-800 p-8">
            <main className="max-w-6xl mx-auto w-full flex-grow flex flex-col">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Gestión de Legajos</h1>
                    <h2 className="text-slate-500">Revisión de aspirantes y generación de matrículas</h2>
                </div>

                {error && (
                    <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">
                        {error}
                    </div>
                )}
                {mensajeExito && (
                    <div className="mb-4 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800" role="status">
                        {mensajeExito}
                    </div>
                )}

                {/* Filtros (RF-CORE-004) */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="col-span-1 md:col-span-4 flex flex-wrap gap-4 justify-between items-end mb-2">
                        <div className="w-full md:w-1/3">
                            <label className="block text-xs font-bold mb-1 text-slate-600 uppercase">Buscar (DNI exacto o Apellido ≥ 3 letras)</label>
                            <input
                                type="text"
                                placeholder="Ej: 30456789 o Gonzalez"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-slate-500 bg-white"
                            />
                        </div>
                        <button
                            type="button"
                            disabled={exportando}
                            onClick={() => void handleExportar()}
                            className="bg-[#2a3441] text-white px-4 py-2 rounded text-sm font-semibold hover:bg-slate-700 transition-colors h-fit disabled:opacity-50"
                        >
                            {exportando ? 'Exportando...' : 'Exportar Excel'}
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs font-bold mb-1 text-slate-600 uppercase">Estado</label>
                        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm outline-none bg-white">
                            <option value="Todos">Todos</option>
                            <option value="Pendiente">Pendiente</option>
                            <option value="En Revisión">En Revisión</option>
                            <option value="Observado">Observado</option>
                            <option value="Completado">Completado</option>
                            <option value="Rechazado">Rechazado</option>
                            <option value="Activo">Activo</option>
                            <option value="Vencido">Vencido</option>
                            <option value="Graduado">Graduado</option>
                            <option value="En Riesgo">En Riesgo</option>
                            <option value="Baja">Baja</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 text-slate-600 uppercase">Cohorte</label>
                        <select value={filtroCohorte} onChange={(e) => setFiltroCohorte(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm outline-none bg-white">
                            <option value="Todas">Todas</option>
                            {cohortes.map((cohorte) => (
                                <option key={cohorte.id} value={cohorte.id}>
                                    {cohorte.nombre} ({cohorte.anio})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 text-slate-600 uppercase">Carrera</label>
                        <select value={filtroCarrera} onChange={(e) => setFiltroCarrera(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm outline-none bg-white">
                            <option value="Todas">Todas</option>
                            <option value="Especialización">Especialización</option>
                            <option value="Maestría">Maestría</option>
                            <option value="Doctorado">Doctorado</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 text-slate-600 uppercase">Beca</label>
                        <select value={filtroBeca} onChange={(e) => setFiltroBeca(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm outline-none bg-white">
                            <option value="Todos">Todos</option>
                            <option value="Sí">Sí</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                </div>

                {/* Tabla de Resultados */}
                <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-sm flex-grow">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                        <thead className="bg-[#2a3441] text-white text-xs uppercase font-bold">
                            <tr>
                                <th className="p-3">Aspirante</th>
                                <th className="p-3">DNI</th>
                                <th className="p-3">Carreras</th>
                                <th className="p-3 text-center">Beca</th>
                                <th className="p-3 text-center">Estado</th>
                                <th className="p-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {cargando ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">Cargando legajos...</td>
                                </tr>
                            ) : legajos.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">No se encontraron legajos con los filtros actuales.</td>
                                </tr>
                            ) : (
                                legajos.map((leg) => {
                                    const acciones = ACCIONES_POR_ESTADO[leg.estado] ?? [];
                                    return (
                                        <tr key={leg.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="p-3 font-medium">
                                                {leg.apellido}, {leg.nombre}
                                                {leg.numero_legajo && (
                                                    <span className="block text-xs text-slate-500 font-normal">Legajo: {leg.numero_legajo}</span>
                                                )}
                                            </td>
                                            <td className="p-3">{leg.dni}</td>
                                            <td className="p-3">{leg.carreras.join(', ')}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${leg.solicita_beca ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                                                    {leg.solicita_beca ? `Sí (${leg.tipo_beca ?? 's/d'})` : 'No'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${badgeEstado(leg.estado)}`}>
                                                    {leg.estado}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right space-x-2">
                                                <button
                                                    type="button"
                                                    onClick={() => void abrirDetalle(leg.id)}
                                                    className="border border-slate-300 rounded px-2 py-1 text-xs font-semibold hover:bg-slate-100"
                                                >
                                                    {cargandoDetalle ? '...' : 'Detalle'}
                                                </button>
                                                {acciones.length > 0 && (
                                                    <select
                                                        aria-label={`Acción para ${leg.apellido}, ${leg.nombre}`}
                                                        disabled={procesandoId === leg.id}
                                                        className="border border-slate-300 rounded p-1 text-xs outline-none bg-white cursor-pointer"
                                                        value=""
                                                        onChange={(e) => {
                                                            if (e.target.value) {
                                                                handleSeleccionAccion(leg, e.target.value as AccionWorkflowLegajo);
                                                            }
                                                        }}
                                                    >
                                                        <option value="">Cambiar estado...</option>
                                                        {acciones.map((item) => (
                                                            <option key={item.accion} value={item.accion}>
                                                                {item.etiqueta}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modal de Observación */}
                {observacionModal && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                            <h3 className="text-lg font-bold mb-2">
                                Observar legajo de {observacionModal.legajo.apellido}, {observacionModal.legajo.nombre}
                            </h3>
                            <p className="text-xs text-slate-500 mb-3">
                                Se enviará un correo automático al aspirante con el motivo indicado y un enlace de corrección.
                            </p>
                            <textarea
                                rows={4}
                                value={observacionModal.comentario}
                                onChange={(e) => setObservacionModal({ ...observacionModal, comentario: e.target.value })}
                                placeholder="Ingresá el motivo de la observación..."
                                className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-slate-500 mb-4"
                            />
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setObservacionModal(null)}
                                    className="px-4 py-2 border border-slate-300 rounded text-sm font-semibold hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    disabled={!observacionModal.comentario.trim() || procesandoId === observacionModal.legajo.id}
                                    onClick={() =>
                                        void ejecutarTransicion(
                                            observacionModal.legajo.id,
                                            'OBSERVAR',
                                            observacionModal.comentario.trim(),
                                        )
                                    }
                                    className="px-4 py-2 bg-[#2a3441] text-white rounded text-sm font-semibold hover:bg-slate-700 disabled:opacity-50"
                                >
                                    Confirmar observación
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de Detalle y Documentos */}
                {detalleLegajo && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold">
                                        {detalleLegajo.apellido}, {detalleLegajo.nombre}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        ID: {detalleLegajo.id} {detalleLegajo.numero_legajo ? `· Legajo ${detalleLegajo.numero_legajo}` : ''}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDetalleLegajo(null)}
                                    className="text-slate-500 hover:text-slate-800 font-bold text-lg"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-6 bg-slate-50 p-4 rounded border border-slate-200">
                                <div><span className="font-semibold">DNI:</span> {detalleLegajo.dni}</div>
                                <div><span className="font-semibold">Email:</span> {detalleLegajo.email}</div>
                                <div><span className="font-semibold">Teléfono:</span> {detalleLegajo.telefono_movil}</div>
                                <div><span className="font-semibold">Título de grado:</span> {detalleLegajo.titulo_grado}</div>
                                <div><span className="font-semibold">Carreras:</span> {detalleLegajo.carreras.join(', ')}</div>
                                <div><span className="font-semibold">Estado documental:</span> {detalleLegajo.estado_documental}</div>
                            </div>

                            {detalleLegajo.documentos_faltantes.length > 0 && (
                                <div className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                                    <strong>Documentos faltantes:</strong> {detalleLegajo.documentos_faltantes.join(', ')}
                                </div>
                            )}

                            <h4 className="font-bold text-sm mb-2">Documentos adjuntos ({detalleLegajo.documentos.length})</h4>
                            {detalleLegajo.documentos.length === 0 ? (
                                <p className="text-sm text-slate-500">No hay documentos cargados.</p>
                            ) : (
                                <ul className="divide-y divide-slate-200 border border-slate-200 rounded">
                                    {detalleLegajo.documentos.map((doc) => (
                                        <li key={doc.id} className="p-3 flex justify-between items-center text-sm">
                                            <span>
                                                <strong>{doc.tipo}</strong>
                                                <span className="block text-xs text-slate-500">
                                                    Subido: {new Date(doc.fecha_subida).toLocaleDateString('es-AR')}
                                                </span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => void descargarArchivo(`/documentos/${doc.id}/download`, `${doc.tipo}.pdf`)}
                                                className="border border-slate-300 rounded px-3 py-1 text-xs font-semibold hover:bg-slate-100"
                                            >
                                                Descargar PDF
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
