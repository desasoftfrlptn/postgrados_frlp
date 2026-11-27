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
