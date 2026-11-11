/**
 * Endpoints del backend, 1:1 con los routers (auth, accesos, legajos).
 * Pensado para usarse dentro de queryFn / mutationFn de TanStack Query.
 *
 * Los bloques marcados PENDIENTE (cohortes, estadísticas, seminarios, documentos, períodos)
 * todavía no tienen router en el backend: las rutas son convención REST y los hooks ya las usan,
 * así que cuando se implementen solo hay que ajustar este archivo.
 */
import type {
  Cohorte,
  CrearTrabajoFinalRequest,
  DocumentoConEstado,
  EstadisticasCohorte,
  EstadoLegajo,
  FiltrosSeminario,
  PeriodoInscripcion,
  Rol,
  Semaforo,
  Seminario,
  TipoBeca,
  TipoCarrera,
  TipoDocumento,
  TrabajoFinal,
} from "@/shared/types/types";
import { api, ApiError, download, type TokenPair } from "./client";

const enc = encodeURIComponent;

/* Los endpoints del aspirante usan la cookie HttpOnly `acceso_aspirante`, no Bearer. */
const ASPIRANTE = { auth: false, credentials: "include" } as const;

/** Por defecto, aspirante (cookie). Con `{ auth: true }`, personal con sesión (Bearer). */
export interface OpcionesCredenciales {
  auth?: boolean;
}
const credenciales = (opts?: OpcionesCredenciales) =>
  opts?.auth ? ({ auth: true } as const) : ASPIRANTE;

/* ───────────────────────────── Tipos ───────────────────────────── */
// UUID y datetime viajan como string (ISO 8601).

export type TipoEnlace = "INSCRIPCION" | "SEGUIMIENTO";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
}

/** Espejo de CrearLegajoRequest. El backend valida; estas reglas sirven para validar antes en el form. */
export interface CrearLegajoRequest {
  cohorte_id: string;
  dni: string; // 7 u 8 dígitos
  apellido: string; // 1–100
  nombre: string; // 1–100
  email: string;
  email_alternativo?: string | null;
  telefono_movil: string; // 1–30
  domicilio_direccion: string; // 1–200
  domicilio_ciudad: string; // 1–100
  domicilio_provincia: string; // 1–100
  domicilio_pais: string; // 1–60
  titulo_grado: string; // 1–200
  titulo_posgrado?: string | null; // máx. 200
  tipo_carrera: TipoCarrera;
  carrera_elegida: string; // 1–100
  motivacion: string; // 50–500
  solicita_beca?: boolean; // default false
  /** Obligatorio si solicita_beca es true; debe ser null/omitido si es false. */
  tipo_beca?: TipoBeca | null;
}

export interface Legajo {
  id: string;
  numero_legajo: string | null; // se asigna al aprobar
  cohorte_id: string;
  dni: string;
  apellido: string;
  nombre: string;
  email: string;
  email_alternativo: string | null;
  telefono_movil: string;
  domicilio_direccion: string;
  domicilio_ciudad: string;
  domicilio_provincia: string;
  domicilio_pais: string;
  titulo_grado: string;
  titulo_posgrado: string | null;
  tipo_carrera: TipoCarrera | null;
  carrera_elegida: string;
  motivacion: string;
  solicita_beca: boolean;
  tipo_beca: TipoBeca | null;
  estado: EstadoLegajo;
  semaforo: Semaforo;
  semaforo_manual: boolean;
  fecha_inscripcion: string | null;
  fecha_activacion: string | null;
  created_at: string;
  updated_at: string;
}

