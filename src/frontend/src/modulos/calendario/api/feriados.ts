// Consulta y normaliza los feriados nacionales de Argentina.

import type { Evento } from "../tipos";

const URL_API = "https://api.argentinadatos.com/v1/feriados";

interface FeriadoArgentina {
  fecha: string;
  nombre: string;
  tipo: string;
}

function normalizarFeriado(feriado: FeriadoArgentina): Evento {
  const descripciones: Record<string, string> = {
    inamovible: "Feriado nacional inamovible",
    trasladable: "Feriado nacional trasladable",
    puente: "Día no laborable con fines turísticos",
    "no laborable": "Día no laborable",
  };

  return {
    fecha: feriado.fecha,
    titulo: feriado.nombre,
    descripcion:
      descripciones[feriado.tipo] ?? feriado.tipo,
    tipo: "feriado",
  };
}

export async function obtenerFeriados(
  anio: number
): Promise<Evento[]> {
  const respuesta = await fetch(`${URL_API}/${anio}`);

  if (!respuesta.ok) {
    throw new Error(
      `No se pudieron consultar los feriados de ${anio}.`
    );
  }

  const datos: FeriadoArgentina[] = await respuesta.json();

  if (!Array.isArray(datos)) {
    throw new Error("Respuesta de feriados inválida.");
  }

  return datos.map(normalizarFeriado);
}
