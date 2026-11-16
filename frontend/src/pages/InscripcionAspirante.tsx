import { useState, useEffect, useCallback } from 'react';
import { useForm, useWatch, type FieldPath } from 'react-hook-form';

type InscripcionValues = {
    carreras: ('Especialización' | 'Maestría' | 'Doctorado')[];
    dni: string;
    nombre: string;
    apellido: string;
    nacionalidad: string;
    email: string;
    email_alternativo: string;
    telefono_movil: string;
    telefono_fijo?: string;
    domicilio: string;
    ciudad: string;
    provincia: string;
    pais: string;
    titulo_grado: string;
    titulo_posgrado?: string;
    como_conocio: string;
    motivacion: string;
    solicita_beca: boolean;
    tipo_beca?: '30%' | '100%';
    archivo_preinscripcion?: FileList;
    archivo_dni?: FileList;
    archivo_titulo?: FileList;
    archivo_partida?: FileList;
    archivo_cuit?: FileList;
    archivo_posgrado?: FileList;
    archivo_beca?: FileList;
};

type InscripcionResponse = {
    codigo_seguimiento: string;
    estado: string;
    mensaje: string;
};

type DraftValues = Partial<Omit<InscripcionValues,
    | 'archivo_preinscripcion'
    | 'archivo_dni'
    | 'archivo_titulo'
    | 'archivo_partida'
    | 'archivo_cuit'
    | 'archivo_posgrado'
    | 'archivo_beca'
>>;

