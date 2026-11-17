import { useEffect, useMemo, useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import { extraerErrorApi, useApiClient } from '../shared/api/useApiClient';
import type { Cohorte, EstadisticasConduccion } from '../types';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
);

export default function PanelConduccion() {
    const { solicitar, descargarArchivo } = useApiClient();

    const [cohortes, setCohortes] = useState<Cohorte[]>([]);
    const [cohorteSeleccionada, setCohorteSeleccionada] = useState('Todas');
    const [carreraSeleccionada, setCarreraSeleccionada] = useState('Todas');
    const [estadisticas, setEstadisticas] = useState<EstadisticasConduccion | null>(null);
    const [cargando, setCargando] = useState(true);
    const [exportando, setExportando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        document.title = 'Panel de Conducción | Sistema de Posgrado';
    }, []);

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
                // Mantener lista vacía si no se pudieron obtener cohortes
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
                const params = new URLSearchParams();
                if (cohorteSeleccionada !== 'Todas') params.set('cohorte_id', cohorteSeleccionada);
                if (carreraSeleccionada !== 'Todas') params.set('carrera', carreraSeleccionada);
                const qs = params.toString() ? `?${params.toString()}` : '';

                const resp = await solicitar(`/graduacion/estadisticas${qs}`);
                if (!resp.ok) {
                    throw new Error(await extraerErrorApi(resp, 'No se pudieron cargar las estadísticas.'));
                }
                const datos: EstadisticasConduccion = await resp.json();
                if (!cancelado) {
                    setEstadisticas(datos);
                    setError(null);
                }
            } catch (err) {
                if (!cancelado) {
                    setError(err instanceof Error ? err.message : 'No se pudieron cargar las métricas.');
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
    }, [carreraSeleccionada, cohorteSeleccionada, solicitar]);

    const chartData = useMemo(() => {
        const porCohorte = estadisticas?.por_cohorte ?? [];
        return {
            labels: porCohorte.map((item) => `${item.cohorte_nombre} (${item.anio})`),
            datasets: [
                {
                    label: 'Inscriptos por cohorte',
                    data: porCohorte.map((item) => item.total_inscriptos),
                    borderColor: '#2a3441',
                    backgroundColor: 'rgba(42, 52, 65, 0.08)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2,
                    pointBackgroundColor: '#2a3441',
                    pointRadius: 4,
                },
            ],
        };
    }, [estadisticas]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { precision: 0 },
                grid: { color: '#f1f5f9' },
            },
            x: {
                grid: { display: false },
            },
        },
    };

    const handleExportar = async () => {
        setExportando(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (cohorteSeleccionada !== 'Todas') params.set('cohorte_id', cohorteSeleccionada);
            if (carreraSeleccionada !== 'Todas') params.set('carrera', carreraSeleccionada);
            const qs = params.toString() ? `?${params.toString()}` : '';
            await descargarArchivo(`/legajos/exportar${qs}`, 'reporte-inscriptos.xlsx');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo exportar el reporte.');
        } finally {
            setExportando(false);
        }
    };

    return (
        <div className="flex flex-col flex-grow bg-white font-sans text-slate-800 p-8">
            <main className="max-w-5xl mx-auto w-full flex-grow flex flex-col">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold mb-2">Panel de Conducción</h1>
                    <h2 className="text-xl text-slate-500">Estadísticas y Reportes Académicos</h2>
                </div>

                {error && (
                    <div className="mb-6 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">
                        {error}
                    </div>
                )}

                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div>
                        <label className="block text-sm font-bold mb-2">Cohorte</label>
                        <select
                            value={cohorteSeleccionada}
                            onChange={(e) => setCohorteSeleccionada(e.target.value)}
                            className="w-full border border-slate-300 rounded p-2 text-slate-600 outline-none focus:border-slate-500 appearance-none bg-white cursor-pointer"
                        >
                            <option value="Todas">Todas</option>
                            {cohortes.map((cohorte) => (
                                <option key={cohorte.id} value={cohorte.id}>
                                    {cohorte.nombre} ({cohorte.anio})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2">Carrera</label>
                        <select
                            value={carreraSeleccionada}
                            onChange={(e) => setCarreraSeleccionada(e.target.value)}
                            className="w-full border border-slate-300 rounded p-2 text-slate-600 outline-none focus:border-slate-500 appearance-none bg-white cursor-pointer"
                        >
                            <option value="Todas">Todas las carreras</option>
                            <option value="Especialización">Especialización</option>
                            <option value="Maestría">Maestría</option>
                            <option value="Doctorado">Doctorado</option>
                        </select>
                    </div>
                </div>

                {/* 5 Métricas Requeridas (RF-REP-001) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    <div className="border border-slate-200 rounded-lg p-5 flex flex-col items-center justify-center shadow-sm text-center">
                        <span className="text-xs font-bold text-slate-500 mb-2 uppercase">Total Inscriptos</span>
                        <span className="text-4xl font-extrabold text-[#2a3441]">
                            {cargando ? '...' : (estadisticas?.total_inscriptos ?? 0)}
                        </span>
                    </div>
                    <div className="border border-slate-200 rounded-lg p-5 flex flex-col items-center justify-center shadow-sm text-center">
                        <span className="text-xs font-bold text-slate-500 mb-2 uppercase">Tasa de Retención</span>
                        <span className="text-4xl font-extrabold text-[#2a3441]">
                            {cargando ? '...' : `${estadisticas?.tasa_retencion ?? 0}%`}
                        </span>
                    </div>
                    <div className="border border-slate-200 rounded-lg p-5 flex flex-col items-center justify-center shadow-sm text-center">
                        <span className="text-xs font-bold text-slate-500 mb-2 uppercase">Prom. Graduación</span>
                        <span className="text-3xl font-extrabold text-[#2a3441]">
                            {cargando
                                ? '...'
                                : estadisticas?.promedio_tiempo_graduacion_dias !== null && estadisticas?.promedio_tiempo_graduacion_dias !== undefined
                                    ? `${estadisticas.promedio_tiempo_graduacion_dias} d`
                                    : 'N/D'}
                        </span>
                    </div>
                    <div className="border border-slate-200 rounded-lg p-5 flex flex-col items-center justify-center shadow-sm text-center">
                        <span className="text-xs font-bold text-slate-500 mb-2 uppercase">En Riesgo (Rojo)</span>
                        <span className="text-4xl font-extrabold text-red-700">
                            {cargando ? '...' : (estadisticas?.estudiantes_en_riesgo ?? 0)}
                        </span>
                    </div>
                    <div className="border border-slate-200 rounded-lg p-5 flex flex-col items-center justify-center shadow-sm text-center">
                        <span className="text-xs font-bold text-slate-500 mb-2 uppercase">Desgranamiento</span>
                        <span className="text-4xl font-extrabold text-[#2a3441]">
                            {cargando ? '...' : `${estadisticas?.desgranamiento ?? 0}%`}
                        </span>
                    </div>
                </div>

                {/* Gráfico Real con Chart.js */}
                <div className="border border-slate-200 rounded-lg p-6 shadow-sm mb-8">
                    <h3 className="text-sm font-bold mb-6">Inscriptos por cohorte</h3>
                    <div className="h-64 w-full">
                        <Line data={chartData} options={chartOptions} />
                    </div>
                </div>

                {/* Desglose por cohorte (Inscriptos, Retención, Desgranamiento) */}
                <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-sm mb-8">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#2a3441] text-white text-xs uppercase font-bold">
                            <tr>
                                <th className="p-3">Cohorte</th>
                                <th className="p-3 text-center">Inscriptos</th>
                                <th className="p-3 text-center">Activos</th>
                                <th className="p-3 text-center">Graduados</th>
                                <th className="p-3 text-center">Retención</th>
                                <th className="p-3 text-center">Desgranamiento</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {(estadisticas?.por_cohorte ?? []).length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-6 text-center text-slate-500">
                                        No hay datos para los filtros seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                estadisticas?.por_cohorte.map((item) => (
                                    <tr key={item.cohorte_id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="p-3 font-medium">{item.cohorte_nombre} ({item.anio})</td>
                                        <td className="p-3 text-center">{item.total_inscriptos}</td>
                                        <td className="p-3 text-center">{item.activos}</td>
                                        <td className="p-3 text-center">{item.graduados}</td>
                                        <td className="p-3 text-center font-semibold text-green-700">{item.tasa_retencion}%</td>
                                        <td className="p-3 text-center font-semibold text-amber-700">{item.desgranamiento}%</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Botón de exportación */}
                <div className="flex justify-end mt-auto">
                    <button
                        type="button"
                        disabled={exportando}
                        onClick={() => void handleExportar()}
                        className="px-8 py-2 border-2 border-slate-800 rounded font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        {exportando ? 'Exportando...' : 'Exportar'}
                    </button>
                </div>
            </main>
        </div>
    );
}
