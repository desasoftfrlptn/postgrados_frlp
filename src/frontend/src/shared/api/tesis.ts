import { api } from "./client";

export interface CandidatoTesis {
  legajo_id: string;
  estudiante: string;
  carrera: string;
  tipo: string;
  cohorte: string;
}

export interface DatosTesis {
  titulo: string;
  director: string;
  codirector: string | null;
  fecha_aprobacion: string | null;
  numero_resolucion: string | null;
}

export interface RegistroTesis extends CandidatoTesis, DatosTesis {
  id: string;
  version: number;
}

const ruta = "/inscripcion/tesis";
export const tesisApi = {
  listar: (token: string) => api.get<RegistroTesis[]>(`${ruta}/registros`, token),
  candidatos: (token: string) => api.get<CandidatoTesis[]>(`${ruta}/candidatos`, token),
  crear: (datos: DatosTesis & { legajo_id: string }, token: string) =>
    api.post<RegistroTesis>(`${ruta}/registros`, datos, token),
  modificar: (id: string, datos: DatosTesis & { version: number }, token: string) =>
    api.put<RegistroTesis>(`${ruta}/registros/${id}`, datos, token),
};
