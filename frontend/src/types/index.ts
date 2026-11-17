export type EstadoLegajo =
    | 'Borrador'
    | 'Pendiente'
    | 'En Revisión'
    | 'Observado'
    | 'Completado'
    | 'Rechazado'
    | 'Activo'
    | 'Vencido'
    | 'Graduado'
    | 'En Riesgo'
    | 'Baja';

export type TipoCarrera = 'Especialización' | 'Maestría' | 'Doctorado';

export type AccionWorkflowLegajo =
    | 'REVISAR'
    | 'OBSERVAR'
    | 'APROBAR'
    | 'RECHAZAR'
    | 'MATRICULAR'
    | 'DAR_DE_BAJA';

export interface Cohorte {
    id: string;
    anio: number;
    nombre: string;
    inscripcion_abierta: boolean;
    fecha_inicio: string | null;
    fecha_proxima_apertura: string | null;
}

export interface DocumentoResumen {
    id: string;
    tipo: string;
    fecha_subida: string;
}

export interface EstadoDocumental {
    estado: 'INCOMPLETO' | 'COMPLETO' | 'VALIDADO';
    completo: boolean;
    validado: boolean;
    requeridos: string[];
    presentes: string[];
    faltantes: string[];
    invalidos: string[];
    opcionales_presentes: string[];
}

export interface LegajoListado {
    id: string;
    numero_legajo: string | null;
    apellido: string;
    nombre: string;
    dni: string;
    estado: EstadoLegajo;
    carreras: TipoCarrera[];
    solicita_beca: boolean;
    tipo_beca: string | null;
    documento_beca: { tipo: string } | null;
}

export interface LegajoDetalle {
    id: string;
    numero_legajo: string | null;
    cohorte_id: string;
    estado: EstadoLegajo;
    carreras: TipoCarrera[];
    dni: string;
    apellido: string;
    nombre: string;
    nacionalidad: string;
    email: string;
    email_alternativo: string;
    telefono_movil: string;
    telefono_fijo: string | null;
    domicilio: string;
    ciudad: string;
    provincia: string;
    pais: string;
    titulo_grado: string;
    titulo_posgrado: string | null;
    como_conocio: string;
    motivacion: string;
    solicita_beca: boolean;
    tipo_beca: string | null;
    fecha_inscripcion: string;
    documentos: DocumentoResumen[];
    documentacion_completa: boolean;
    estado_documental: string;
    documentos_faltantes: string[];
}

export interface LegajoEstadoRespuesta {
    id: string;
    estado: EstadoLegajo;
    numero_legajo: string | null;
    mensaje: string;
}

export interface Seminario {
    id: string;
    cohorte_id: string;
    nombre: string;
    docente_nombre: string;
    docente_email: string;
    fecha_fin_cuatrimestre: string;
    carrera: TipoCarrera | null;
    es_obligatorio: boolean;
    fecha_limite_notas: string | null;
}

export interface ClaseSeminario {
    id: string;
    fecha: string;
}

export interface CeldaAsistencia {
    clase_id: string;
    presente: boolean;
}

export interface EstudiantePlanilla {
    legajo_id: string;
    numero_legajo: string | null;
    apellido: string;
    nombre: string;
    email: string;
    titulo_grado: string;
    asistencias: CeldaAsistencia[];
    porcentaje_asistencia: string;
    nota: string | null;
    condicion: string;
}

export interface PlanillaSeminario {
    seminario: Seminario;
    clases: ClaseSeminario[];
    estudiantes: EstudiantePlanilla[];
}

export interface EnlaceDocente {
    token: string;
    expira_en: string;
    enlace: string;
}

export type TipoTrabajoFinal = 'TFI' | 'Maestría' | 'Doctorado';

export interface TrabajoFinal {
    id: string;
    legajo_id: string;
    tipo: TipoTrabajoFinal;
    titulo: string;
    director_nombre: string;
    director_email: string;
    codirector: string | null;
    fecha_aprobacion_cpr: string;
    numero_resolucion: string;
}

export interface PlanGraduacion {
    id: string;
    cohorte_id: string;
    carrera: TipoCarrera;
    confirmado: boolean;
}

export type EstadoSemaforo = 'SIN_DATOS' | 'SIN_EVALUAR' | 'VERDE' | 'AMARILLO' | 'ROJO';

export interface SemaforoGraduacion {
    legajo_id: string;
    carrera: TipoCarrera;
    estado: EstadoSemaforo;
    motivo: string | null;
    seminarios_adeudados: number | null;
    fecha_ultimo_avance: string | null;
    dias_sin_avance: number | null;
    fecha_cambio: string | null;
    dias_en_rojo: number | null;
    recalculado_en: string | null;
}

export interface EstudianteEnRiesgo {
    legajo_id: string;
    nombre: string;
    apellido: string;
    carrera: TipoCarrera;
    fecha_inscripcion: string;
    seminarios_adeudados: number;
    dias_sin_avance: number;
    dias_en_rojo: number;
    motivo: string;
}

export interface RecalculoSemaforosRespuesta {
    cambios: number;
    alertas_enviadas: number;
    alertas_pendientes: number;
}

export interface AvanceTesis {
    id: string;
    legajo_id: string;
    carrera: TipoCarrera;
    fecha: string;
    descripcion: string;
}

export interface AsignacionCoordinador {
    id: string;
    carrera: TipoCarrera;
    usuario_id: string;
}

export interface EstadisticaCohorte {
    cohorte_id: string;
    cohorte_nombre: string;
    anio: number;
    total_inscriptos: number;
    activos: number;
    graduados: number;
    desgranamiento_cantidad: number;
    tasa_retencion: number;
    desgranamiento: number;
}

export interface EstadisticasConduccion {
    total_inscriptos: number;
    total_graduados: number;
    tasa_retencion: number;
    desgranamiento: number;
    promedio_tiempo_graduacion_dias: number | null;
    estudiantes_en_riesgo: number;
    por_cohorte: EstadisticaCohorte[];
}
