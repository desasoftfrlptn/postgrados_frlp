// Define las operaciones de API relacionadas con las inscripciones.

// Define las operaciones de API relacionadas con las inscripciones.

import { api } from "../../../shared/api/client";
import type {
  Aspirante,
  EstadoInscripcion,
} from "../tipos";

export const inscripcionApi = {
  crear: (data: Aspirante) =>
    api.post<Aspirante>("/legajos", data),

  consultarEstado: (
    numeroSeguimiento: string,
    dniPasaporte: string
  ) =>
    api.get<EstadoInscripcion>(
      `/inscripcion/seguimiento/${encodeURIComponent(numeroSeguimiento)}?dni_pasaporte=${encodeURIComponent(dniPasaporte)}`
    ),
};