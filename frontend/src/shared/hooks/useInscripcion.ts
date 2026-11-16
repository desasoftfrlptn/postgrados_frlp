import { useMutation } from "@tanstack/react-query";
import { documentosApi, legajosApi, type OpcionesCredenciales } from "@/shared/api/endpoints";
import {
  DOCUMENTO_ID_A_TIPO,
  fromApiLegajo,
  toCrearLegajoRequests,
  toInscripcionAspirante,
  type InscripcionAspirante,
} from "@/shared/api/mappers";
import type {
  DatosAcademicos,
  DatosDocumentos,
  DatosPersonales,
  Legajo,
  TipoDocumento,
} from "@/shared/types/types";

/** Se creó al menos un legajo pero falló uno posterior (ej. la segunda carrera). */
export class InscripcionParcialError extends Error {
  creados: Legajo[];
  carrerasPendientes: string[];
  causa: unknown;

  constructor(creados: Legajo[], carrerasPendientes: string[], causa: unknown) {
    const detalle = causa instanceof Error ? causa.message : "Error inesperado";
    super(
      `Se registró la inscripción a ${creados.map((l) => l.carrera_elegida).join(", ")}, ` +
        `pero no pudimos registrar ${carrerasPendientes.join(", ")}: ${detalle}`,
    );
    this.name = "InscripcionParcialError";
    this.creados = creados;
    this.carrerasPendientes = carrerasPendientes;
    this.causa = causa;
  }
}

/** Un POST /legajos por carrera. Si falla uno después de crear otros, lanza InscripcionParcialError. */
async function crearLegajosPorCarrera(
  form: InscripcionAspirante,
  opts?: OpcionesCredenciales,
): Promise<Legajo[]> {
  const requests = toCrearLegajoRequests(form);
  const creados: Legajo[] = [];

  for (const request of requests) {
    try {
      creados.push(fromApiLegajo(await legajosApi.crear(request, opts)));
    } catch (error) {
      if (creados.length === 0) throw error;
      throw new InscripcionParcialError(
        creados,
        requests.slice(creados.length).map((r) => r.carrera_elegida),
        error,
      );
    }
  }
  return creados;
}

/** Solo el alta de legajos (sin documentos). Devuelve Legajo[], uno por carrera. */
export function useCrearLegajo(opts?: OpcionesCredenciales) {
  return useMutation({
    mutationFn: (form: InscripcionAspirante) => crearLegajosPorCarrera(form, opts),
  });
}

export interface DatosInscripcion {
  datosPersonales: DatosPersonales;
  datosAcademicos: DatosAcademicos;
  datosDocumentos: DatosDocumentos;
  cohorte_id: string;
}

export interface DocumentoFallido {
  legajoId: string;
  tipo: TipoDocumento;
  mensaje: string;
}

export interface ResultadoInscripcion {
  legajos: Legajo[];
  /** Documentos que no se pudieron subir. La inscripción SÍ quedó registrada. */
  documentosFallidos: DocumentoFallido[];
}

/**
 * Inscripción completa: crea un legajo por carrera (máximo 2) y sube a CADA legajo los documentos
 * (y el comprobante de beca, si lo hay), porque la documentación se controla por legajo.
 *
 *  - Aspirante (wizard):      useInscripcion()               → cookie de un enlace INSCRIPCION.
 *  - Coordinador (dashboard): useInscripcion({ auth: true }) → Bearer. El backend aún no lo permite.
 *
 * Errores (ApiError): 409 conflicto (error.field), 422 validación (error.fieldErrors con nombres del
 * backend; ver erroresDeCampo), 429 demasiados intentos, 401/403 enlace vencido o inválido.
 * Si falla la 2.ª carrera lanza InscripcionParcialError. Si lo que falla es la subida de un documento
 * NO lanza (reintentar duplicaría el legajo): devuelve los fallos en `documentosFallidos`.
 *
 * PENDIENTE (backend): POST /legajos/:id/documentos.
 */
export function useInscripcion(opts?: OpcionesCredenciales) {
  return useMutation({
    mutationFn: async ({
      datosPersonales,
      datosAcademicos,
      datosDocumentos,
      cohorte_id,
    }: DatosInscripcion): Promise<ResultadoInscripcion> => {
      // Se resuelven los archivos ANTES de crear nada: un id desconocido no debe dejar legajos a medias
      const archivos: [TipoDocumento, File][] = [];
      for (const [id, file] of Object.entries(datosDocumentos)) {
        if (!file) continue;
        const tipo = DOCUMENTO_ID_A_TIPO[id];
        if (!tipo) throw new Error(`Documento desconocido: ${id}`);
        archivos.push([tipo, file]);
      }
      if (datosPersonales.solicitaBeca && datosPersonales.comprobanteBeca) {
        archivos.push(["FORM_BECA", datosPersonales.comprobanteBeca]);
      }

      const legajos = await crearLegajosPorCarrera(
        toInscripcionAspirante({ datosPersonales, datosAcademicos, cohorte_id }),
        opts,
      );

      const documentosFallidos: DocumentoFallido[] = [];
      for (const legajo of legajos) {
        for (const [tipo, file] of archivos) {
          try {
            await documentosApi.subir(legajo.id, file, tipo, opts);
          } catch (error) {
            documentosFallidos.push({
              legajoId: legajo.id,
              tipo,
              mensaje: error instanceof Error ? error.message : "Error inesperado",
            });
          }
        }
      }
      return { legajos, documentosFallidos };
    },
  });
}

/**
 * Sube archivos sueltos a un legajo ya creado (mismo mapeo de ids del wizard).
 * PENDIENTE (backend): POST /legajos/:id/documentos.
 */
export function useSubirDocumentosInscripcion(opts?: OpcionesCredenciales) {
  return useMutation({
    mutationFn: async ({
      legajoId,
      documentos,
      comprobanteBeca,
    }: {
      legajoId: string;
      documentos: DatosDocumentos;
      comprobanteBeca?: File;
    }) => {
      for (const [id, file] of Object.entries(documentos)) {
        if (!file) continue;
        const tipo = DOCUMENTO_ID_A_TIPO[id];
        if (!tipo) throw new Error(`Documento desconocido: ${id}`);
        await documentosApi.subir(legajoId, file, tipo, opts);
      }
      if (comprobanteBeca) await documentosApi.subir(legajoId, comprobanteBeca, "FORM_BECA", opts);
    },
  });
}
