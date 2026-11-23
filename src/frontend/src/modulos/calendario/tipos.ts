// Tipos utilizados por el calendario académico.

export type TipoEvento =
  | "clases"
  | "inscripcion"
  | "examen"
  | "feriado"
  | "otros";

export type Evento = {
  fecha: string;
  titulo: string;
  descripcion: string;
  tipo: TipoEvento;
};

export type FeriadoCalendarific = {
  name: string;
  date: {
    iso: string;
  };
  type: string[];
};

export type RespuestaCalendarific = {
  response: {
    holidays: FeriadoCalendarific[];
  };
};