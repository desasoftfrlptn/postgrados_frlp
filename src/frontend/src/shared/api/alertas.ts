import { api } from "./client";
export interface Alerta { id: string; titulo: string; mensaje: string; ruta: string; fecha: string; leida: boolean }
export interface BandejaAlertas { sin_leer: number; alertas: Alerta[] }
const ruta = "/inscripcion/alertas";
export const alertasApi = {
  listar: async (token: string): Promise<BandejaAlertas> => {
    const datos = await api.get<BandejaAlertas>(ruta, token);
    if (!datos || !Number.isInteger(datos.sin_leer) || datos.sin_leer < 0 || !Array.isArray(datos.alertas) ||
        datos.alertas.some(a => !a || typeof a.id !== "string" || typeof a.titulo !== "string" ||
          typeof a.mensaje !== "string" || typeof a.leida !== "boolean" || typeof a.fecha !== "string" ||
          !Number.isFinite(Date.parse(a.fecha)) || typeof a.ruta !== "string" || !a.ruta.startsWith("/dashboard"))) {
      throw new Error("El servidor devolvió una bandeja con formato inválido.");
    }
    return datos;
  },
  leer: (token: string, id?: string) => api.patch<{ ok: boolean }>(id ? `${ruta}/${id}/leida` : `${ruta}/leidas`, undefined, token),
};