type InscripcionDraft = {
    values: DraftValues;
    pasoActual: number;
    updatedAt: number;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const DRAFT_KEY_PREFIX = 'inscripcion-borrador:';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function esInscripcionDraft(value: unknown): value is InscripcionDraft {
    if (typeof value !== 'object' || value === null || !('values' in value) || typeof value.values !== 'object' || value.values === null) {
        return false;
    }

    return (
        'email' in value.values &&
        typeof value.values.email === 'string' &&
        'pasoActual' in value &&
        typeof value.pasoActual === 'number' &&
        'updatedAt' in value &&
        typeof value.updatedAt === 'number'
    );
}

function normalizarEmail(email: string): string {
    return email.trim().toLowerCase();
}

function leerBorrador(email: string): InscripcionDraft | null {
    const stored = localStorage.getItem(`${DRAFT_KEY_PREFIX}${encodeURIComponent(email)}`);
    if (!stored) {
        return null;
    }

    const parsed: unknown = JSON.parse(stored);
    if (!esInscripcionDraft(parsed) || parsed.values.email !== email) {
        throw new Error('El borrador guardado no tiene un formato válido.');
    }

    if (Date.now() - parsed.updatedAt > 30 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(`${DRAFT_KEY_PREFIX}${encodeURIComponent(email)}`);
        return null;
    }

    return parsed;
}

function getApiError(payload: unknown): string {
    if (typeof payload !== 'object' || payload === null || !('detail' in payload)) {
        return 'No se pudo completar la inscripción. Intentá nuevamente.';
    }

    const { detail } = payload;
    if (typeof detail === 'string') {
        return detail;
    }
    if (Array.isArray(detail)) {
        const messages = detail.flatMap((item) => {
            if (typeof item === 'object' && item !== null && 'msg' in item && typeof item.msg === 'string') {
                return [item.msg];
            }
            return [];
        });
        if (messages.length > 0) {
            return messages.join('. ');
        }
    }
    return 'Revisá los datos ingresados e intentá nuevamente.';
}

export default function InscripcionAspirante() {
    const [pasoActual, setPasoActual] = useState(1);
    const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
    const [errorBorrador, setErrorBorrador] = useState<string | null>(null);
    const [emailParaBorrador, setEmailParaBorrador] = useState<string | null>(null);
    const [borradorDisponible, setBorradorDisponible] = useState<InscripcionDraft | null>(null);
    const [inscripcionEnviada, setInscripcionEnviada] = useState<InscripcionResponse | null>(null);

    useEffect(() => {
        document.title = "Preinscripción 2026 | Sistema de Posgrado";
    }, []);

    const { control, register, handleSubmit, trigger, getValues, reset, subscribe, formState: { errors, isSubmitting } } = useForm<InscripcionValues>({
        mode: 'onChange',
        reValidateMode: 'onChange',
        defaultValues: { carreras: [], solicita_beca: false },
        shouldUnregister: true
    });

    const valoresFormulario = useWatch({ control });
    const emailField = register('email', {
        required: 'El email es obligatorio',
        pattern: { value: EMAIL_PATTERN, message: 'Ingresá un email válido' },
    });

    const guardarBorrador = useCallback((email: string, values: Partial<InscripcionValues>, step = pasoActual) => {
        try {
            localStorage.setItem(
                `${DRAFT_KEY_PREFIX}${encodeURIComponent(email)}`,
                JSON.stringify({
                    values: {
                        carreras: values.carreras,
                        dni: values.dni,
                        nombre: values.nombre,
                        apellido: values.apellido,
                        nacionalidad: values.nacionalidad,
                        email: values.email,
                        email_alternativo: values.email_alternativo,
                        telefono_movil: values.telefono_movil,
                        telefono_fijo: values.telefono_fijo,
                        domicilio: values.domicilio,
                        ciudad: values.ciudad,
                        provincia: values.provincia,
                        pais: values.pais,
                        titulo_grado: values.titulo_grado,
                        titulo_posgrado: values.titulo_posgrado,
                        como_conocio: values.como_conocio,
                        motivacion: values.motivacion,
                        solicita_beca: values.solicita_beca,
                        tipo_beca: values.tipo_beca,
                    } satisfies DraftValues,
                    pasoActual: step,
                    updatedAt: Date.now(),
                } satisfies InscripcionDraft),
            );
            setErrorBorrador(null);
        } catch {
            setErrorBorrador('No se pudo guardar el borrador en este dispositivo.');
        }
    }, [pasoActual]);

    useEffect(() => {
        if (!emailParaBorrador || borradorDisponible || inscripcionEnviada) {
            return;
        }

        return subscribe({
            formState: { values: true },
            callback: ({ values }) => {
                if (normalizarEmail(values.email ?? '') === emailParaBorrador) {
                    guardarBorrador(emailParaBorrador, values);
                }
            },
        });
    }, [borradorDisponible, emailParaBorrador, guardarBorrador, inscripcionEnviada, subscribe]);

    const buscarBorrador = (emailIngresado: string) => {
        const email = normalizarEmail(emailIngresado);
        if (!EMAIL_PATTERN.test(email)) {
            return;
        }

        try {
            const borrador = leerBorrador(email);
            setBorradorDisponible(borrador);
            setEmailParaBorrador(borrador ? null : email);
            setErrorBorrador(null);
            if (!borrador) {
                guardarBorrador(email, getValues());
            }
        } catch {
            setBorradorDisponible(null);
            setEmailParaBorrador(null);
            setErrorBorrador('No se pudo leer el borrador guardado. Podés continuar con una inscripción nueva.');
        }
    };

    const recuperarBorrador = () => {
        if (!borradorDisponible) {
            return;
        }
        reset({
            carreras: [],
            solicita_beca: false,
            ...borradorDisponible.values,
        });
        setPasoActual(Math.max(1, Math.min(3, borradorDisponible.pasoActual)));
        setEmailParaBorrador(normalizarEmail(borradorDisponible.values.email ?? ''));
        setBorradorDisponible(null);
        setErrorBorrador(null);
    };

    const descartarBorrador = () => {
        const email = normalizarEmail(getValues('email') ?? '');
        try {
            localStorage.removeItem(`${DRAFT_KEY_PREFIX}${encodeURIComponent(email)}`);
            setEmailParaBorrador(email);
            setBorradorDisponible(null);
            setErrorBorrador(null);
            guardarBorrador(email, getValues());
        } catch {
            setErrorBorrador('No se pudo eliminar el borrador guardado.');
        }
    };

    const archivoDni = valoresFormulario.archivo_dni;
    const archivoTitulo = valoresFormulario.archivo_titulo;
    const archivoPartida = valoresFormulario.archivo_partida;
    const archivoBeca = valoresFormulario.archivo_beca;
    const archivoPosgrado = valoresFormulario.archivo_posgrado;
    const archivoCuit = valoresFormulario.archivo_cuit;
    const archivoPreinscripcion = valoresFormulario.archivo_preinscripcion;
    const solicitaBeca = valoresFormulario.solicita_beca ?? false;
    const tituloPosgrado = valoresFormulario.titulo_posgrado ?? '';

    // Función validadora de PDFs
    const validarPDF = (archivos: FileList | undefined, esObligatorio: boolean) => {
        if (!archivos || archivos.length === 0) {
            return esObligatorio ? 'Este documento es obligatorio' : true;
        }

        const archivo = archivos[0];

        if (archivo.type !== 'application/pdf') {
            return 'Solo se permiten archivos PDF';
        }

        const tamañoEnMB = archivo.size / (1024 * 1024);
        if (tamañoEnMB > 5) {
            return `El archivo '${archivo.name}' es demasiado grande. Máximo permitido: 5MB.`;
        }

        return true;
    };

    const avanzarPaso = async () => {
        let camposAValidar: FieldPath<InscripcionValues>[] = [];

        if (pasoActual === 1) {
            camposAValidar = ['carreras', 'dni', 'nombre', 'apellido', 'email', 'email_alternativo', 'telefono_movil'];
            if (solicitaBeca) {
                camposAValidar.push('tipo_beca');
            }
        } else if (pasoActual === 2) {
            camposAValidar = ['nacionalidad', 'domicilio', 'ciudad', 'provincia', 'pais', 'como_conocio', 'titulo_grado', 'motivacion'];
        }

        const esValido = await trigger(camposAValidar);
        if (esValido) {
            const siguientePaso = Math.min(pasoActual + 1, 3);
            if (emailParaBorrador) {
                guardarBorrador(emailParaBorrador, getValues(), siguientePaso);
            }
            setPasoActual(siguientePaso);
        }
    };

    const retrocederPaso = () => {
        const pasoPrevio = Math.max(pasoActual - 1, 1);
        if (emailParaBorrador) {
            guardarBorrador(emailParaBorrador, getValues(), pasoPrevio);
        }
        setPasoActual(pasoPrevio);
    };

    const onSubmit = async (data: InscripcionValues) => {
        setErrorEnvio(null);
        const formulario = new FormData();
        formulario.append('carreras', JSON.stringify(data.carreras));
        formulario.append('dni', data.dni);
        formulario.append('nombre', data.nombre);
        formulario.append('apellido', data.apellido);
        formulario.append('nacionalidad', data.nacionalidad);
        formulario.append('email', data.email);
        formulario.append('email_alternativo', data.email_alternativo);
        formulario.append('telefono_movil', data.telefono_movil);
        formulario.append('domicilio', data.domicilio);
        formulario.append('ciudad', data.ciudad);
        formulario.append('provincia', data.provincia);
        formulario.append('pais', data.pais);
        formulario.append('titulo_grado', data.titulo_grado);
        formulario.append('como_conocio', data.como_conocio);
        formulario.append('motivacion', data.motivacion);
        formulario.append('solicita_beca', String(data.solicita_beca));

        if (data.telefono_fijo) formulario.append('telefono_fijo', data.telefono_fijo);
        if (data.titulo_posgrado) formulario.append('titulo_posgrado', data.titulo_posgrado);
        if (data.tipo_beca) formulario.append('tipo_beca', data.tipo_beca);

        const archivos: [string, FileList | undefined][] = [
            ['archivo_preinscripcion', data.archivo_preinscripcion],
            ['archivo_dni', data.archivo_dni],
            ['archivo_titulo', data.archivo_titulo],
            ['archivo_partida', data.archivo_partida],
            ['archivo_cuit', data.archivo_cuit],
            ['archivo_posgrado', data.archivo_posgrado],
            ['archivo_beca', data.archivo_beca],
        ];
        for (const [campo, lista] of archivos) {
            if (lista?.[0]) {
                formulario.append(campo, lista[0]);
            }
        }

        try {
            const response = await fetch(`${API_URL}/inscripciones`, {
                method: 'POST',
                body: formulario,
            });
            const payload: unknown = await response.json();
            if (!response.ok) {
                setErrorEnvio(getApiError(payload));
                return;
            }
            if (
                typeof payload !== 'object' ||
                payload === null ||
                !('codigo_seguimiento' in payload) ||
                typeof payload.codigo_seguimiento !== 'string' ||
                !('estado' in payload) ||
                typeof payload.estado !== 'string' ||
                !('mensaje' in payload) ||
                typeof payload.mensaje !== 'string'
            ) {
                setErrorEnvio('El servidor respondió con un formato inesperado. Contactá a Posgrado.');
                return;
            }
            try {
                localStorage.removeItem(`${DRAFT_KEY_PREFIX}${encodeURIComponent(normalizarEmail(data.email))}`);
            } catch {
                setErrorBorrador('La inscripción se envió, pero no se pudo borrar el borrador de este dispositivo.');
            }
            setBorradorDisponible(null);
            setEmailParaBorrador(null);
            setInscripcionEnviada({
                codigo_seguimiento: payload.codigo_seguimiento,
                estado: payload.estado,
                mensaje: payload.mensaje,
            });
        } catch {
            setErrorEnvio('No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente.');
        }
    };

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key === 'Enter' && pasoActual < 3) {
            e.preventDefault();
            await avanzarPaso();
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-white font-sans text-slate-800">

            <main className="flex-grow max-w-xl mx-auto w-full py-10 px-4">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-2">Preinscripción 2026</h1>
                    <h2 className="text-xl text-slate-600">
                        Paso {pasoActual} de 3: {
                            pasoActual === 1 ? 'Datos Personales' :
                                pasoActual === 2 ? 'Datos Personales 2' :
                                    'Carga de Documentos'
                        }
                    </h2>
                </div>

                {inscripcionEnviada ? (
                    <section role="status" className="rounded border border-green-300 bg-green-50 p-6 text-center">
                        <h3 className="mb-2 text-xl font-bold text-green-800">Inscripción recibida</h3>
                        <p>{inscripcionEnviada.mensaje}. El estado inicial es {inscripcionEnviada.estado}.</p>
                        <p className="mt-4 font-semibold">Código de seguimiento</p>
                        <p className="break-all font-mono">{inscripcionEnviada.codigo_seguimiento}</p>
                        <p className="mt-3 text-sm">Guardá este código para consultar tu inscripción.</p>
                    </section>
                ) : (
                    <>
                    {errorEnvio && (
                        <div role="alert" className="mb-5 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                            {errorEnvio}
                        </div>
                    )}
                    {errorBorrador && (
                        <div role="alert" className="mb-5 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                            {errorBorrador}
                        </div>
                    )}
                    {borradorDisponible && (
                        <section className="mb-5 rounded border border-blue-300 bg-blue-50 p-4" aria-live="polite">
                            <p className="text-sm">
                                Encontramos un borrador guardado para <strong>{borradorDisponible.values.email}</strong>.
                                ¿Querés recuperar tus datos?
                            </p>
                            <div className="mt-3 flex gap-3">
                                <button type="button" onClick={recuperarBorrador} className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white">
                                    Recuperar borrador
                                </button>
                                <button type="button" onClick={descartarBorrador} className="rounded border border-slate-400 px-4 py-2 text-sm font-semibold">
                                    Empezar de nuevo
                                </button>
                            </div>
                        </section>
                    )}
                    <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown} noValidate className="space-y-5">

                    {/* ================= PASO 1 ================= */}
                    <div className={`space-y-4 animate-fade-in ${pasoActual === 1 ? 'block' : 'hidden'}`}>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Carrera/s (Máx. 2) <span className="text-red-500">*</span></label>
                            <div className="flex flex-col gap-2 bg-slate-50 p-3 border border-slate-200 rounded">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        value="Especialización"
                                        {...register('carreras', {
                                            required: 'Seleccioná al menos una carrera',
                                            validate: (value) => value.length <= 2 || 'Podés elegir hasta 2 carreras máximo'
                                        })}
                                        className="w-4 h-4 text-[#2a3441] focus:ring-[#2a3441] cursor-pointer"
                                    />
                                    Especialización
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        value="Maestría"
                                        {...register('carreras')}
                                        className="w-4 h-4 text-[#2a3441] focus:ring-[#2a3441] cursor-pointer"
                                    />
                                    Maestría
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        value="Doctorado"
                                        {...register('carreras')}
                                        className="w-4 h-4 text-[#2a3441] focus:ring-[#2a3441] cursor-pointer"
                                    />
                                    Doctorado
                                </label>
                            </div>
                            {errors.carreras && <span className="text-red-500 text-xs mt-1 block">{errors.carreras.message as string}</span>}
                        </div>

                        <div>
                            <label htmlFor="dni" className="block text-sm font-semibold mb-1">DNI / Pasaporte <span className="text-red-500">*</span></label>
                            <input
                                id="dni"
                                type="text"
                                {...register('dni', {
                                    required: 'El DNI es obligatorio',
                                    pattern: { value: /^[0-9]{7,8}$/, message: 'Debe contener entre 7 y 8 dígitos' }
                                })}
                                className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-slate-500 outline-none"
                            />
                            {errors.dni && <span className="text-red-500 text-xs">{errors.dni.message as string}</span>}
                        </div>

                        <div>
                            <label htmlFor="nombre" className="block text-sm font-semibold mb-1">Nombre <span className="text-red-500">*</span></label>
                            <input
                                id="nombre"
                                type="text"
                                {...register('nombre', { required: 'El nombre es obligatorio' })}
                                className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-slate-500 outline-none"
                            />
                            {errors.nombre && <span className="text-red-500 text-xs">{errors.nombre.message as string}</span>}
                        </div>

                        <div>
                            <label htmlFor="apellido" className="block text-sm font-semibold mb-1">Apellido <span className="text-red-500">*</span></label>
                            <input
                                id="apellido"
                                type="text"
                                {...register('apellido', { required: 'El apellido es obligatorio' })}
                                className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-slate-500 outline-none"
                            />
                            {errors.apellido && <span className="text-red-500 text-xs">{errors.apellido.message as string}</span>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold mb-1">Email <span className="text-red-500">*</span></label>
                                <input
                                    id="email"
                                    type="email"
                                    {...emailField}
                                    onBlur={(event) => {
                                        emailField.onBlur(event);
                                        buscarBorrador(event.currentTarget.value);
                                    }}
                                    className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-slate-500 outline-none"
                                />
                                {errors.email && <span className="text-red-500 text-xs">{errors.email.message as string}</span>}
                            </div>
                            <div>
                                <label htmlFor="email_alternativo" className="block text-sm font-semibold mb-1">Email alternativo <span className="text-red-500">*</span></label>
                                <input
                                    id="email_alternativo"
                                    type="email"
                                    {...register('email_alternativo', {
                                        required: 'El email alternativo es obligatorio',
                                        pattern: { value: EMAIL_PATTERN, message: 'Ingresá un email válido' },
                                    })}
                                    className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-slate-500 outline-none"
                                />
                                {errors.email_alternativo && <span className="text-red-500 text-xs">{errors.email_alternativo.message as string}</span>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="telefono_movil" className="block text-sm font-semibold mb-1">Teléfono móvil <span className="text-red-500">*</span></label>
                                <input
                                    id="telefono_movil"
                                    type="text"
                                    {...register('telefono_movil', { required: 'El teléfono móvil es obligatorio' })}
                                    className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-slate-500 outline-none"
                                />
                                {errors.telefono_movil && <span className="text-red-500 text-xs">{errors.telefono_movil.message as string}</span>}
                            </div>
                            <div>
                                <label htmlFor="telefono_fijo" className="block text-sm font-semibold mb-1">Teléfono fijo <span className="text-slate-400 font-normal ml-1">Opcional</span></label>
                                <input
                                    id="telefono_fijo"
                                    type="text"
                                    {...register('telefono_fijo')}
                                    className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-slate-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mt-6">
                            <label htmlFor="solicita_beca" className="text-sm font-semibold">¿Solicitaste beca?</label>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input id="solicita_beca" type="checkbox" {...register('solicita_beca')} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-800"></div>
                            </label>
                        </div>
                        {solicitaBeca && (
                            <div>
                                <label htmlFor="tipo_beca" className="block text-sm font-semibold mb-1">
                                    Porcentaje de beca solicitado <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="tipo_beca"
                                    {...register('tipo_beca', { required: 'Seleccioná el porcentaje de beca' })}
                                    className="w-full border border-slate-300 rounded p-2"
                                >
                                    <option value="">Seleccione una opción</option>
                                    <option value="30%">30%</option>
                                    <option value="100%">100%</option>
                                </select>
                                {errors.tipo_beca && <span className="text-red-500 text-xs">{errors.tipo_beca.message}</span>}
                            </div>
                        )}
                    </div>

                    {/* ================= PASO 2 ================= */}
                    <div className={`space-y-4 animate-fade-in ${pasoActual === 2 ? 'block' : 'hidden'}`}>
                        <div>
                            <label htmlFor="nacionalidad" className="block text-sm font-semibold mb-1">Nacionalidad <span className="text-red-500">*</span></label>
                            <input id="nacionalidad" type="text" {...register('nacionalidad', { required: 'La nacionalidad es obligatoria' })} className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-slate-500 outline-none" />
                            {errors.nacionalidad && <span className="text-red-500 text-xs">{errors.nacionalidad.message as string}</span>}
                        </div>

                        <div>
                            <label htmlFor="domicilio" className="block text-sm font-semibold mb-1">Domicilio <span className="text-red-500">*</span></label>
                            <input id="domicilio" type="text" {...register('domicilio', { required: 'El domicilio es obligatorio' })} className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-slate-500 outline-none" />
                            {errors.domicilio && <span className="text-red-500 text-xs">{errors.domicilio.message as string}</span>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="ciudad" className="block text-sm font-semibold mb-1">Ciudad <span className="text-red-500">*</span></label>
                                <input id="ciudad" type="text" {...register('ciudad', { required: 'La ciudad es obligatoria' })} className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-slate-500 outline-none" />
                                {errors.ciudad && <span className="text-red-500 text-xs">{errors.ciudad.message as string}</span>}
                            </div>
                            <div>
                                <label htmlFor="provincia" className="block text-sm font-semibold mb-1">Provincia <span className="text-red-500">*</span></label>
                                <input id="provincia" type="text" {...register('provincia', { required: 'La provincia es obligatoria' })} className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-slate-500 outline-none" />
                                {errors.provincia && <span className="text-red-500 text-xs">{errors.provincia.message as string}</span>}
                            </div>
                            <div>
                                <label htmlFor="pais" className="block text-sm font-semibold mb-1">País <span className="text-red-500">*</span></label>
                                <input id="pais" type="text" {...register('pais', { required: 'El país es obligatorio' })} className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-slate-500 outline-none" />
                                {errors.pais && <span className="text-red-500 text-xs">{errors.pais.message as string}</span>}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="como_conocio" className="block text-sm font-semibold mb-1">¿Cómo conoció la oferta? <span className="text-red-500">*</span></label>
                            <select id="como_conocio" {...register('como_conocio', { required: 'La forma de conocer la oferta es obligatoria' })} className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-slate-500 outline-none bg-[#2a3441] text-white">
                                <option value="">Seleccione una opción</option>
                                <option value="redes">Redes Sociales (Instagram, Twitter, ...)</option>
                                <option value="colegas">Colegas</option>
                                <option value="web">Sitio Web UTN</option>
                                <option value="egresados">Estudiantes / Egresados UTN</option>
                                <option value="otro">Otro</option>
                            </select>
                            {errors.como_conocio && <span className="text-red-500 text-xs">{errors.como_conocio.message as string}</span>}
                        </div>

                        <div>
                            <label htmlFor="titulo_grado" className="block text-sm font-semibold mb-1">Título de grado <span className="text-red-500">*</span></label>
                            <input
                                id="titulo_grado"
                                type="text"
                                {...register('titulo_grado', { required: 'Debe especificar su título de grado' })}
                                className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-slate-500 outline-none"
                            />
                            {errors.titulo_grado && <span className="text-red-500 text-xs">{errors.titulo_grado.message as string}</span>}
                        </div>

                        <div>
                            <label htmlFor="titulo_posgrado" className="block text-sm font-semibold mb-1">Título de posgrado <span className="text-slate-400 font-normal ml-1">Opcional</span></label>
                            <input
                                id="titulo_posgrado"
                                type="text"
                                {...register('titulo_posgrado')}
                                className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-slate-500 outline-none"
                                placeholder="Si posee, especifique"
                            />
                        </div>

                        <div>
                            <label htmlFor="motivacion" className="block text-sm font-semibold mb-1">Motivación (Mínimo 50 caracteres) <span className="text-red-500">*</span></label>
                            <textarea
                                id="motivacion"
                                rows={3}
                                {...register('motivacion', {
                                    required: 'Requerido por el sistema',
                                    minLength: { value: 50, message: 'Faltan caracteres' }
                                })}
                                className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-slate-500 outline-none"
                            ></textarea>
                            {errors.motivacion && <span className="text-red-500 text-xs">{errors.motivacion.message as string}</span>}
                        </div>
                    </div>

                    {/* ================= PASO 3 ================= */}
                    <div className={`space-y-6 animate-fade-in w-3/4 mx-auto mt-10 ${pasoActual === 3 ? 'block' : 'hidden'}`}>

                        <div className="flex flex-col">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold">Formulario de preinscripción firmado <span className="text-red-500">*</span></span>
                                <label className="bg-[#2a3441] hover:bg-slate-700 text-white px-4 py-2 rounded flex items-center gap-2 cursor-pointer text-nowrap transition-colors">
                                    <span>+</span> {archivoPreinscripcion && archivoPreinscripcion.length > 0 ? 'Cambiar archivo' : 'Cargar archivo'}
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf"
                                        {...register('archivo_preinscripcion', {
                                            validate: (value) => validarPDF(value, true)
                                        })}
                                    />
                                </label>
                            </div>
                            {archivoPreinscripcion && archivoPreinscripcion.length > 0 && !errors.archivo_preinscripcion && <span className="text-sm text-green-600 mt-1">✓ {archivoPreinscripcion[0].name}</span>}
                            {errors.archivo_preinscripcion && <span className="text-red-500 text-xs text-right mt-1">{errors.archivo_preinscripcion.message as string}</span>}
                        </div>

                        <div className="flex flex-col">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold">DNI / Pasaporte <span className="text-red-500">*</span></span>
                                <label className="bg-[#2a3441] hover:bg-slate-700 text-white px-4 py-2 rounded flex items-center gap-2 cursor-pointer text-nowrap transition-colors">
                                    <span>+</span> {archivoDni && archivoDni.length > 0 ? 'Cambiar archivo' : 'Cargar archivo'}
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf"
                                        {...register('archivo_dni', {
                                            validate: (value) => validarPDF(value, true)
                                        })}
                                    />
                                </label>
                            </div>
                            {archivoDni && archivoDni.length > 0 && !errors.archivo_dni && <span className="text-sm text-green-600 mt-1">✓ {archivoDni[0].name}</span>}
                            {errors.archivo_dni && <span className="text-red-500 text-xs text-right mt-1">{errors.archivo_dni.message as string}</span>}
                        </div>

                        <div className="flex flex-col">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold">Copia título de grado <span className="text-red-500">*</span></span>
                                <label className="bg-[#2a3441] hover:bg-slate-700 text-white px-4 py-2 rounded flex items-center gap-2 cursor-pointer text-nowrap transition-colors">
                                    <span>+</span> {archivoTitulo && archivoTitulo.length > 0 ? 'Cambiar archivo' : 'Cargar archivo'}
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf"
                                        {...register('archivo_titulo', {
                                            validate: (value) => validarPDF(value, true)
                                        })}
                                    />
                                </label>
                            </div>
                            {archivoTitulo && archivoTitulo.length > 0 && !errors.archivo_titulo && <span className="text-sm text-green-600 mt-1">✓ {archivoTitulo[0].name}</span>}
                            {errors.archivo_titulo && <span className="text-red-500 text-xs text-right mt-1">{errors.archivo_titulo.message as string}</span>}
                        </div>

                        <div className="flex flex-col">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold">Partida de nacimiento <span className="text-red-500">*</span></span>
                                <label className="bg-[#2a3441] hover:bg-slate-700 text-white px-4 py-2 rounded flex items-center gap-2 cursor-pointer text-nowrap transition-colors">
                                    <span>+</span> {archivoPartida && archivoPartida.length > 0 ? 'Cambiar archivo' : 'Cargar archivo'}
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf"
                                        {...register('archivo_partida', {
                                            validate: (value) => validarPDF(value, true)
                                        })}
                                    />
                                </label>
                            </div>
                            {archivoPartida && archivoPartida.length > 0 && !errors.archivo_partida && <span className="text-sm text-green-600 mt-1">✓ {archivoPartida[0].name}</span>}
                            {errors.archivo_partida && <span className="text-red-500 text-xs text-right mt-1">{errors.archivo_partida.message as string}</span>}
                        </div>

                        <div className="flex flex-col">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold">Constancia CUIT/CUIL <span className="text-red-500">*</span></span>
                                <label className="bg-[#2a3441] hover:bg-slate-700 text-white px-4 py-2 rounded flex items-center gap-2 cursor-pointer text-nowrap transition-colors">
                                    <span>+</span> {archivoCuit && archivoCuit.length > 0 ? 'Cambiar archivo' : 'Cargar archivo'}
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf"
                                        {...register('archivo_cuit', {
                                            validate: (value) => validarPDF(value, true)
                                        })}
                                    />
                                </label>
                            </div>
                            {archivoCuit && archivoCuit.length > 0 && !errors.archivo_cuit && <span className="text-sm text-green-600 mt-1">✓ {archivoCuit[0].name}</span>}
                            {errors.archivo_cuit && <span className="text-red-500 text-xs text-right mt-1">{errors.archivo_cuit.message as string}</span>}
                        </div>

                        {tituloPosgrado && tituloPosgrado.trim() !== '' && (
                            <div className="flex flex-col">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold">
                                        Título de posgrado <span className="text-red-500">*</span>
                                    </span>
                                    <label className="bg-[#2a3441] hover:bg-slate-700 text-white px-4 py-2 rounded flex items-center gap-2 cursor-pointer text-nowrap transition-colors">
                                        <span>+</span> {archivoPosgrado && archivoPosgrado.length > 0 ? 'Cambiar archivo' : 'Cargar archivo'}
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".pdf"
                                            {...register('archivo_posgrado', {
                                                validate: (value) => validarPDF(value, true)
                                            })}
                                        />
                                    </label>
                                </div>
                                {archivoPosgrado && archivoPosgrado.length > 0 && !errors.archivo_posgrado && <span className="text-sm text-green-600 mt-1">✓ {archivoPosgrado[0].name}</span>}
                                {errors.archivo_posgrado && <span className="text-red-500 text-xs text-right mt-1">{errors.archivo_posgrado.message as string}</span>}
                            </div>
                        )}

                        {solicitaBeca && (
                            <div className="flex flex-col">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold">
                                        Formulario de beca <span className="text-red-500">*</span>
                                    </span>
                                    <label className="bg-[#2a3441] hover:bg-slate-700 text-white px-4 py-2 rounded flex items-center gap-2 cursor-pointer text-nowrap transition-colors">
                                        <span>+</span> {archivoBeca && archivoBeca.length > 0 ? 'Cambiar archivo' : 'Cargar archivo'}
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".pdf"
                                            {...register('archivo_beca', {
                                                validate: (value) => validarPDF(value, solicitaBeca)
                                            })}
                                        />
                                    </label>
                                </div>
                                {archivoBeca && archivoBeca.length > 0 && !errors.archivo_beca && <span className="text-sm text-green-600 mt-1">✓ {archivoBeca[0].name}</span>}
                                {errors.archivo_beca && <span className="text-red-500 text-xs text-right mt-1">{errors.archivo_beca.message as string}</span>}
                            </div>
                        )}

                    </div>

                    <div className="flex justify-between mt-12 pt-6">
                        {pasoActual > 1 ? (
                            <button
                                type="button"
                                onClick={retrocederPaso}
                                className="px-8 py-2 border-2 border-slate-800 rounded font-bold cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                                Atras
                            </button>
                        ) : <div />}

                        {pasoActual < 3 ? (
                            <button
                                type="button"
                                onClick={avanzarPaso}
                                className="px-8 py-2 border-2 border-slate-800 rounded font-bold cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                                Siguiente
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-8 py-2 border-2 border-slate-800 rounded font-bold cursor-pointer hover:bg-slate-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting ? 'Enviando...' : 'Finalizar'}
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-slate-500">
                        Tus datos se guardan en este dispositivo para recuperar el borrador con el mismo email.
                        Los documentos adjuntos deberán cargarse nuevamente. Evitá guardar el borrador en equipos compartidos.
                    </p>
                    </form>
                    </>
                )}
            </main>

            <footer className="pb-10 flex justify-center mt-auto overflow-visible">
                <div className="w-full max-w-[16rem] sm:max-w-xs md:max-w-md relative mt-16 flex items-center">

                    <div className="absolute w-full h-[2px] bg-slate-300"></div>

                    <div className={`absolute flex flex-col items-center transition-all duration-300 ease-in-out
                        ${pasoActual === 1 ? 'left-0 -translate-x-1/2' :
                            pasoActual === 2 ? 'left-1/2 -translate-x-1/2' :
                                'left-full -translate-x-1/2'}`}
                    >
                        <div className="absolute bottom-6 flex flex-col items-center">
                            <div className="bg-[#2a3441] text-white w-8 h-8 flex items-center justify-center rounded text-sm font-semibold shadow-md">
                                {pasoActual}
                            </div>
                            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-[#2a3441]"></div>
                        </div>

                        <div className="w-5 h-5 rounded-full border-[3px] border-[#2a3441] bg-white relative z-10"></div>
                    </div>

                </div>
            </footer>
        </div>
    );
}