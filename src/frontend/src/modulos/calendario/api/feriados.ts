// Consulta y normaliza feriados de Argentina desde Calendarific.

import type {
  Evento,
  FeriadoCalendarific,
  RespuestaCalendarific,
} from "../tipos";

const URL_API = "https://calendarific.com/api/v2/holidays";

const nombresEnEspanol: Record<string, string> = {
  "New Year's Day": "Año Nuevo",
  "Carnival / Shrove Monday": "Carnaval",
  "Carnival / Shrove Tuesday / Pancake Day": "Carnaval",
  "Tourist Bridge Holiday": "Día no laborable con fines turísticos",
  "Memorial Day": "Día Nacional de la Memoria por la Verdad y la Justicia",
  "Day of the Veterans":
    "Día del Veterano y de los Caídos en la Guerra de Malvinas",
  "Good Friday": "Viernes Santo",
  "Labor Day": "Día del Trabajador",
  "Labor Day / May Day": "Día del Trabajador",
  "National Day/May 1810 Revolution": "Día de la Revolución de Mayo",
  "Day off for the Commemoration of General Don Martín Miguel de Güemes":
    "Paso a la Inmortalidad del General Martín Miguel de Güemes",
  "Commemoration of General Don Martín Miguel de Güemes":
    "Paso a la Inmortalidad del General Martín Miguel de Güemes",
  "Flag Day": "Día de la Bandera",
  "Independence day": "Día de la Independencia",
  "San Martín Day": "Paso a la Inmortalidad del General José de San Martín",
  "Rosh Hashana Eve": "Víspera de Rosh Hashaná",
  "Rosh Hashana": "Rosh Hashaná",
  "Second day of Rosh Hashana": "Segundo día de Rosh Hashaná",
  "Yom Kippur Eve": "Víspera de Iom Kipur",
  "Yom Kippur": "Iom Kipur",
  "Day of Respect for Cultural Diversity":
    "Día del Respeto a la Diversidad Cultural",
  "National Sovereignty Day": "Día de la Soberanía Nacional",
  "Immaculate Conception": "Inmaculada Concepción de María",
  "Christmas Day": "Navidad",
};

function normalizarFeriado(feriado: FeriadoCalendarific): Evento {
  const esNacional = feriado.type.some((tipo) =>
    tipo.toLowerCase().includes("national"),
  );

  return {
    fecha: feriado.date.iso.substring(0, 10),
    titulo:
      nombresEnEspanol[feriado.name] ||
      (esNacional ? "Feriado nacional" : "Fecha religiosa"),
    descripcion: esNacional ? "Feriado nacional" : "Día no laborable religioso",
    tipo: "feriado",
  };
}

export async function obtenerFeriados(anio: number): Promise<Evento[]> {
  const apiKey = import.meta.env.VITE_CALENDARIFIC_API_KEY;

  if (!apiKey) {
    throw new Error("Falta configurar la API key de Calendarific");
  }

  const url =
    `${URL_API}?api_key=${apiKey}` +
    `&country=AR&year=${anio}&type=national,religious`;

  const respuesta = await fetch(url);

  if (!respuesta.ok) {
    throw new Error("No se pudo consultar Calendarific");
  }

  const datos: RespuestaCalendarific = await respuesta.json();

  return datos.response.holidays.map(normalizarFeriado);
}