/**
 * Capa de adaptación backend ⇄ tipos del frontend (types.ts).
 * Los hooks entregan y reciben los tipos del front, así que los componentes no cambian:
 * toda diferencia de forma entre ambos lados se resuelve ACÁ.
 *
 * Diferencias que cubre:
 *  - Paginado: backend { data, pages } → front { legajos, totalPages }.
 *  - Legajo: domicilio en columnas planas → objeto `domicilio`; null → undefined en los opcionales.
 *  - Filtros: `solo_con_beca` (front) → `solicita_beca` (backend). Si se manda el nombre viejo,
 *    FastAPI ignora el parámetro sin avisar y el filtro "no funciona".
 *  - Límites del listado: limit <= 100 y apellido >= 3 caracteres (si no, 422).
 *  - Inscripción: un legajo por carrera (decisión de negocio), domicilio plano, "" → null, etc.
 */
import { CARRERAS_POSGRADO } from "@/shared/types/types";
import type {
  CrearLegajoRequest as InscripcionRequest,
  DatosAcademicos,
  DatosPersonales,
  FiltrosLegajo,
  Legajo,
  LegajosPaginados,
  SeminariosPaginados,
  TipoDocumento,
} from "@/shared/types/types";
import { isApiError } from "./client";
import type {
  CrearLegajoRequest,
  Legajo as LegajoApi,
  LegajoFiltros,
  LegajoPagina,
  ListarLegajosParams,
  SeminarioPaginaApi,
} from "./endpoints";

/* ───────────── Respuestas ───────────── */

export function fromApiLegajo(l: LegajoApi): Legajo {
  return {
    id: l.id,
    numero_legajo: l.numero_legajo,
    cohorte_id: l.cohorte_id,
    dni: l.dni,
    apellido: l.apellido,
    nombre: l.nombre,
    email: l.email,
    email_alternativo: l.email_alternativo ?? undefined,
    telefono_movil: l.telefono_movil,
    domicilio: {
      direccion: l.domicilio_direccion,
      ciudad: l.domicilio_ciudad,
      provincia: l.domicilio_provincia,
      pais: l.domicilio_pais,
    },
    titulo_grado: l.titulo_grado,
    titulo_posgrado: l.titulo_posgrado ?? undefined,
    motivacion: l.motivacion,
    estado: l.estado,
    tipo_carrera: l.tipo_carrera,
    carrera_elegida: l.carrera_elegida,
    solicita_beca: l.solicita_beca,
    tipo_beca: l.tipo_beca ?? undefined,
    semaforo: l.semaforo,
    semaforo_manual: l.semaforo_manual,
    fecha_inscripcion: l.fecha_inscripcion,
    fecha_activacion: l.fecha_activacion,
    created_at: l.created_at,
    updated_at: l.updated_at,
  };
}

export function fromApiPagina(p: LegajoPagina): LegajosPaginados {
  return {
    legajos: p.data.map(fromApiLegajo),
    total: p.total,
    page: p.page,
    limit: p.limit,
    totalPages: p.pages,
  };
}

export function fromApiPaginaSeminarios(p: SeminarioPaginaApi): SeminariosPaginados {
  return {
    seminarios: p.data,
    total: p.total,
    page: p.page,
    limit: p.limit,
    totalPages: p.pages,
  };
}

/* ───────────── Filtros ───────────── */

/** Los filtros del front + los que el backend ya soporta (búsqueda por DNI y apellido). */
export type FiltrosLegajoCompat = FiltrosLegajo & { dni?: string; apellido?: string };

export function toLegajoFiltros(f: FiltrosLegajoCompat): LegajoFiltros {
  const apellido = f.apellido?.trim();
  return {
    estado: f.estado || undefined,
    cohorte_id: f.cohorte_id || undefined,
    tipo_carrera: f.tipo_carrera || undefined,
    solicita_beca: f.solo_con_beca ? true : undefined,
    dni: f.dni?.replace(/[.\s]/g, "") || undefined,
    // Con menos de 3 caracteres el backend responde 422: mientras se escribe, no se filtra.
    apellido: apellido && apellido.length >= 3 ? apellido : undefined,
  };
}

export function toListarLegajosParams(f: FiltrosLegajoCompat): ListarLegajosParams {
  return {
    ...toLegajoFiltros(f),
    page: Math.max(f.page ?? 1, 1),
    limit: Math.min(Math.max(f.limit ?? 10, 1), 100),
  };
}

/* ───────────── Inscripción del aspirante ───────────── */

/** Lo que arma el wizard (CrearLegajoRequest de types.ts) + la cohorte del período vigente. */
export type InscripcionAspirante = InscripcionRequest & { cohorte_id: string };

const vacioANull = (v: string | null | undefined) => {
  const t = v?.trim();
  return t ? t : null;
};

/**
 * Un legajo por carrera: tipo_carreras[i] va con carreras[i] (máximo 2, BR-001).
 *
 * El backend todavía no guarda `nacionalidad`, `telefono_fijo` ni `como_conocio` (no hay columnas
 * ni campos en su schema) y los ignoraría en silencio, así que no se envían. Cuando existan,
 * agregarlos acá.
 */
