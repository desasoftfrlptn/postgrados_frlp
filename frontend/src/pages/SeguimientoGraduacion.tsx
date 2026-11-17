import { useCallback, useEffect, useState } from 'react';

import { extraerErrorApi, useApiClient } from '../shared/api/useApiClient';
import type {
    Cohorte,
    EstadoSemaforo,
    EstudianteEnRiesgo,
    LegajoListado,
    PlanGraduacion,
    RecalculoSemaforosRespuesta,
    SemaforoGraduacion,
    TipoCarrera,
    TrabajoFinal,
} from '../types';

function badgeSemaforo(estado: EstadoSemaforo): string {
    switch (estado) {
        case 'VERDE':
            return 'bg-green-100 text-green-800 border-green-300';
        case 'AMARILLO':
            return 'bg-amber-100 text-amber-800 border-amber-300';
        case 'ROJO':
            return 'bg-red-100 text-red-800 border-red-300';
        default:
            return 'bg-slate-100 text-slate-600 border-slate-300';
    }
}

export default function SeguimientoGraduacion() {
    const { solicitar, descargarArchivo } = useApiClient();

    const [cohortes, setCohortes] = useState<Cohorte[]>([]);
    const [planes, setPlanes] = useState<PlanGraduacion[]>([]);
    const [planCohorteId, setPlanCohorteId] = useState('');
    const [planCarrera, setPlanCarrera] = useState<TipoCarrera>('Especialización');

    const [enRiesgo, setEnRiesgo] = useState<EstudianteEnRiesgo[]>([]);
    const [activos, setActivos] = useState<LegajoListado[]>([]);
    const [legajoSeleccionadoId, setLegajoSeleccionadoId] = useState('');
    const [semaforos, setSemaforos] = useState<SemaforoGraduacion[]>([]);
    const [trabajosFinales, setTrabajosFinales] = useState<TrabajoFinal[]>([]);

    const [cargando, setCargando] = useState(true);
    const [recalculando, setRecalculando] = useState(false);
    const [exportando, setExportando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mensaje, setMensaje] = useState<string | null>(null);

    useEffect(() => {
        document.title = 'Seguimiento de Graduación | Sistema de Posgrado';
    }, []);

    const cargarDatosIniciales = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            const [respCohortes, respPlanes, respRiesgo, respActivos] = await Promise.all([
                solicitar('/cohortes/gestion'),
                solicitar('/graduacion/planes'),
                solicitar('/graduacion/en-riesgo?limit=100'),
                solicitar('/legajos?estado=Activo'),
            ]);

            if (respCohortes.ok) {
                const listaCohortes: Cohorte[] = await respCohortes.json();
                setCohortes(listaCohortes);
                if (listaCohortes.length > 0 && !planCohorteId) {
                    setPlanCohorteId(listaCohortes[0].id);
                }
            }
            if (respPlanes.ok) {
                setPlanes(await respPlanes.json());
            }
            if (!respRiesgo.ok) {
                throw new Error(await extraerErrorApi(respRiesgo, 'No se pudo cargar el listado de riesgo.'));
            }
            setEnRiesgo(await respRiesgo.json());
            if (respActivos.ok) {
                setActivos(await respActivos.json());
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar datos de graduación.');
        } finally {
            setCargando(false);
        }
    }, [planCohorteId, solicitar]);

    useEffect(() => {
        let cancelado = false;
        const ejecutar = async () => {
            try {
                const [respCohortes, respPlanes, respRiesgo, respActivos] = await Promise.all([
                    solicitar('/cohortes/gestion'),
                    solicitar('/graduacion/planes'),
                    solicitar('/graduacion/en-riesgo?limit=100'),
                    solicitar('/legajos?estado=Activo'),
                ]);

                if (cancelado) return;
                if (respCohortes.ok) {
                    const listaCohortes: Cohorte[] = await respCohortes.json();
                    setCohortes(listaCohortes);
                    if (listaCohortes.length > 0 && !planCohorteId) {
                        setPlanCohorteId(listaCohortes[0].id);
                    }
                }
                if (respPlanes.ok) {
                    setPlanes(await respPlanes.json());
                }
                if (!respRiesgo.ok) {
                    throw new Error(await extraerErrorApi(respRiesgo, 'No se pudo cargar el listado de riesgo.'));
                }
                setEnRiesgo(await respRiesgo.json());
                if (respActivos.ok) {
                    setActivos(await respActivos.json());
                }
                setError(null);
            } catch (err) {
                if (!cancelado) {
                    setError(err instanceof Error ? err.message : 'Error al cargar datos de graduación.');
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
    }, [planCohorteId, solicitar]);

    const cargarDetalleLegajo = useCallback(async (id: string) => {
        if (!id) {
            setSemaforos([]);
            setTrabajosFinales([]);
            return;
        }
        setError(null);
        try {
            const [respSem, respTf] = await Promise.all([
                solicitar(`/legajos/${id}/semaforo`),
                solicitar(`/legajos/${id}/trabajo-final`),
            ]);
            if (!respSem.ok) {
                throw new Error(await extraerErrorApi(respSem, 'No se pudo consultar el semáforo del legajo.'));
            }
            setSemaforos(await respSem.json());
            if (respTf.ok) {
                setTrabajosFinales(await respTf.json());
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo consultar el detalle del estudiante.');
        }
    }, [solicitar]);

    useEffect(() => {
        let cancelado = false;
        const ejecutar = async () => {
            if (!legajoSeleccionadoId) return;
            try {
                const [respSem, respTf] = await Promise.all([
                    solicitar(`/legajos/${legajoSeleccionadoId}/semaforo`),
                    solicitar(`/legajos/${legajoSeleccionadoId}/trabajo-final`),
                ]);
                if (cancelado) return;
                if (!respSem.ok) {
                    throw new Error(await extraerErrorApi(respSem, 'No se pudo consultar el semáforo del legajo.'));
                }
                setSemaforos(await respSem.json());
                if (respTf.ok) {
                    setTrabajosFinales(await respTf.json());
                }
                setError(null);
            } catch (err) {
                if (!cancelado) {
                    setError(err instanceof Error ? err.message : 'No se pudo consultar el detalle del estudiante.');
                }
            }
        };
        void ejecutar();
        return () => {
            cancelado = true;
        };
    }, [legajoSeleccionadoId, solicitar]);

    const handleConfirmarPlan = async () => {
        if (!planCohorteId) return;
        setError(null);
        setMensaje(null);
        try {
            const resp = await solicitar('/graduacion/planes/confirmar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cohorte_id: planCohorteId,
                    carrera: planCarrera,
                    confirmar: true,
                }),
            });
            if (!resp.ok) {
                throw new Error(await extraerErrorApi(resp, 'No se pudo confirmar el plan de graduación.'));
            }
            setMensaje(`Plan de ${planCarrera} confirmado correctamente.`);
            await cargarDatosIniciales();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo confirmar el plan.');
        }
    };

    const handleRecalcular = async () => {
        setRecalculando(true);
        setError(null);
        setMensaje(null);
        try {
            const resp = await solicitar('/graduacion/recalcular', { method: 'POST' });
            if (!resp.ok) {
                throw new Error(await extraerErrorApi(resp, 'No se pudo recalcular los semáforos.'));
            }
            const res: RecalculoSemaforosRespuesta = await resp.json();
            setMensaje(
                `Recálculo completado: ${res.cambios} cambio(s), ${res.alertas_enviadas} alerta(s) enviada(s), ${res.alertas_pendientes} pendiente(s).`,
            );
            await cargarDatosIniciales();
            if (legajoSeleccionadoId) {
                await cargarDetalleLegajo(legajoSeleccionadoId);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo recalcular los semáforos.');
        } finally {
            setRecalculando(false);
        }
    };

    const handleMarcarVerde = async (carrera: TipoCarrera) => {
        if (!legajoSeleccionadoId) return;
        setError(null);
        setMensaje(null);
        try {
            const resp = await solicitar(`/legajos/${legajoSeleccionadoId}/semaforo`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ carrera, estado: 'VERDE' }),
            });
            if (!resp.ok) {
                throw new Error(await extraerErrorApi(resp, 'No se pudo actualizar el semáforo a VERDE.'));
            }
            setMensaje(`Semáforo de ${carrera} marcado manualmente en VERDE.`);
            await cargarDatosIniciales();
            await cargarDetalleLegajo(legajoSeleccionadoId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo actualizar el semáforo.');
        }
    };

    const handleExportarRiesgo = async () => {
        setExportando(true);
        setError(null);
        try {
            await descargarArchivo('/graduacion/en-riesgo/exportar', 'estudiantes-en-riesgo.xlsx');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo exportar la nómina en riesgo.');
        } finally {
            setExportando(false);
        }
    };

    return (
        <div className="flex flex-col flex-grow bg-white font-sans text-slate-800 p-8">
            <main className="max-w-6xl mx-auto w-full flex-grow space-y-8">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold mb-1">Seguimiento de Graduación</h1>
                        <p className="text-slate-500">Semáforos de riesgo académico, planes confirmados y trabajos finales</p>
                    </div>
                    <button
                        type="button"
                        disabled={recalculando}
                        onClick={() => void handleRecalcular()}
                        className="bg-[#2a3441] text-white px-4 py-2 rounded text-sm font-semibold hover:bg-slate-700 disabled:opacity-50"
                    >
                        {recalculando ? 'Recalculando...' : 'Recalcular semáforos y enviar alertas'}
                    </button>
                </div>

                {error && (
                    <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">
                        {error}
                    </div>
                )}
                {mensaje && (
                    <div className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800" role="status">
                        {mensaje}
                    </div>
                )}

                {/* Confirmación de planes */}
                <section className="border border-slate-200 rounded-lg p-5 bg-slate-50">
                    <h2 className="font-bold text-sm uppercase text-slate-600 mb-3">Planes de seminarios por cohorte</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-600">Cohorte</label>
                            <select value={planCohorteId} onChange={(e) => setPlanCohorteId(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm bg-white">
                                {cohortes.map((c) => (
                                    <option key={c.id} value={c.id}>{c.nombre} ({c.anio})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-slate-600">Carrera</label>
                            <select value={planCarrera} onChange={(e) => setPlanCarrera(e.target.value as TipoCarrera)} className="w-full border border-slate-300 rounded p-2 text-sm bg-white">
                                <option value="Especialización">Especialización</option>
                                <option value="Maestría">Maestría</option>
                                <option value="Doctorado">Doctorado</option>
                            </select>
                        </div>
                        <button type="button" onClick={() => void handleConfirmarPlan()} className="border-2 border-slate-800 rounded px-4 py-2 text-sm font-bold hover:bg-white">
                            Confirmar Plan
                        </button>
                    </div>
                    {planes.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {planes.map((plan) => (
                                <span
                                    key={plan.id}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${plan.confirmado ? 'bg-green-50 text-green-800 border-green-300' : 'bg-amber-50 text-amber-800 border-amber-300'}`}
                                >
                                    {plan.carrera} · {plan.confirmado ? 'Confirmado' : 'Pendiente de confirmación'}
                                </span>
                            ))}
                        </div>
                    )}
                </section>

                {/* Estudiantes en Riesgo (Semáforo Rojo) */}
                <section className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                        <h2 className="font-bold text-lg">Alertas de Riesgo Académico (Semáforo Rojo)</h2>
                        <button
                            type="button"
                            disabled={exportando}
                            onClick={() => void handleExportarRiesgo()}
                            className="bg-[#2a3441] text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-700 disabled:opacity-50"
                        >
                            {exportando ? 'Exportando...' : 'Exportar Excel'}
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#2a3441] text-white text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-3">Estudiante</th>
                                    <th className="p-3">Carrera</th>
                                    <th className="p-3 text-center">Seminarios adeudados</th>
                                    <th className="p-3 text-center">Días sin avance</th>
                                    <th className="p-3 text-center">Días en rojo</th>
                                    <th className="p-3">Motivo</th>
                                    <th className="p-3 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {cargando ? (
                                    <tr><td colSpan={7} className="p-6 text-center text-slate-500">Cargando alertas...</td></tr>
                                ) : enRiesgo.length === 0 ? (
                                    <tr><td colSpan={7} className="p-6 text-center text-slate-500">No hay estudiantes en estado ROJO.</td></tr>
                                ) : (
                                    enRiesgo.map((est) => (
                                        <tr key={`${est.legajo_id}-${est.carrera}`} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="p-3 font-medium">{est.apellido}, {est.nombre}</td>
                                            <td className="p-3">{est.carrera}</td>
                                            <td className="p-3 text-center">{est.seminarios_adeudados}</td>
                                            <td className="p-3 text-center">{est.dias_sin_avance}</td>
                                            <td className="p-3 text-center font-bold text-red-700">{est.dias_en_rojo}</td>
                                            <td className="p-3 text-xs text-slate-600">{est.motivo}</td>
                                            <td className="p-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => setLegajoSeleccionadoId(est.legajo_id)}
                                                    className="border border-slate-300 rounded px-2 py-1 text-xs font-semibold hover:bg-slate-100"
                                                >
                                                    Ver semáforo
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Consulta de semáforo y trabajos finales por legajo */}
                <section className="border border-slate-200 rounded-lg p-5 space-y-4">
                    <div className="flex flex-wrap justify-between items-end gap-4">
                        <div className="w-full md:w-1/2">
                            <label className="block text-xs font-bold mb-1 uppercase text-slate-600">
                                Consultar estudiante activo
                            </label>
                            <select
                                value={legajoSeleccionadoId}
                                onChange={(e) => setLegajoSeleccionadoId(e.target.value)}
                                className="w-full border border-slate-300 rounded p-2 text-sm bg-white"
                            >
                                <option value="">Seleccioná un legajo activo...</option>
                                {activos.map((l) => (
                                    <option key={l.id} value={l.id}>
                                        {l.apellido}, {l.nombre} — DNI {l.dni} ({l.carreras.join(', ')})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {legajoSeleccionadoId && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                            <div className="space-y-3">
                                <h3 className="font-bold text-sm uppercase text-slate-600">Estado de Semáforos</h3>
                                {semaforos.map((sem) => (
                                    <div key={sem.carrera} className="border border-slate-200 rounded p-4 flex justify-between items-start gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold">{sem.carrera}</span>
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${badgeSemaforo(sem.estado)}`}>
                                                    {sem.estado}
                                                </span>
                                            </div>
                                            {sem.motivo && <p className="text-xs text-slate-600">{sem.motivo}</p>}
                                            {sem.seminarios_adeudados !== null && (
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Seminarios adeudados: {sem.seminarios_adeudados} · Días sin avance: {sem.dias_sin_avance ?? 0}
                                                </p>
                                            )}
                                        </div>
                                        {sem.estado !== 'VERDE' && sem.estado !== 'SIN_DATOS' && sem.estado !== 'SIN_EVALUAR' && (
                                            <button
                                                type="button"
                                                onClick={() => void handleMarcarVerde(sem.carrera)}
                                                className="border border-green-700 text-green-800 rounded px-2.5 py-1 text-xs font-bold hover:bg-green-50"
                                            >
                                                Marcar VERDE
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-bold text-sm uppercase text-slate-600">Trabajos Finales / Tesis</h3>
                                {trabajosFinales.length === 0 ? (
                                    <p className="text-sm text-slate-500 border border-slate-200 rounded p-4">
                                        No hay trabajos finales registrados por CPR para este legajo.
                                    </p>
                                ) : (
                                    trabajosFinales.map((tf) => (
                                        <div key={tf.id} className="border border-slate-200 rounded p-4 text-sm space-y-1">
                                            <div className="font-bold">{tf.tipo}: {tf.titulo}</div>
                                            <div className="text-xs text-slate-600">
                                                Director/a: {tf.director_nombre} ({tf.director_email})
                                                {tf.codirector ? ` · Codirector/a: ${tf.codirector}` : ''}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                Resolución: {tf.numero_resolucion} · Aprobación CPR: {tf.fecha_aprobacion_cpr}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

