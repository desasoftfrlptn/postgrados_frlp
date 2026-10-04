import type { ComponentType, SVGProps } from "react";

/* Roles */
export type Rol = "aspirante" | "docente" | "admin" | "coordinador" | "cpr" | "estudiante";

export interface User {
  nombre: string;
  rol: Rol;
  email: string;
  password_hash: string;
  password_plano: string;
  activo: boolean;
}

export const roleHome: Record<User["rol"], string> = {
  coordinador: "/panel",
  docente: "/panel",
  cpr: "/panel",
  aspirante: "/inscripcion",
  admin: "/panel",
  estudiante: "/welcome"
};


export interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  roles?: Rol[];
}

export interface NotificationSummary {
  count: number;
}

export type EstadoLegajo =
  | "BORRADOR"
  | "PENDIENTE"
  | "EN_REVISION"
  | "OBSERVADO"
  | "COMPLETADO"
  | "ACTIVO"
  | "VENCIDO"
  | "RECHAZADO"
  | "BAJA"
  | "GRADUADO";

export type TipoCarrera = "Especializacion" | "Maestria" | "Doctorado";

export type Semaforo = "VERDE" | "AMARILLO" | "ROJO";

export type TipoBeca = "30" | "100";

export interface Cohorte {
  id: string;
  anio: number;
  nombre: string;
  inscripcion_abierta: boolean;
  fecha_inicio: string | null;
}

export interface PeriodoInscripcion {
  id: string;
  cohorte_id: string;
  fecha_abre: string;
  fecha_cierra: string | null;
}

export interface Seminario {
  id: string;
  nombre: string;
  codigo: string;
  horas_catedra: number;
  es_obligatorio: boolean;
  docente: string;
  email_docente: string;
}

export interface Legajo {
  id: string;
  numero_legajo: string | null; // null hasta que se aprueba
  cohorte_id: string;
  dni: string;
  apellido: string;
  nombre: string;
  email: string;
  email_alternativo?: string;
  telefono_movil: string;
  domicilio: {
    direccion: string;
    ciudad: string;
    provincia: string;
    pais: string;
  };
  titulo_grado: string;
  titulo_posgrado?: string;
  motivacion: string;
  estado: EstadoLegajo;
  tipo_carrera: TipoCarrera | null;
  carrera_elegida: string;
  solicita_beca: boolean;
  tipo_beca?: TipoBeca;
  semaforo: Semaforo;
  semaforo_manual: boolean;
  fecha_inscripcion: string | null;
  fecha_activacion: string | null;
  created_at: string;
  updated_at: string;
}

export type TipoDocumento =
  | "DNI"
  | "TITULO_GRADO"
  | "PARTIDA"
  | "CUIT_CUIL"
  | "FORM_INSCRIPCION"
  | "FORM_BECA"
  | "TITULO_POSGRADO";

export const ETIQUETA_TIPO: Record<TipoDocumento, string> = {
  DNI: "DNI",
  TITULO_GRADO: "Título de grado",
  PARTIDA: "Partida de nacimiento",
  CUIT_CUIL: "Constancia de CUIT/CUIL",
  FORM_INSCRIPCION: "Formulario de inscripción",
  FORM_BECA: "Formulario de solicitud de beca",
  TITULO_POSGRADO: "Título de posgrado",
};

export interface Documento {
  id: string;
  legajo_id: string;
  tipo: TipoDocumento;
  nombre_original: string;
  tamanio_bytes: number;
  fecha_subida: string;
}

export type EstadoDocumento = "PENDIENTE_REVISION" | "APROBADO" | "OBSERVADO" | "FALTANTE";
 
export interface DocumentoConEstado extends Documento {
  estado: EstadoDocumento;
  motivo_observacion?: string; // solo si estado === "OBSERVADO"
}
 
// Respuesta de la consulta pública (sin login) de estado de inscripción
export interface ConsultaLegajoResponse {
  id: string;
  numero_legajo: string | null;
  nombre: string;
  apellido: string;
  estado: EstadoLegajo;
  solicita_beca: boolean;
  documentos: DocumentoConEstado[];
}

// Requests

export interface CrearLegajoRequest {
  tipo_carreras: TipoCarrera[]; // max 2
  carreras: string[];
  apellido: string;
  nombre: string;
  nacionalidad: string;
  dni: string;
  telefono_movil: string;
  telefono_fijo?: string;
  email: string;
  email_alternativo?: string;
  domicilio: Legajo["domicilio"];
  titulo_grado: string;
  titulo_posgrado?: string;
  como_conocio: string;
  motivacion: string; // max 500 caracteres
  solicita_beca: boolean;
  tipo_beca?: TipoBeca;
}

