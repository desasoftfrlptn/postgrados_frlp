// Define las operaciones de API relacionadas con las inscripciones.

import { api } from "../../../shared/api/client";
import type { Aspirante } from "../tipos";

export const inscripcionApi = {
  crear: (data: Aspirante) => api.post<Aspirante>("/legajos", data),
};