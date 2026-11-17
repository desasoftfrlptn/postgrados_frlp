import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { extraerErrorApi, guardarBlobComoArchivo, useApiClient } from '../shared/api/useApiClient';
import type {
    Cohorte,
    EnlaceDocente,
    LegajoListado,
    PlanillaSeminario,
    Seminario,
    TipoCarrera,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

function estadoRecordatorio(fechaLimite: string | null): { texto: string; clase: string } {
    if (!fechaLimite) {
        return { texto: 'Sin fecha límite (recordatorios inactivos)', clase: 'bg-slate-100 text-slate-600' };
    }
    const limiteMs = new Date(fechaLimite).getTime();
    const ahoraMs = Date.now();
    const horasRestantes = (limiteMs - ahoraMs) / 3_600_000;
    if (horasRestantes <= 0) {
        return { texto: 'Plazo vencido', clase: 'bg-red-100 text-red-700' };
    }
    if (horasRestantes <= 48) {
        return { texto: 'Recordatorios activos (≤ 48 hs)', clase: 'bg-amber-100 text-amber-800' };
    }
    return { texto: `Programado (${new Date(fechaLimite).toLocaleDateString('es-AR')})`, clase: 'bg-blue-100 text-blue-700' };
}

export default function GestionDocente() {
    const { solicitar } = useApiClient();

    const [cohortes, setCohortes] = useState<Cohorte[]>([]);
    const [filtroCohorte, setFiltroCohorte] = useState('Todas');
    const [seminarios, setSeminarios] = useState<Seminario[]>([]);
    const [seminarioId, setSeminarioId] = useState('');
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mensaje, setMensaje] = useState<string | null>(null);

    // Formulario de creación de seminario
    const [mostrarCrear, setMostrarCrear] = useState(false);
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [nuevaCohorteId, setNuevaCohorteId] = useState('');
    const [nuevoDocenteNombre, setNuevoDocenteNombre] = useState('');
    const [nuevoDocenteEmail, setNuevoDocenteEmail] = useState('');
    const [nuevaFechaFin, setNuevaFechaFin] = useState('');
    const [nuevaCarrera, setNuevaCarrera] = useState<TipoCarrera | ''>('');
    const [nuevoObligatorio, setNuevoObligatorio] = useState(false);

    // Edición de plan y fecha límite
    const [planCarrera, setPlanCarrera] = useState<TipoCarrera>('Especialización');
    const [planObligatorio, setPlanObligatorio] = useState(false);
    const [fechaLimiteInput, setFechaLimiteInput] = useState('');

    // Inscripción de estudiantes
    const [legajosActivos, setLegajosActivos] = useState<LegajoListado[]>([]);
    const [seleccionInscribir, setSeleccionInscribir] = useState<string[]>([]);

    // Enlace y planilla docente
    const [enlaceGenerado, setEnlaceGenerado] = useState<EnlaceDocente | null>(null);
    const [tokenDocente, setTokenDocente] = useState('');
    const [planilla, setPlanilla] = useState<PlanillaSeminario | null>(null);
    const [nuevaFechaClase, setNuevaFechaClase] = useState(() => new Date().toISOString().slice(0, 10));
    const [notasEditadas, setNotasEditadas] = useState<Record<string, string>>({});

    useEffect(() => {
        document.title = 'Gestión Docente | Sistema de Posgrado';
    }, []);

    const seminarioActual = seminarios.find((s) => s.id === seminarioId) ?? null;

    const sincronizarCamposSeminario = useCallback((sem: Seminario | undefined) => {
        if (!sem) return;
        setPlanCarrera(sem.carrera ?? 'Especialización');
        setPlanObligatorio(sem.es_obligatorio);
        setFechaLimiteInput(
            sem.fecha_limite_notas
                ? new Date(sem.fecha_limite_notas).toISOString().slice(0, 16)
                : '',
        );
        setPlanilla(null);
        setEnlaceGenerado(null);
        setSeleccionInscribir([]);
    }, []);

    const cargarSeminarios = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            const qs = filtroCohorte !== 'Todas' ? `?cohorte_id=${filtroCohorte}` : '';
            const resp = await solicitar(`/seminarios${qs}`);
            if (!resp.ok) {
                throw new Error(await extraerErrorApi(resp, 'No se pudieron cargar los seminarios.'));
            }
            const datos: Seminario[] = await resp.json();
            setSeminarios(datos);
            if (datos.length > 0 && !datos.some((s) => s.id === seminarioId)) {
                setSeminarioId(datos[0].id);
                sincronizarCamposSeminario(datos[0]);
            } else if (datos.length === 0) {
                setSeminarioId('');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudieron cargar los seminarios.');
        } finally {
            setCargando(false);
        }
    }, [filtroCohorte, seminarioId, sincronizarCamposSeminario, solicitar]);

    useEffect(() => {
        let cancelado = false;
        const ejecutar = async () => {
            try {
                const resp = await solicitar('/cohortes/gestion');
                if (resp.ok && !cancelado) {
                    const datos: Cohorte[] = await resp.json();
                    setCohortes(datos);
                    if (datos.length > 0 && !nuevaCohorteId) {
                        setNuevaCohorteId(datos[0].id);
                    }
                }
            } catch {
                // Ignorar error de carga inicial
            }
        };
        void ejecutar();
        return () => {
            cancelado = true;
        };
    }, [nuevaCohorteId, solicitar]);

    useEffect(() => {
        let cancelado = false;
        const ejecutar = async () => {
            try {
                const qs = filtroCohorte !== 'Todas' ? `?cohorte_id=${filtroCohorte}` : '';
                const resp = await solicitar(`/seminarios${qs}`);
                if (!resp.ok) {
                    throw new Error(await extraerErrorApi(resp, 'No se pudieron cargar los seminarios.'));
                }
                const datos: Seminario[] = await resp.json();
                if (cancelado) return;
                setSeminarios(datos);
                setError(null);
                if (datos.length > 0 && !datos.some((s) => s.id === seminarioId)) {
                    setSeminarioId(datos[0].id);
                    sincronizarCamposSeminario(datos[0]);
                } else if (datos.length === 0) {
                    setSeminarioId('');
                }
            } catch (err) {
                if (!cancelado) {
                    setError(err instanceof Error ? err.message : 'No se pudieron cargar los seminarios.');
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
    }, [filtroCohorte, seminarioId, sincronizarCamposSeminario, solicitar]);

    useEffect(() => {
        let cancelado = false;
        const cargarActivos = async () => {
            if (!seminarioActual) return;
            try {
                const resp = await solicitar(`/legajos?estado=Activo&cohorte_id=${seminarioActual.cohorte_id}`);
                if (resp.ok && !cancelado) {
                    const datos: LegajoListado[] = await resp.json();
                    setLegajosActivos(datos);
                }
            } catch {
                if (!cancelado) setLegajosActivos([]);
            }
        };
        void cargarActivos();
        return () => {
            cancelado = true;
        };
    }, [seminarioActual, solicitar]);

    const handleCrearSeminario = async (evento: FormEvent) => {
        evento.preventDefault();
        setError(null);
        setMensaje(null);
        try {
            const resp = await solicitar('/seminarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cohorte_id: nuevaCohorteId,
                    nombre: nuevoNombre,
                    docente_nombre: nuevoDocenteNombre,
                    docente_email: nuevoDocenteEmail,
                    fecha_fin_cuatrimestre: nuevaFechaFin,
                    carrera: nuevaCarrera || null,
                    es_obligatorio: nuevoObligatorio,
                }),
            });
            if (!resp.ok) {
                throw new Error(await extraerErrorApi(resp, 'No se pudo crear el seminario.'));
            }
            const creado: Seminario = await resp.json();
            setMensaje(`Seminario "${creado.nombre}" creado correctamente.`);
            setMostrarCrear(false);
            setNuevoNombre('');
            setNuevoDocenteNombre('');
            setNuevoDocenteEmail('');
            setNuevaFechaFin('');
            setNuevoObligatorio(false);
            await cargarSeminarios();
            setSeminarioId(creado.id);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo crear el seminario.');
        }
    };

    const handleActualizarPlan = async () => {
        if (!seminarioActual) return;
        setError(null);
        setMensaje(null);
        try {
            const resp = await solicitar(`/seminarios/${seminarioActual.id}/plan`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ carrera: planCarrera, es_obligatorio: planObligatorio }),
            });
            if (!resp.ok) {
                throw new Error(await extraerErrorApi(resp, 'No se pudo actualizar el plan del seminario.'));
            }
            setMensaje('Plan del seminario actualizado.');
            await cargarSeminarios();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo actualizar el plan del seminario.');
        }
    };

    const handleActualizarFechaLimite = async () => {
        if (!seminarioActual) return;
        setError(null);
        setMensaje(null);
        try {
            const fechaIso = fechaLimiteInput ? new Date(fechaLimiteInput).toISOString() : null;
            const resp = await solicitar(`/seminarios/${seminarioActual.id}/fecha-limite-notas`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fecha_limite_notas: fechaIso }),
            });
            if (!resp.ok) {
                throw new Error(await extraerErrorApi(resp, 'No se pudo actualizar la fecha límite de notas.'));
            }
            setMensaje(
                fechaIso
                    ? 'Fecha límite configurada. El recordatorio automático se enviará dentro de las 48 hs previas.'
                    : 'Fecha límite eliminada.',
            );
            await cargarSeminarios();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo actualizar la fecha límite.');
        }
    };

    const handleInscribirEstudiantes = async () => {
        if (!seminarioActual || seleccionInscribir.length === 0) return;
        setError(null);
        setMensaje(null);
        try {
            const resp = await solicitar(`/seminarios/${seminarioActual.id}/inscripciones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ legajo_ids: seleccionInscribir }),
            });
            if (!resp.ok) {
                throw new Error(await extraerErrorApi(resp, 'No se pudieron inscribir los estudiantes.'));
            }
            setMensaje(`Se inscribieron ${seleccionInscribir.length} estudiante(s) al seminario.`);
            setSeleccionInscribir([]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudieron inscribir los estudiantes.');
        }
    };

    const cargarPlanillaConToken = useCallback(async (idSem: string, token: string) => {
        setError(null);
        try {
            const resp = await fetch(`${API_URL}/seminarios/${idSem}/estudiantes`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            if (!resp.ok) {
                throw new Error(await extraerErrorApi(resp, 'No se pudo cargar la planilla docente.'));
            }
            const datos: PlanillaSeminario = await resp.json();
            setPlanilla(datos);
            const iniciales: Record<string, string> = {};
            for (const est of datos.estudiantes) {
                iniciales[est.legajo_id] = est.nota ?? '';
            }
            setNotasEditadas(iniciales);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo cargar la planilla docente.');
        }
    }, []);

    const handleGenerarEnlace = async () => {
        if (!seminarioActual) return;
        setError(null);
        setMensaje(null);
        try {
            const resp = await solicitar(`/seminarios/${seminarioActual.id}/enlace`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            if (!resp.ok) {
                throw new Error(await extraerErrorApi(resp, 'No se pudo generar el enlace docente.'));
            }
            const datos: EnlaceDocente = await resp.json();
            setEnlaceGenerado(datos);
            setTokenDocente(datos.token);
            setMensaje('Enlace docente generado. Podés abrir la planilla directamente.');
            await cargarPlanillaConToken(seminarioActual.id, datos.token);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo generar el enlace docente.');
        }
    };

    const handleCrearClase = async () => {
        if (!seminarioActual || !tokenDocente) return;
        setError(null);
        try {
            const resp = await fetch(`${API_URL}/seminarios/${seminarioActual.id}/clases`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${tokenDocente}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ fecha: nuevaFechaClase }),
            });
            if (!resp.ok) {
                throw new Error(await extraerErrorApi(resp, 'No se pudo registrar la clase.'));
            }
            await cargarPlanillaConToken(seminarioActual.id, tokenDocente);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo registrar la clase.');
        }
    };

    const handleToggleAsistencia = async (claseId: string, legajoId: string, presente: boolean) => {
        if (!seminarioActual || !tokenDocente) return;
        setError(null);
        try {
            const resp = await fetch(`${API_URL}/seminarios/${seminarioActual.id}/asistencias`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${tokenDocente}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    asistencias: [{ clase_id: claseId, legajo_id: legajoId, presente }],
                }),
            });
            if (!resp.ok) {
                throw new Error(await extraerErrorApi(resp, 'No se pudo guardar la asistencia.'));
            }
            const actualizada: PlanillaSeminario = await resp.json();
            setPlanilla(actualizada);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo guardar la asistencia.');
        }
    };

    const handleGuardarNota = async (legajoId: string) => {
        if (!seminarioActual || !tokenDocente) return;
        const valor = (notasEditadas[legajoId] ?? '').trim();
        const numero = Number(valor);
        if (!valor || Number.isNaN(numero)) {
            setError('Ingresá una nota numérica entre 1 y 10 (hasta 1 decimal).');
            return;
        }
        setError(null);
        try {
            const resp = await fetch(`${API_URL}/seminarios/${seminarioActual.id}/notas`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${tokenDocente}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ notas: [{ legajo_id: legajoId, nota: numero }] }),
            });
            if (!resp.ok) {
                throw new Error(await extraerErrorApi(resp, 'No se pudo guardar la calificación.'));
            }
            const actualizada: PlanillaSeminario = await resp.json();
            setPlanilla(actualizada);
            setMensaje('Calificación guardada.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo guardar la calificación.');
        }
    };

    const handleImportarNotasExcel = async (archivo: File | undefined) => {
        if (!archivo || !seminarioActual || !tokenDocente) return;
        setError(null);
        setMensaje(null);
        try {
            const formData = new FormData();
            formData.append('archivo', archivo);
            const resp = await fetch(`${API_URL}/seminarios/${seminarioActual.id}/importar-notas`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${tokenDocente}` },
                body: formData,
            });
            if (!resp.ok) {
                throw new Error(await extraerErrorApi(resp, 'No se pudieron importar las notas desde Excel.'));
            }
            const actualizada: PlanillaSeminario = await resp.json();
            setPlanilla(actualizada);
            setMensaje('Notas importadas desde Excel correctamente.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudieron importar las notas.');
        }
    };

    const handleExportar = async () => {
        if (!seminarioActual || !tokenDocente) return;
        setError(null);
        try {
            const resp = await fetch(`${API_URL}/seminarios/${seminarioActual.id}/exportar`, {
                headers: { Authorization: `Bearer ${tokenDocente}` },
            });
            if (!resp.ok) {
                throw new Error(await extraerErrorApi(resp, 'No se pudo exportar la planilla.'));
            }
            const blob = await resp.blob();
            guardarBlobComoArchivo(blob, `seminario-${seminarioActual.id}.xlsx`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo exportar la planilla.');
        }
    };

    return (
        <div className="flex flex-col flex-grow bg-white font-sans text-slate-800 p-8">
            <main className="max-w-6xl mx-auto w-full flex-grow flex flex-col">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-1">Gestión Docente y Seminarios</h1>
                        <p className="text-slate-500">Asignación docente, carga horaria, recordatorios y planilla de asistencia</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setMostrarCrear((prev) => !prev)}
                        className="bg-[#2a3441] text-white px-4 py-2 rounded text-sm font-semibold hover:bg-slate-700 transition-colors"
                    >
                        {mostrarCrear ? 'Cerrar formulario' : '+ Nuevo Seminario'}
                    </button>
                </div>

                {error && (
                    <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">
                        {error}
                    </div>
                )}
                {mensaje && (
                    <div className="mb-4 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800" role="status">
                        {mensaje}
                    </div>
                )}

                {mostrarCrear && (
                    <form onSubmit={(e) => void handleCrearSeminario(e)} className="mb-8 bg-slate-50 border border-slate-200 rounded-lg p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold mb-1 uppercase text-slate-600">Cohorte</label>
                            <select value={nuevaCohorteId} onChange={(e) => setNuevaCohorteId(e.target.value)} required className="w-full border border-slate-300 rounded p-2 text-sm bg-white">
                                {cohortes.map((c) => (
                                    <option key={c.id} value={c.id}>{c.nombre} ({c.anio})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 uppercase text-slate-600">Nombre del Seminario</label>
                            <input type="text" required value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm bg-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 uppercase text-slate-600">Fin de cuatrimestre</label>
                            <input type="date" required value={nuevaFechaFin} onChange={(e) => setNuevaFechaFin(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm bg-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 uppercase text-slate-600">Docente</label>
                            <input type="text" required value={nuevoDocenteNombre} onChange={(e) => setNuevoDocenteNombre(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm bg-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 uppercase text-slate-600">Email Docente</label>
                            <input type="email" required value={nuevoDocenteEmail} onChange={(e) => setNuevoDocenteEmail(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm bg-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 uppercase text-slate-600">Carrera (opcional)</label>
                            <select value={nuevaCarrera} onChange={(e) => setNuevaCarrera(e.target.value as TipoCarrera | '')} className="w-full border border-slate-300 rounded p-2 text-sm bg-white">
                                <option value="">Sin especificar</option>
                                <option value="Especialización">Especialización</option>
                                <option value="Maestría">Maestría</option>
                                <option value="Doctorado">Doctorado</option>
                            </select>
                        </div>
                        <div className="md:col-span-3 flex items-center justify-between pt-2">
                            <label className="inline-flex items-center gap-2 text-sm font-medium">
                                <input type="checkbox" checked={nuevoObligatorio} onChange={(e) => setNuevoObligatorio(e.target.checked)} />
                                Seminario obligatorio en el plan de la carrera
                            </label>
                            <button type="submit" className="bg-[#2a3441] text-white px-5 py-2 rounded text-sm font-semibold hover:bg-slate-700">
                                Guardar Seminario
                            </button>
                        </div>
                    </form>
                )}

                {/* Selector de cohorte y seminario */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-xs font-bold mb-1 uppercase text-slate-600">Filtrar por Cohorte</label>
                        <select value={filtroCohorte} onChange={(e) => setFiltroCohorte(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm bg-white">
                            <option value="Todas">Todas</option>
                            {cohortes.map((c) => (
                                <option key={c.id} value={c.id}>{c.nombre} ({c.anio})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 uppercase text-slate-600">Seminario seleccionado</label>
                        <select
                            value={seminarioId}
                            onChange={(e) => {
                                const idElegido = e.target.value;
                                setSeminarioId(idElegido);
                                sincronizarCamposSeminario(seminarios.find((s) => s.id === idElegido));
                            }}
                            disabled={cargando || seminarios.length === 0}
                            className="w-full border border-slate-300 rounded p-2 text-sm bg-white"
                        >
                            {seminarios.length === 0 ? (
                                <option value="">No hay seminarios cargados</option>
                            ) : (
                                seminarios.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.nombre} — {s.docente_nombre}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>
                </div>

                {seminarioActual && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Plan y Recordatorios */}
                        <section className="border border-slate-200 rounded-lg p-5 bg-slate-50 space-y-4">
                            <div className="flex justify-between items-start gap-2">
                                <div>
                                    <h2 className="font-bold text-lg">{seminarioActual.nombre}</h2>
                                    <p className="text-xs text-slate-600">
                                        Docente: {seminarioActual.docente_nombre} ({seminarioActual.docente_email}) · Fin: {seminarioActual.fecha_fin_cuatrimestre}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${estadoRecordatorio(seminarioActual.fecha_limite_notas).clase}`}>
                                    {estadoRecordatorio(seminarioActual.fecha_limite_notas).texto}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-2 border-t border-slate-200">
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-slate-600">Carrera del Plan</label>
                                    <select value={planCarrera} onChange={(e) => setPlanCarrera(e.target.value as TipoCarrera)} className="w-full border border-slate-300 rounded p-2 text-xs bg-white">
                                        <option value="Especialización">Especialización</option>
                                        <option value="Maestría">Maestría</option>
                                        <option value="Doctorado">Doctorado</option>
                                    </select>
                                </div>
                                <label className="inline-flex items-center gap-2 text-xs font-semibold pb-2">
                                    <input type="checkbox" checked={planObligatorio} onChange={(e) => setPlanObligatorio(e.target.checked)} />
                                    Obligatorio
                                </label>
                                <button type="button" onClick={() => void handleActualizarPlan()} className="border border-slate-800 rounded px-3 py-2 text-xs font-bold hover:bg-white">
                                    Actualizar Plan
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-2 border-t border-slate-200">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold mb-1 text-slate-600">Fecha límite de notas (dispara recordatorios ≤ 48h)</label>
                                    <input type="datetime-local" value={fechaLimiteInput} onChange={(e) => setFechaLimiteInput(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-xs bg-white" />
                                </div>
                                <button type="button" onClick={() => void handleActualizarFechaLimite()} className="border border-slate-800 rounded px-3 py-2 text-xs font-bold hover:bg-white">
                                    Guardar Límite
                                </button>
                            </div>
                        </section>

                        {/* Inscripción de Estudiantes y Enlace Docente */}
                        <section className="border border-slate-200 rounded-lg p-5 bg-slate-50 space-y-4">
                            <h3 className="font-bold text-sm uppercase text-slate-600">Inscribir estudiantes activos</h3>
                            <div className="flex gap-2 items-start">
                                <select
                                    multiple
                                    value={seleccionInscribir}
                                    onChange={(e) => setSeleccionInscribir(Array.from(e.target.selectedOptions, (opt) => opt.value))}
                                    className="flex-1 border border-slate-300 rounded p-2 text-xs bg-white h-24"
                                >
                                    {legajosActivos.map((l) => (
                                        <option key={l.id} value={l.id}>
                                            {l.apellido}, {l.nombre} ({l.dni})
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    disabled={seleccionInscribir.length === 0}
                                    onClick={() => void handleInscribirEstudiantes()}
                                    className="bg-[#2a3441] text-white px-3 py-2 rounded text-xs font-semibold hover:bg-slate-700 disabled:opacity-50"
                                >
                                    Inscribir ({seleccionInscribir.length})
                                </button>
                            </div>

                            <div className="pt-2 border-t border-slate-200 space-y-2">
                                <div className="flex flex-wrap justify-between items-center gap-2">
                                    <span className="text-xs font-bold uppercase text-slate-600">Acceso y Planilla Docente</span>
                                    <button type="button" onClick={() => void handleGenerarEnlace()} className="bg-[#2a3441] text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-700">
                                        Generar enlace y abrir planilla
                                    </button>
                                </div>
                                {enlaceGenerado && (
                                    <p className="text-xs bg-white border border-slate-200 rounded p-2 break-all">
                                        <strong>Enlace:</strong> {enlaceGenerado.enlace}
                                    </p>
                                )}
                            </div>
                        </section>
                    </div>
                )}

                {/* Planilla Interactiva (Asistencia, Notas e Import/Export Excel) */}
                {planilla && (
                    <section className="mb-8">
                        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                            <h3 className="text-xl font-bold">Planilla de Asistencia y Calificaciones</h3>
                            <div className="flex flex-wrap items-center gap-2">
                                <input type="date" value={nuevaFechaClase} onChange={(e) => setNuevaFechaClase(e.target.value)} className="border border-slate-300 rounded p-1.5 text-xs" />
                                <button type="button" onClick={() => void handleCrearClase()} className="border border-slate-800 rounded px-3 py-1.5 text-xs font-bold hover:bg-slate-50">
                                    + Registrar clase
                                </button>
                                <label className="border border-slate-800 rounded px-3 py-1.5 text-xs font-bold hover:bg-slate-50 cursor-pointer">
                                    Importar notas (.xlsx)
                                    <input type="file" accept=".xlsx" className="hidden" onChange={(e) => void handleImportarNotasExcel(e.target.files?.[0])} />
                                </label>
                                <button type="button" onClick={() => void handleExportar()} className="bg-[#2a3441] text-white rounded px-3 py-1.5 text-xs font-bold hover:bg-slate-700">
                                    Exportar Excel
                                </button>
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-lg overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-600">
                                    <tr>
                                        <th className="p-3 border-b border-slate-200">Estudiante</th>
                                        {planilla.clases.map((clase) => (
                                            <th key={clase.id} className="p-3 border-b border-slate-200 text-center">{clase.fecha}</th>
                                        ))}
                                        <th className="p-3 border-b border-slate-200 text-center">% Asist.</th>
                                        <th className="p-3 border-b border-slate-200 text-center">Nota Final</th>
                                        <th className="p-3 border-b border-slate-200 text-center">Condición</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {planilla.estudiantes.length === 0 ? (
                                        <tr>
                                            <td colSpan={planilla.clases.length + 4} className="p-6 text-center text-slate-500">
                                                No hay estudiantes inscriptos en este seminario.
                                            </td>
                                        </tr>
                                    ) : (
                                        planilla.estudiantes.map((est) => (
                                            <tr key={est.legajo_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                                <td className="p-3 font-medium">
                                                    {est.apellido}, {est.nombre}
                                                    <span className="block text-xs text-slate-500">{est.email}</span>
                                                </td>
                                                {est.asistencias.map((celda) => (
                                                    <td key={celda.clase_id} className="p-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={celda.presente}
                                                            onChange={(e) => void handleToggleAsistencia(celda.clase_id, est.legajo_id, e.target.checked)}
                                                            className="h-4 w-4 cursor-pointer accent-[#2a3441]"
                                                        />
                                                    </td>
                                                ))}
                                                <td className="p-3 text-center font-semibold">{est.porcentaje_asistencia}%</td>
                                                <td className="p-3 text-center">
                                                    <div className="inline-flex items-center gap-1">
                                                        <input
                                                            type="text"
                                                            value={notasEditadas[est.legajo_id] ?? ''}
                                                            onChange={(e) => setNotasEditadas((prev) => ({ ...prev, [est.legajo_id]: e.target.value }))}
                                                            className="w-16 border border-slate-300 rounded p-1 text-center text-sm"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleGuardarNota(est.legajo_id)}
                                                            className="border border-slate-300 rounded px-2 py-1 text-xs font-semibold hover:bg-slate-100"
                                                        >
                                                            OK
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                        est.condicion === 'Aprobado' ? 'bg-green-100 text-green-700' :
                                                        est.condicion === 'Desaprobado' || est.condicion === 'Libre' ? 'bg-red-100 text-red-700' :
                                                        'bg-slate-100 text-slate-700'
                                                    }`}>
                                                        {est.condicion}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                <div className="flex justify-start mt-auto">
                    <Link to="/coordinador/panel" className="px-6 py-2 border-2 border-slate-800 rounded font-bold hover:bg-slate-50 transition-colors text-sm">
                        Ir al Panel de Conducción
                    </Link>
                </div>
            </main>
        </div>
    );
}
