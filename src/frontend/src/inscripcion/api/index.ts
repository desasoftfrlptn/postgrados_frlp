import { api } from "../../shared/api/client";
import type { Aspirante } from "../types";

export const inscripcionApi = {
  crear: (data: Aspirante) => api.post<Aspirante>("/legajos", data),
};
