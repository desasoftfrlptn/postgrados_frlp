import { api } from "./client";

export interface DatosPreguntaFrecuente {
  categoria: string;
  pregunta: string;
  respuesta: string;
  orden: number;
  activa: boolean;
}

export interface PreguntaFrecuente
  extends DatosPreguntaFrecuente {
  id: string;
}

const BASE = "/configuracion-publica/faq";

export const faqApi = {
  listarPublicas() {
    return api.get<PreguntaFrecuente[]>(
      `${BASE}/publicas`
    );
  },

  listarAdministracion(token: string) {
    return api.get<PreguntaFrecuente[]>(
      `${BASE}/admin`,
      token
    );
  },

  crear(datos: DatosPreguntaFrecuente, token: string) {
    return api.post<PreguntaFrecuente>(
      `${BASE}/admin`,
      datos,
      token
    );
  },

  modificar(
    id: string,
    datos: DatosPreguntaFrecuente,
    token: string
  ) {
    return api.put<PreguntaFrecuente>(
      `${BASE}/admin/${encodeURIComponent(id)}`,
      datos,
      token
    );
  },

  cambiarEstado(
    id: string,
    activa: boolean,
    token: string
  ) {
    return api.patch<PreguntaFrecuente>(
      `${BASE}/admin/${encodeURIComponent(id)}/estado`,
      { activa },
      token
    );
  },
};
