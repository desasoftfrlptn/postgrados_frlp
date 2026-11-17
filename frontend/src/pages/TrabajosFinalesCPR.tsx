import { useCallback, useState, type FormEvent } from 'react';

import { extraerErrorApi, useApiClient } from '../shared/api/useApiClient';
import type { TipoCarrera, TipoTrabajoFinal, TrabajoFinal } from '../types';

export default function TrabajosFinalesCPR() {
    const { solicitar } = useApiClient();

    const [legajoId, setLegajoId] = useState('');
    const [trabajos, setTrabajos] = useState<TrabajoFinal[]>([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mensaje, setMensaje] = useState<string | null>(null);

    // Formulario de creación / edición de trabajo final
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [tipo, setTipo] = useState<TipoTrabajoFinal>('TFI');
    const [titulo, setTitulo] = useState('');
    const [directorNombre, setDirectorNombre] = useState('');
    const [directorEmail, setDirectorEmail] = useState('');
    const [codirector, setCodirector] = useState('');
    const [fechaAprobacion, setFechaAprobacion] = useState('');
    const [numeroResolucion, setNumeroResolucion] = useState('');

    // Formulario de avance de tesis
    const [avanceCarrera, setAvanceCarrera] = useState<TipoCarrera>('Especialización');
    const [avanceFecha, setAvanceFecha] = useState(() => new Date().toISOString().slice(0, 10));
    const [avanceDescripcion, setAvanceDescripcion] = useState('');

    const buscarTrabajos = useCallback(async (idBuscar: string) => {
        if (!idBuscar.trim()) return;
        setCargando(true);
        setError(null);
        setMensaje(null);
        try {
            const resp = await solicitar(`/legajos/${idBuscar.trim()}/trabajo-final`);
            if (!resp.ok) {
                throw new Error(await extraerErrorApi(resp, 'No se pudieron consultar los trabajos finales.'));
            }
            setTrabajos(await resp.json());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudieron consultar los trabajos finales.');
            setTrabajos([]);
        } finally {
            setCargando(false);
        }
    }, [solicitar]);

    const limpiarFormulario = () => {
        setEditandoId(null);
        setTipo('TFI');
        setTitulo('');
        setDirectorNombre('');
        setDirectorEmail('');
        setCodirector('');
        setFechaAprobacion('');
        setNumeroResolucion('');
    };

    const handleGuardarTrabajo = async (evento: FormEvent) => {
        evento.preventDefault();
        if (!legajoId.trim()) {
            setError('Ingresá el UUID del legajo.');
            return;
        }
        setError(null);
        setMensaje(null);
        try {
            const payload = {
                tipo,
                titulo,
                director_nombre: directorNombre,
                director_email: directorEmail,
                codirector: codirector.trim() ? codirector.trim() : null,
                fecha_aprobacion_cpr: fechaAprobacion,
                numero_resolucion: numeroResolucion,
            };
            const ruta = editandoId
                ? `/trabajos-finales/${editandoId}`
                : `/legajos/${legajoId.trim()}/trabajo-final`;
            const resp = await solicitar(ruta, {
                method: editandoId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!resp.ok) {
                throw new Error(await extraerErrorApi(resp, 'No se pudo guardar el trabajo final.'));
            }
            setMensaje(editandoId ? 'Trabajo final actualizado.' : 'Trabajo final registrado.');
            limpiarFormulario();
            await buscarTrabajos(legajoId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo guardar el trabajo final.');
        }
    };

    const handleRegistrarAvance = async (evento: FormEvent) => {
        evento.preventDefault();
        if (!legajoId.trim()) {
            setError('Ingresá el UUID del legajo.');
            return;
        }
        setError(null);
        setMensaje(null);
        try {
            const resp = await solicitar(`/legajos/${legajoId.trim()}/avances-tesis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    carrera: avanceCarrera,
                    fecha: avanceFecha,
                    descripcion: avanceDescripcion,
                }),
            });
            if (!resp.ok) {
                throw new Error(await extraerErrorApi(resp, 'No se pudo registrar el avance de tesis.'));
            }
            setMensaje('Avance de tesis registrado correctamente.');
            setAvanceDescripcion('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo registrar el avance de tesis.');
        }
    };

    const cargarParaEditar = (tf: TrabajoFinal) => {
        setEditandoId(tf.id);
        setTipo(tf.tipo);
        setTitulo(tf.titulo);
        setDirectorNombre(tf.director_nombre);
        setDirectorEmail(tf.director_email);
        setCodirector(tf.codirector ?? '');
        setFechaAprobacion(tf.fecha_aprobacion_cpr);
        setNumeroResolucion(tf.numero_resolucion);
    };

    return (
        <main className="mx-auto my-8 w-full max-w-5xl px-4 space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-1">Gestión CPR · Trabajos Finales y Avances</h1>
                <p className="text-slate-500 text-sm">Registro exclusivo de Comisión de Posgrado Regional (BR-004)</p>
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

            <div className="flex flex-wrap gap-3 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex-1 min-w-[260px]">
                    <label className="block text-xs font-bold mb-1 uppercase text-slate-600">UUID del Legajo</label>
                    <input
                        type="text"
                        value={legajoId}
                        onChange={(e) => setLegajoId(e.target.value)}
                        placeholder="Ej: 550e8400-e29b-41d4-a716-446655440000"
                        className="w-full border border-slate-300 rounded p-2 text-sm bg-white"
                    />
                </div>
                <button
                    type="button"
                    disabled={cargando || !legajoId.trim()}
                    onClick={() => void buscarTrabajos(legajoId)}
                    className="bg-[#2a3441] text-white px-5 py-2 rounded text-sm font-semibold hover:bg-slate-700 disabled:opacity-50"
                >
                    {cargando ? 'Buscando...' : 'Buscar Trabajos'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form onSubmit={(e) => void handleGuardarTrabajo(e)} className="border border-slate-200 rounded-lg p-5 space-y-3">
                    <h2 className="font-bold text-lg">
                        {editandoId ? 'Editar Trabajo Final' : 'Registrar Trabajo Final'}
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold mb-1">Tipo</label>
                            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoTrabajoFinal)} className="w-full border border-slate-300 rounded p-2 text-sm">
                                <option value="TFI">TFI</option>
                                <option value="Maestría">Maestría</option>
                                <option value="Doctorado">Doctorado</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">Fecha aprobación CPR</label>
                            <input type="date" required value={fechaAprobacion} onChange={(e) => setFechaAprobacion(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1">Título</label>
                        <input type="text" required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold mb-1">Director/a</label>
                            <input type="text" required value={directorNombre} onChange={(e) => setDirectorNombre(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">Email Director/a</label>
                            <input type="email" required value={directorEmail} onChange={(e) => setDirectorEmail(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold mb-1">Codirector/a (opcional)</label>
                            <input type="text" value={codirector} onChange={(e) => setCodirector(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">N° Resolución</label>
                            <input type="text" required value={numeroResolucion} onChange={(e) => setNumeroResolucion(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm" />
                        </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button type="submit" className="bg-[#2a3441] text-white px-4 py-2 rounded text-sm font-semibold hover:bg-slate-700">
                            {editandoId ? 'Guardar cambios' : 'Registrar Trabajo Final'}
                        </button>
                        {editandoId && (
                            <button type="button" onClick={limpiarFormulario} className="border border-slate-300 px-4 py-2 rounded text-sm font-semibold">
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>

                <form onSubmit={(e) => void handleRegistrarAvance(e)} className="border border-slate-200 rounded-lg p-5 space-y-3 h-fit">
                    <h2 className="font-bold text-lg">Registrar Avance de Tesis</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold mb-1">Carrera</label>
                            <select value={avanceCarrera} onChange={(e) => setAvanceCarrera(e.target.value as TipoCarrera)} className="w-full border border-slate-300 rounded p-2 text-sm">
                                <option value="Especialización">Especialización</option>
                                <option value="Maestría">Maestría</option>
                                <option value="Doctorado">Doctorado</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">Fecha</label>
                            <input type="date" required value={avanceFecha} onChange={(e) => setAvanceFecha(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1">Descripción del avance</label>
                        <textarea rows={3} required value={avanceDescripcion} onChange={(e) => setAvanceDescripcion(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm" />
                    </div>
                    <button type="submit" className="border-2 border-slate-800 px-4 py-2 rounded text-sm font-bold hover:bg-slate-50">
                        Registrar Avance
                    </button>
                </form>
            </div>

            {trabajos.length > 0 && (
                <section className="space-y-3">
                    <h2 className="font-bold text-lg">Trabajos Finales del Legajo</h2>
                    {trabajos.map((tf) => (
                        <div key={tf.id} className="border border-slate-200 rounded-lg p-4 flex justify-between items-start gap-4">
                            <div className="text-sm space-y-1">
                                <div className="font-bold">{tf.tipo} · {tf.titulo}</div>
                                <div className="text-xs text-slate-600">
                                    Director/a: {tf.director_nombre} ({tf.director_email})
                                    {tf.codirector ? ` · Codirector/a: ${tf.codirector}` : ''}
                                </div>
                                <div className="text-xs text-slate-500">
                                    Resolución: {tf.numero_resolucion} · Aprobación CPR: {tf.fecha_aprobacion_cpr}
                                </div>
                            </div>
                            <button type="button" onClick={() => cargarParaEditar(tf)} className="border border-slate-300 rounded px-3 py-1 text-xs font-semibold hover:bg-slate-100">
                                Editar
                            </button>
                        </div>
                    ))}
                </section>
            )}
        </main>
    );
}

