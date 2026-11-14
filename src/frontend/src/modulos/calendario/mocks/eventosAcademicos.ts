// Datos temporales de eventos académicos propios de la facultad.

import type { Evento } from "../tipos";

export const eventosAcademicos: Evento[] = [
  {
    fecha: "2026-02-17",
    titulo: "Inscripción a carreras",
    descripcion: "Inscripción a carreras y materias de todos los niveles",
    tipo: "inscripcion",
  },
  {
    fecha: "2026-04-04",
    titulo: "Inicio de clases",
    descripcion: "Comienzo Ciclo Lectivo 2026",
    tipo: "clases",
  },
  {
    fecha: "2026-04-16",
    titulo: "Mesa de examen final",
    descripcion: "Sin actividad. 1er turno de examen final.",
    tipo: "examen",
  },
  {
    fecha: "2026-05-02",
    titulo: "Día del personal docente universitario",
    descripcion: "Sin actividad académica",
    tipo: "otros",
  },
];