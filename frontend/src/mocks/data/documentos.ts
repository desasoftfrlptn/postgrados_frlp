/**
 * src/mocks/data/documentos.ts
 *
 * A diferencia de la versión anterior (generada al azar con semilla),
 * esta está escrita a mano para que cada legajo cuente una historia
 * coherente con su `estado` y su `motivacion`:
 *
 * - leg-001 (ACTIVO, con beca)   → todo aprobado, incluye FORM_BECA
 * - leg-002 (EN_REVISION, beca)  → todo subido, pendiente de revisión
 * - leg-003 (OBSERVADO)          → todo aprobado salvo TITULO_GRADO
 *                                  (coincide con su motivacion, que ya
 *                                  menciona que le falta ese documento)
 * - leg-004 (ACTIVO, cohorte 2024) → todo aprobado hace tiempo
 * - leg-005 (BORRADOR, sin fecha_inscripcion) → sin documentos todavía
 */

import type { DocumentoConEstado } from "@/shared/types/types";

export const documentosFixture: DocumentoConEstado[] = [
  // ── leg-001 · Gómez, Lucía · ACTIVO, solicita_beca ──────────────────
  {
    id: "doc-leg-001-dni",
    legajo_id: "leg-001",
    tipo: "DNI",
    nombre_original: "dni_gomez.pdf",
    tamanio_bytes: 812_000,
    fecha_subida: "2026-03-11T10:00:00Z",
    estado: "APROBADO",
  },
  {
    id: "doc-leg-001-titulo",
    legajo_id: "leg-001",
    tipo: "TITULO_GRADO",
    nombre_original: "titulo_grado_gomez.pdf",
    tamanio_bytes: 1_450_000,
    fecha_subida: "2026-03-11T10:05:00Z",
    estado: "APROBADO",
  },
  {
    id: "doc-leg-001-partida",
    legajo_id: "leg-001",
    tipo: "PARTIDA",
    nombre_original: "partida_nacimiento_gomez.pdf",
    tamanio_bytes: 390_000,
    fecha_subida: "2026-03-11T10:07:00Z",
    estado: "APROBADO",
  },
  {
    id: "doc-leg-001-cuit",
    legajo_id: "leg-001",
    tipo: "CUIT_CUIL",
    nombre_original: "constancia_cuit_gomez.pdf",
    tamanio_bytes: 210_000,
    fecha_subida: "2026-03-11T10:08:00Z",
    estado: "APROBADO",
  },
  {
    id: "doc-leg-001-form-inscripcion",
    legajo_id: "leg-001",
    tipo: "FORM_INSCRIPCION",
    nombre_original: "formulario_inscripcion_gomez.pdf",
    tamanio_bytes: 640_000,
    fecha_subida: "2026-03-11T10:10:00Z",
    estado: "APROBADO",
  },
  {
    id: "doc-leg-001-form-beca",
    legajo_id: "leg-001",
    tipo: "FORM_BECA",
    nombre_original: "formulario_beca_gomez.pdf",
    tamanio_bytes: 580_000,
    fecha_subida: "2026-03-12T09:00:00Z",
    estado: "APROBADO",
  },

  // ── leg-002 · Fernández, Martín · EN_REVISION, solicita_beca ────────
  {
    id: "doc-leg-002-dni",
    legajo_id: "leg-002",
    tipo: "DNI",
    nombre_original: "dni_fernandez.pdf",
    tamanio_bytes: 760_000,
    fecha_subida: "2026-06-03T08:30:00Z",
    estado: "PENDIENTE_REVISION",
  },
  {
    id: "doc-leg-002-titulo",
    legajo_id: "leg-002",
    tipo: "TITULO_GRADO",
    nombre_original: "titulo_grado_fernandez.pdf",
    tamanio_bytes: 1_280_000,
    fecha_subida: "2026-06-03T08:35:00Z",
    estado: "PENDIENTE_REVISION",
  },
  {
    id: "doc-leg-002-partida",
    legajo_id: "leg-002",
    tipo: "PARTIDA",
    nombre_original: "partida_nacimiento_fernandez.pdf",
    tamanio_bytes: 350_000,
    fecha_subida: "2026-06-03T08:37:00Z",
    estado: "PENDIENTE_REVISION",
  },
  {
    id: "doc-leg-002-cuit",
    legajo_id: "leg-002",
    tipo: "CUIT_CUIL",
    nombre_original: "constancia_cuit_fernandez.pdf",
    tamanio_bytes: 195_000,
    fecha_subida: "2026-06-03T08:38:00Z",
    estado: "PENDIENTE_REVISION",
  },
  {
    id: "doc-leg-002-form-inscripcion",
    legajo_id: "leg-002",
    tipo: "FORM_INSCRIPCION",
    nombre_original: "formulario_inscripcion_fernandez.pdf",
    tamanio_bytes: 610_000,
    fecha_subida: "2026-06-03T08:40:00Z",
    estado: "PENDIENTE_REVISION",
  },
  {
    id: "doc-leg-002-form-beca",
    legajo_id: "leg-002",
    tipo: "FORM_BECA",
    nombre_original: "formulario_beca_fernandez.pdf",
    tamanio_bytes: 560_000,
    fecha_subida: "2026-06-03T08:42:00Z",
    estado: "PENDIENTE_REVISION",
  },

  // ── leg-003 · Silva, Carla · OBSERVADO (falta el título de grado) ───
  {
    id: "doc-leg-003-dni",
    legajo_id: "leg-003",
    tipo: "DNI",
    nombre_original: "dni_silva.pdf",
    tamanio_bytes: 700_000,
    fecha_subida: "2026-05-21T09:00:00Z",
    estado: "APROBADO",
  },
  {
    id: "doc-leg-003-titulo",
    legajo_id: "leg-003",
    tipo: "TITULO_GRADO",
    nombre_original: "titulo_grado_silva_v1.pdf",
    tamanio_bytes: 980_000,
    fecha_subida: "2026-05-21T09:05:00Z",
    estado: "OBSERVADO",
    motivo_observacion:
      "La copia del título de grado está incompleta (falta el reverso legalizado). Por favor, volvé a subirlo completo.",
  },
  {
    id: "doc-leg-003-partida",
    legajo_id: "leg-003",
    tipo: "PARTIDA",
    nombre_original: "partida_nacimiento_silva.pdf",
    tamanio_bytes: 410_000,
    fecha_subida: "2026-05-21T09:07:00Z",
    estado: "APROBADO",
  },
  {
    id: "doc-leg-003-cuit",
    legajo_id: "leg-003",
    tipo: "CUIT_CUIL",
    nombre_original: "constancia_cuit_silva.pdf",
    tamanio_bytes: 205_000,
    fecha_subida: "2026-05-21T09:08:00Z",
    estado: "APROBADO",
  },
  {
    id: "doc-leg-003-form-inscripcion",
    legajo_id: "leg-003",
    tipo: "FORM_INSCRIPCION",
    nombre_original: "formulario_inscripcion_silva.pdf",
    tamanio_bytes: 630_000,
    fecha_subida: "2026-05-21T09:10:00Z",
    estado: "APROBADO",
  },
  // Nota: no lleva FORM_BECA porque solicita_beca es false.

  // ── leg-004 · Ramírez, Diego · ACTIVO, cohorte 2024 (ya procesado) ──
  {
    id: "doc-leg-004-dni",
    legajo_id: "leg-004",
    tipo: "DNI",
    nombre_original: "dni_ramirez.pdf",
    tamanio_bytes: 690_000,
    fecha_subida: "2024-04-02T11:00:00Z",
    estado: "APROBADO",
  },
  {
    id: "doc-leg-004-titulo",
    legajo_id: "leg-004",
    tipo: "TITULO_GRADO",
    nombre_original: "titulo_grado_ramirez.pdf",
    tamanio_bytes: 1_120_000,
    fecha_subida: "2024-04-02T11:05:00Z",
    estado: "APROBADO",
  },
  {
    id: "doc-leg-004-partida",
    legajo_id: "leg-004",
    tipo: "PARTIDA",
    nombre_original: "partida_nacimiento_ramirez.pdf",
    tamanio_bytes: 375_000,
    fecha_subida: "2024-04-02T11:07:00Z",
    estado: "APROBADO",
  },
  {
    id: "doc-leg-004-cuit",
    legajo_id: "leg-004",
    tipo: "CUIT_CUIL",
    nombre_original: "constancia_cuit_ramirez.pdf",
    tamanio_bytes: 198_000,
    fecha_subida: "2024-04-02T11:08:00Z",
    estado: "APROBADO",
  },
  {
    id: "doc-leg-004-form-inscripcion",
    legajo_id: "leg-004",
    tipo: "FORM_INSCRIPCION",
    nombre_original: "formulario_inscripcion_ramirez.pdf",
    tamanio_bytes: 605_000,
    fecha_subida: "2024-04-02T11:10:00Z",
    estado: "APROBADO",
  },

  // ── leg-005 · Torres, Ana · BORRADOR ─────────────────────────────────
  // Sin documentos: todavía no envió el formulario a revisión
  // (fecha_inscripcion es null, coherente con 0 documentos subidos).
];

