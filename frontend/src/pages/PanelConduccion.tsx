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
import type { Cohorte, EstudianteEnRiesgo, LegajoListado } from '../types';

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

const ESTADOS_ORDENADOS = [
    'Pendiente',
    'En Revisión',
    'Observado',
    'Completado',
    'Activo',
    'En Riesgo',
    'Graduado',
];

export default function PanelConduccion() {
    const { solicitar, descargarArchivo } = useApiClient();

    const [cohortes, setCohortes] = useState<Cohorte[]>([]);
    const [cohorteSeleccionada, setCohorteSeleccionada] = useState('Todas');
    const [carreraSeleccionada, setCarreraSeleccionada] = useState('Todas');
    const [legajos, setLegajos] = useState<LegajoListado[]>([]);
    const [enRiesgo, setEnRiesgo] = useState<EstudianteEnRiesgo[]>([]);
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

                const [respLegajos, respRiesgo] = await Promise.all([
                    solicitar(`/legajos${qs}`),
                    solicitar('/graduacion/en-riesgo?limit=500'),
                ]);

                if (!respLegajos.ok) {
                    throw new Error(await extraerErrorApi(respLegajos, 'No se pudieron cargar los legajos.'));
                }
                if (!respRiesgo.ok) {
                    throw new Error(await extraerErrorApi(respRiesgo, 'No se pudieron cargar los estudiantes en riesgo.'));
                }

                const datosLegajos: LegajoListado[] = await respLegajos.json();
                const datosRiesgo: EstudianteEnRiesgo[] = await respRiesgo.json();
                if (!cancelado) {
                    setLegajos(datosLegajos);
                    setEnRiesgo(datosRiesgo);
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

    const totalInscriptos = legajos.length;
    const graduados = useMemo(
        () => legajos.filter((legajo) => legajo.estado === 'Graduado').length,
        [legajos],
    );
    const estudiantesEnRiesgo = useMemo(() => {
        const filtrados = carreraSeleccionada === 'Todas'
            ? enRiesgo
            : enRiesgo.filter((item) => item.carrera === carreraSeleccionada);
        if (cohorteSeleccionada === 'Todas') {
            return filtrados.length;
        }
        const idsCohorte = new Set(legajos.map((item) => item.id));
        return filtrados.filter((item) => idsCohorte.has(item.legajo_id)).length;
    }, [carreraSeleccionada, cohorteSeleccionada, enRiesgo, legajos]);

    const chartData = useMemo(() => {
        const conteoPorEstado = new Map<string, number>();
        for (const estado of ESTADOS_ORDENADOS) {
            conteoPorEstado.set(estado, 0);
        }
        for (const legajo of legajos) {
            conteoPorEstado.set(legajo.estado, (conteoPorEstado.get(legajo.estado) ?? 0) + 1);
        }
        return {
            labels: ESTADOS_ORDENADOS,
            datasets: [
                {
                    label: 'Legajos',
                    data: ESTADOS_ORDENADOS.map((estado) => conteoPorEstado.get(estado) ?? 0),
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
    }, [legajos]);

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
            <main className="max-w-4xl mx-auto w-full flex-grow flex flex-col">
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

                {/* Indicadores dinámicos */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="border border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center shadow-sm">
                        <span className="text-sm font-bold text-slate-500 mb-2">Total Inscriptos</span>
                        <span className="text-5xl font-extrabold text-[#2a3441]">
                            {cargando ? '...' : totalInscriptos}
                        </span>
                    </div>
                    <div className="border border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center shadow-sm">
                        <span className="text-sm font-bold text-slate-500 mb-2">Graduados</span>
                        <span className="text-5xl font-extrabold text-[#2a3441]">
                            {cargando ? '...' : graduados}
                        </span>
                    </div>
                    <div className="border border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center shadow-sm">
                        <span className="text-sm font-bold text-slate-500 mb-2">Estudiantes en Riesgo</span>
                        <span className="text-5xl font-extrabold text-[#2a3441]">
                            {cargando ? '...' : estudiantesEnRiesgo}
                        </span>
                    </div>
                </div>

                {/* Gráfico Real con Chart.js */}
                <div className="border border-slate-200 rounded-lg p-6 shadow-sm mb-12">
                    <h3 className="text-sm font-bold mb-6">Distribución de legajos por estado</h3>
                    <div className="h-64 w-full">
                        <Line data={chartData} options={chartOptions} />
                    </div>
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