export interface FiltrosLegajo {
  estado?: EstadoLegajo;
  cohorte_id?: string;
  tipo_carrera?: TipoCarrera;
  solo_con_beca?: boolean;
  page?: number;
  limit?: number;
}

export interface LegajosPaginados {
  legajos: Legajo[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DatosPersonales {
  apellido: string;
  nombre: string;
  nacionalidad: string;
  documento: string;
  telefonoMovil: string;
  telefonoFijo: string;
  email: string;
  emailAlternativo: string;
  domicilio: {
    direccion: string;
    ciudad: string;
    provincia: string;
    pais: string;
  };
  solicitaBeca: boolean;
  tipoBeca?: TipoBeca;
  comprobanteBeca: undefined | File;
}

export const DATOS_PERSONALES_INICIAL: DatosPersonales = {
  apellido: "",
  nombre: "",
  nacionalidad: "",
  documento: "",
  telefonoMovil: "",
  telefonoFijo: "",
  email: "",
  emailAlternativo: "",
  domicilio: {
    direccion: "",
    ciudad: "",
    provincia: "",
    pais: "Argentina",
  },
  solicitaBeca: false,
  tipoBeca: undefined,
  comprobanteBeca: undefined,
};

export interface DatosAcademicos {
  tipoCarreras: TipoCarrera[]; // máximo 2
  carreraElegida: string;
  tituloGradoObtenido: string;
  tituloPosgrado?: string;
  canalDifusion: string;
  motivaciones: string;
}

export const DATOS_ACADEMICOS_INICIAL: DatosAcademicos = {
  tipoCarreras: [],
  carreraElegida: "",
  tituloGradoObtenido: "",
  tituloPosgrado: "",
  canalDifusion: "",
  motivaciones: "",
};

export const TIPOS_CARRERA: TipoCarrera[] = [
  "Especializacion",
  "Maestria",
  "Doctorado",
];

export interface FiltrosSeminario {
  nombre?: string;
  docente?: string;
  es_obligatorio?: boolean;
  horas_catedra?: string;
  page?: number;
  limit?: number;
}

export interface SeminariosPaginados {
  seminarios: Seminario[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

//Datos academicos que solicitan para inscripcion de posgrado
export const CARRERAS_POSGRADO = [
  { value: "maestria-datos", label: "Maestría en Ciencia de Datos" },
  { value: "especializacion-ia", label: "Especialización en Inteligencia Artificial" },
  { value: "diplomatura-fullstack", label: "Diplomatura en Desarrollo Full Stack" },
];

export const CANALES_DIFUSION = [
  { value: "redes-sociales", label: "Redes sociales" },
  { value: "sitio-web", label: "Sitio web institucional" },
  { value: "recomendacion", label: "Recomendación de un conocido" },
  { value: "evento", label: "Evento o charla informativa" },
  { value: "otro", label: "Otro" },
];

export interface DocumentoRequerido {
  id: string;
  label: string;
  opcional?: boolean;
}

export const DOCUMENTOS_REQUERIDOS: DocumentoRequerido[] = [
  { id: "formulario-preinscripcion", label: "Formulario de preinscripción (con firma analógica)" },
  { id: "partida-nacimiento", label: "Copia de la partida de nacimiento" },
  { id: "cuit-cuil", label: "Constancia de CUIT-CUIL" },
  { id: "titulo-grado", label: "Copia del título de grado" },
  { id: "titulo-posgrado", label: "Copia del título de posgrado", opcional: true },
  { id: "dni", label: "Copia del DNI" },
];

// Mapa id -> archivo cargado (o undefined si no hay nada aún)
export type DatosDocumentos = Record<string, File | undefined>;

export const DATOS_DOCUMENTOS_INICIAL: DatosDocumentos = DOCUMENTOS_REQUERIDOS.reduce(
  (acc, doc) => ({ ...acc, [doc.id]: undefined }),
  {} as DatosDocumentos
);

export type TipoTrabajoFinal = "TFI" | "Maestria" | "Doctorado";
 
export interface TrabajoFinal {
  id: string;
  legajo_id: string;
  tipo: TipoTrabajoFinal;
  titulo: string;
  director: string;
  codirector: string | null;
  fecha_cpr: string; // "YYYY-MM-DD"
  numero_resolucion: string;
  creado_por: string; // email del usuario CPR que lo cargó (auditoría)
  created_at: string;
}
 
export interface CrearTrabajoFinalRequest {
  tipo: TipoTrabajoFinal;
  titulo: string;
  director: string;
  codirector: string | null;
  fecha_cpr: string;
  numero_resolucion: string;
}

export interface EstadisticasCohorte {
  cohorte_id: string;
  cohorte_nombre: string;
  anio: number;
  total_inscriptos: number;
  activos: number;
  graduados: number;
  en_riesgo: number;
  dados_de_baja: number;
}