export const documentosState: DocumentoConEstado[] = [...documentosFixture];

export function actualizarDocumento(docId: string, cambios: Partial<DocumentoConEstado>): DocumentoConEstado | null {
  const index = documentosState.findIndex((d) => d.id === docId);
  if (index === -1) return null;
 
  documentosState[index] = { ...documentosState[index], ...cambios };
  return documentosState[index];
}

export const documentosFixture: Documento[] = legajosFixture.flatMap((legajo) => {
  // Cantidad de documentos para este legajo: entre 0 y el total de tipos posibles
  const cantidad = Math.floor(rng() * (TODOS_LOS_TIPOS.length + 1));
  const tiposElegidos = barajar(TODOS_LOS_TIPOS).slice(0, cantidad);

  return tiposElegidos.map((tipo) => ({
    id: `doc-${legajo.id}-${tipo.toLowerCase()}`,
    legajo_id: legajo.id,
    tipo,
    nombre_original: `${NOMBRE_ARCHIVO[tipo]}_${legajo.apellido.toLowerCase().replace(/\s+/g, "_")}.pdf`,
    tamanio_bytes: tamanioAleatorioBytes(),
    fecha_subida: fechaSubidaAleatoria(legajo.fecha_inscripcion),
    url: "data:application/pdf;base64,JVBERi0xLjMKJcTl8uXrp/Og0M0KMyAwIG9iago8PC9MZW5ndGggNCAwIFI+PnN0cmVhbQpCVC9GMSAxMiBUZiAxMDAgNzAwIFRkIChEb2N1bWVudG8gZGUgUHJ1ZWJhIFVTQ09SRTAwMykgVGoFVCBlbmRzdHJlYW0KZW5kb2JqCjQgMCBvYmoKMzQAZW5kb2JqCjEgMCBvYmoKPDwvVHlwZS9QYWdlcy9LaWRzIFsyIDAgUl0vQ291bnQgMS9NZWRpYUJveFswIDAgNTk1IDg0Ml0+PmVuZG9iagoyIDAgb2JqCjw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAxIDAgUj4+PmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAyMDEgMDAwMDAgbiAKMDAwMDAwMDI1OCAwMDAwMCBuIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNzMgMDAwMDAgbiAKdHJhaWxlcjw8L1Jvb3QgMiAwIFIvU2izeHRsMzQ+PnN0YXJ0Zhy=",
  }));
});

/** Helper para el handler de MSW: documentos de un legajo puntual. */
export function getDocumentosPorLegajo(legajoId: string): DocumentoConEstado[] {
  return documentosFixture.filter((d) => d.legajo_id === legajoId);
}