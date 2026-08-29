import type { Documento, TipoDocumento } from "@/shared/types/types";
import { legajosFixture } from "./legajos";

const SEMILLA = 20260824;

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(SEMILLA);

const TODOS_LOS_TIPOS: TipoDocumento[] = [
  "DNI",
  "TITULO_GRADO",
  "PARTIDA",
  "CUIT_CUIL",
  "FORM_INSCRIPCION",
  "FORM_BECA",
  "TITULO_POSGRADO",
];

const NOMBRE_ARCHIVO: Record<TipoDocumento, string> = {
  DNI: "dni",
  TITULO_GRADO: "titulo_grado",
  PARTIDA: "partida_nacimiento",
  CUIT_CUIL: "constancia_cuit",
  FORM_INSCRIPCION: "formulario_inscripcion",
  FORM_BECA: "formulario_beca",
  TITULO_POSGRADO: "titulo_posgrado",
};

/** Fisher-Yates con el RNG con semilla, para que el orden sea determinístico. */
function barajar<T>(arr: T[]): T[] {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function tamanioAleatorioBytes(): number {
  // Entre 80KB y 4.5MB — por debajo del límite de 5MB (RF-CORE-002)
  const minKB = 80;
  const maxKB = 4500;
  return Math.round((minKB + rng() * (maxKB - minKB)) * 1024);
}

function fechaSubidaAleatoria(fechaInscripcion: string | null): string {
  const base = fechaInscripcion ? new Date(fechaInscripcion) : new Date();
  const diasDespues = Math.floor(rng() * 10); // sube el documento hasta 10 días después de inscribirse
  base.setDate(base.getDate() + diasDespues);
  return base.toISOString();
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
  }));
});

/** Helper para el handler de MSW: documentos de un legajo puntual. */
export function getDocumentosPorLegajo(legajoId: string): Documento[] {
  return documentosFixture.filter((d) => d.legajo_id === legajoId);
}