export function toCrearLegajoRequests(f: InscripcionAspirante): CrearLegajoRequest[] {
  if (f.carreras.length < 1 || f.carreras.length > 2 || f.tipo_carreras.length !== f.carreras.length) {
    throw new Error("Elegí una o dos carreras, cada una con su tipo.");
  }

  return f.carreras.map((carrera, i) => ({
    cohorte_id: f.cohorte_id,
    dni: f.dni.replace(/[.\s]/g, ""),
    apellido: f.apellido.trim(),
    nombre: f.nombre.trim(),
    email: f.email.trim(),
    email_alternativo: vacioANull(f.email_alternativo), // "" no es un email válido para el backend
    telefono_movil: f.telefono_movil.trim(),
    domicilio_direccion: f.domicilio.direccion.trim(),
    domicilio_ciudad: f.domicilio.ciudad.trim(),
    domicilio_provincia: f.domicilio.provincia.trim(),
    domicilio_pais: f.domicilio.pais.trim(),
    titulo_grado: f.titulo_grado.trim(),
    titulo_posgrado: vacioANull(f.titulo_posgrado),
    tipo_carrera: f.tipo_carreras[i],
    // El wizard maneja el código de la carrera ("maestria-datos"); en la base se guarda el nombre,
    // que es lo que se muestra en pantallas y exportaciones (no existe una tabla de carreras).
    carrera_elegida: CARRERAS_POSGRADO.find((c) => c.value === carrera)?.label ?? carrera,
    motivacion: f.motivacion.trim(),
    solicita_beca: f.solicita_beca,
    // El backend rechaza tipo_beca si no solicita beca (y lo exige si la solicita)
    tipo_beca: f.solicita_beca ? (f.tipo_beca ?? null) : null,
  }));
}

/** Lo que arman el wizard del aspirante y el formulario del coordinador → una inscripción. */
export function toInscripcionAspirante({
  datosPersonales: p,
  datosAcademicos: a,
  cohorte_id,
}: {
  datosPersonales: DatosPersonales;
  datosAcademicos: DatosAcademicos;
  cohorte_id: string;
}): InscripcionAspirante {
  return {
    cohorte_id,
    tipo_carreras: a.tipoCarreras,
    carreras: a.carreras,
    apellido: p.apellido,
    nombre: p.nombre,
    nacionalidad: p.nacionalidad,
    dni: p.documento,
    telefono_movil: p.telefonoMovil,
    telefono_fijo: p.telefonoFijo || undefined,
    email: p.email,
    email_alternativo: p.emailAlternativo || undefined,
    domicilio: p.domicilio,
    titulo_grado: a.tituloGradoObtenido,
    titulo_posgrado: a.tituloPosgrado || undefined,
    como_conocio: a.canalDifusion,
    motivacion: a.motivaciones,
    solicita_beca: p.solicitaBeca,
    tipo_beca: p.solicitaBeca ? p.tipoBeca : undefined,
  };
}

/* ───────── Errores del servidor → campos de cada formulario ───────── */

// Nombre del campo en el backend → nombre del campo en el wizard del aspirante (DatosPersonales/DatosAcademicos)
export const CAMPOS_WIZARD: Record<string, string> = {
  dni: "documento",
  telefono_movil: "telefonoMovil",
  email_alternativo: "emailAlternativo",
  domicilio_direccion: "direccion",
  domicilio_ciudad: "ciudad",
  domicilio_provincia: "provincia",
  domicilio_pais: "pais",
  titulo_grado: "tituloGradoObtenido",
  titulo_posgrado: "tituloPosgrado",
  motivacion: "motivaciones",
};

// ...y en el formulario del coordinador (que ya usa nombres casi iguales a los del backend)
export const CAMPOS_COORDINADOR: Record<string, string> = {
  domicilio_direccion: "direccion",
  domicilio_ciudad: "ciudad",
  domicilio_provincia: "provincia",
  domicilio_pais: "pais",
  carrera_elegida: "carrera_elegida",
};

/**
 * Errores por campo de un ApiError (422 de validación o 409 con `field`), con los nombres
 * del formulario. Devuelve {} si el error no está asociado a ningún campo.
 */
export function erroresDeCampo(error: unknown, mapa: Record<string, string>): Record<string, string> {
  if (!isApiError(error)) return {};
  const origen: Record<string, string> = { ...(error.fieldErrors ?? {}) };
  if (error.field && !(error.field in origen)) origen[error.field] = error.message;
  return Object.fromEntries(Object.entries(origen).map(([campo, msg]) => [mapa[campo] ?? campo, msg]));
}

/** id de DOCUMENTOS_REQUERIDOS (wizard) → TipoDocumento del backend. */
export const DOCUMENTO_ID_A_TIPO: Record<string, TipoDocumento> = {
  "formulario-preinscripcion": "FORM_INSCRIPCION",
  "partida-nacimiento": "PARTIDA",
  "cuit-cuil": "CUIT_CUIL",
  "titulo-grado": "TITULO_GRADO",
  "titulo-posgrado": "TITULO_POSGRADO",
  dni: "DNI",
};