export interface LegajoPagina {
  data: Legajo[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface LegajoFiltros {
  estado?: EstadoLegajo;
  cohorte_id?: string;
  tipo_carrera?: TipoCarrera;
  solicita_beca?: boolean;
  dni?: string;
  /** El listado exige mínimo 3 caracteres (422 si es menor). */
  apellido?: string;
}

export interface ListarLegajosParams extends LegajoFiltros {
  page?: number; // >= 1, default 1
  limit?: number; // 1..100, default 20
}

export interface CambioEstadoRequest {
  estado: EstadoLegajo;
  comentario?: string | null; // máx. 2000
}

/** url_activacion solo viene si el cambio de estado generó una invitación de cuenta. */
export type CambioEstadoResponse = Legajo & { url_activacion?: string };

export interface CrearEnlaceRequest {
  tipo: TipoEnlace;
  cohorte_id?: string | null;
  periodo_id?: string | null;
  legajo_id?: string | null;
  duracion_dias?: number; // 1–90, default 7
  usos_maximos?: number | null; // 1–10000
}

// Según EnlaceCreadoResponse. El controller no declara response_model: confirmar que devuelve esto.
export interface EnlaceCreado {
  id: string;
  tipo: TipoEnlace;
  expira_at: string;
  url: string;
}

/* ───────────────────────────── /auth ───────────────────────────── */

export const authApi = {
  login: (email: string, password: string) =>
    api.post<TokenPair>("/auth/login", { email, password }, { auth: false }),

  me: () => api.get<Usuario>("/auth/me"),

  // Revoca el refresh token. No requiere Bearer (responde 204 aunque el token ya no exista).
  logout: (refreshToken: string) =>
    api.post<void>("/auth/logout", { refresh_token: refreshToken }, { auth: false }),

  // token: 20–200 caracteres, password: 12–128 caracteres (validado por el backend).
  activarCuenta: (token: string, password: string) =>
    api.post<{ mensaje: string }>("/auth/activar-cuenta", { token, password }, { auth: false }),

  // /auth/refresh lo maneja client.ts automáticamente ante un 401.
};

/* ──────────────────────────── /accesos ──────────────────────────── */

export const accesosApi = {
  // Coordinador.
  crearEnlace: (datos: CrearEnlaceRequest) => api.post<EnlaceCreado>("/accesos", datos),

  // Coordinador.
  revocar: (enlaceId: string) =>
    api.post<{ id: string; revocado: true }>(`/accesos/${enc(enlaceId)}/revocar`),

  // Público, con rate limit por IP (429). token: 20–200 caracteres.
  validar: (token: string) =>
    api.post<unknown>("/accesos/validar", { token }, { auth: false }),

  // Setea la cookie del aspirante → requiere credentials: "include".
  intercambiar: (token: string) =>
    api.post<{ tipo: TipoEnlace; requiere_autenticacion: false }>(
      "/accesos/intercambiar",
      { token },
      ASPIRANTE,
    ),

  // 401 = no hay sesión de aspirante (no es "sesión de staff vencida").
  sesion: () => api.get<{ tipo: TipoEnlace }>("/accesos/sesion", ASPIRANTE),

  cerrarSesion: () => api.delete<void>("/accesos/sesion", ASPIRANTE),

  // Legajo del aspirante (solo enlaces SEGUIMIENTO; 403 si el enlace es de otro tipo).
  legajo: () => api.get<Legajo>("/accesos/legajo", ASPIRANTE),
};

/* ──────────────────────────── /legajos ──────────────────────────── */

const filtrosToParams = (f: LegajoFiltros) => ({
  estado: f.estado,
  cohorte_id: f.cohorte_id,
  tipo_carrera: f.tipo_carrera,
  solicita_beca: f.solicita_beca,
  dni: f.dni,
  apellido: f.apellido,
});

export const legajosApi = {
  // Aspirante con enlace INSCRIPCION (cookie). 409 con `field` si hay conflicto (ej. DNI/email duplicado).
  // Hoy el backend solo acepta la cookie de un enlace INSCRIPCION: con `{ auth: true }` (alta hecha
  // por el coordinador) el backend responde 401 hasta que acepte también Bearer.
  crear: (datos: CrearLegajoRequest, opts?: OpcionesCredenciales) =>
    api.post<Legajo>("/legajos", datos, credenciales(opts)),

  // Coordinador.
  listar: ({ page, limit, ...filtros }: ListarLegajosParams = {}) =>
    api.get<LegajoPagina>("/legajos", { params: { page, limit, ...filtrosToParams(filtros) } }),

  // Coordinador. Devuelve el .xlsx (máx. 500 filas según el backend).
  exportar: (filtros: LegajoFiltros = {}) =>
    download("/legajos/exportar", { params: filtrosToParams(filtros) }),

  // Cualquier usuario autenticado (el backend valida el acceso según rol).
  detalle: (legajoId: string) => api.get<Legajo>(`/legajos/${enc(legajoId)}`),

  // PENDIENTE (backend): legajos del usuario logueado (estudiante), uno por carrera. Hoy no hay forma
  // de saber qué legajo es de quién: /auth/me no trae legajo_id. Declarar la ruta ANTES de
  // "/{legajo_id}" en el router; si no, FastAPI intenta leer "mios" como UUID y responde 422.
  mios: () => api.get<Legajo[]>("/legajos/mios"),

  cambiarEstado: (legajoId: string, datos: CambioEstadoRequest) =>
    api.patch<CambioEstadoResponse>(`/legajos/${enc(legajoId)}/estado`, datos),
};

/* ═══════════════════════════ PENDIENTE (sin router en el backend) ═══════════════════════════ */

export interface PeriodoVigente {
  abierto: boolean;
  periodo: { fecha_abre: string; fecha_cierra: string | null } | null;
  cohorte_id: string | null;
}

// Público: lo consulta el aspirante antes de inscribirse.
export const periodosApi = {
  vigente: () => api.get<PeriodoVigente>("/periodos/vigente", { auth: false }),

  listar: (cohorteId: string) => api.get<PeriodoInscripcion[]>(`/cohortes/${enc(cohorteId)}/periodos`),

  crear: (cohorteId: string, datos: { fecha_abre: string; fecha_cierra: string | null }) =>
    api.post<PeriodoInscripcion>(`/cohortes/${enc(cohorteId)}/periodos`, datos),

  // Fechas en formato YYYY-MM-DD
  actualizar: (periodoId: string, datos: { fecha_cierra: string | null }) =>
    api.patch<PeriodoInscripcion>(`/periodos/${enc(periodoId)}`, datos),
};

// Solo el CPR carga el trabajo final (el backend responde 403 a otros roles).
export const trabajoFinalApi = {
  // null si el legajo todavía no tiene trabajo final (404 o null en el body)
  obtener: async (legajoId: string): Promise<TrabajoFinal | null> => {
    try {
      return await api.get<TrabajoFinal | null>(`/legajos/${enc(legajoId)}/trabajo-final`);
    } catch (error) {
      if (error instanceof ApiError && error.isNotFound) return null;
      throw error;
    }
  },

  crear: (legajoId: string, datos: CrearTrabajoFinalRequest) =>
    api.post<TrabajoFinal>(`/legajos/${enc(legajoId)}/trabajo-final`, datos),
};

// Contrato PROPUESTO para el dashboard de riesgo (hoy el hook usa datos de ejemplo). Los días sin
// avance y los seminarios adeudados salen del módulo académico (seminarios y asistencias).
export interface EstudianteRiesgoApi {
  legajo_id: string;
  nombre: string;
  apellido: string;
  carrera_elegida: string;
  fecha_inscripcion: string;
  seminarios_adeudados: number;
  dias_sin_avance: number;
  semaforo: Semaforo;
}

export const riesgoApi = {
  listar: () => api.get<EstudianteRiesgoApi[]>("/estadisticas/riesgo"),
};

export const cohortesApi = {
  listar: () => api.get<Cohorte[]>("/cohortes"),
  detalle: (id: string) => api.get<Cohorte>(`/cohortes/${enc(id)}`),
  estadisticas: (tipoCarrera?: TipoCarrera) =>
    api.get<EstadisticasCohorte[]>("/estadisticas/cohortes", {
      params: { tipo_carrera: tipoCarrera },
    }),
};

// Se asume la misma convención de paginado que /legajos ({data, page, limit, total, pages}).
// Si el backend devuelve directamente la forma del front, borrar fromApiPaginaSeminarios.
export interface SeminarioPaginaApi {
  data: Seminario[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const seminariosApi = {
  listar: (f: FiltrosSeminario = {}) =>
    api.get<SeminarioPaginaApi>("/seminarios", {
      params: {
        nombre: f.nombre,
        docente: f.docente,
        es_obligatorio: f.es_obligatorio,
        horas_catedra: f.horas_catedra,
        page: f.page ?? 1,
        limit: f.limit ?? 10,
      },
    }),
  detalle: (id: string) => api.get<Seminario>(`/seminarios/${enc(id)}`),
};

// Los documentos los ven el coordinador (Bearer) y el aspirante (cookie): se mandan ambas credenciales.
export const documentosApi = {
  listar: (legajoId: string) =>
    api.get<DocumentoConEstado[]>(`/legajos/${enc(legajoId)}/documentos`, { credentials: "include" }),

  // Aspirante (cookie). multipart/form-data: client.ts no fuerza Content-Type con FormData.
  subir: (legajoId: string, file: File, tipo: TipoDocumento, opts?: OpcionesCredenciales) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("tipo", tipo);
    return api.post<unknown>(`/legajos/${enc(legajoId)}/documentos`, formData, credenciales(opts));
  },

  // Coordinador.
  revisar: (
    legajoId: string,
    docId: string,
    datos: { accion: "OBSERVAR" | "MARCAR_FALTANTE"; motivo: string },
  ) => api.patch<unknown>(`/legajos/${enc(legajoId)}/documentos/${enc(docId)}`, datos),

  // La ruta del archivo en storage es interna: el PDF se baja siempre por este endpoint.
  descargar: (docId: string) => download(`/documentos/${enc(docId)}/download`, { credentials: "include" }),
};
