import { api } from "./client";

export interface ConfiguracionContactoRespuesta {
  seccion: string;
  valores: Record<string, string>;
}

export interface ContactoPublicoContexto {
  configuracion: Record<string, string>;
  cargando: boolean;
  error: string;
}

export interface ConsultaContacto {
  nombre: string;
  email: string;
  asunto: string;
  mensaje: string;
}

export interface ConsultaContactoRespuesta {
  mensaje: string;
}

const RUTA_CONTACTO = "/configuracion-publica/contacto";

export function obtenerConfiguracionContacto() {
  return api.get<ConfiguracionContactoRespuesta>(
    RUTA_CONTACTO
  );
}

export function actualizarConfiguracionContacto(
  valores: Record<string, string>,
  token: string
) {
  return api.put<ConfiguracionContactoRespuesta>(
    RUTA_CONTACTO,
    { valores },
    token
  );
}

export function restablecerConfiguracionContacto(
  token: string
) {
  return api.post<ConfiguracionContactoRespuesta>(
    `${RUTA_CONTACTO}/restablecer`,
    undefined,
    token
  );
}

export function enviarConsultaContacto(
  consulta: ConsultaContacto
) {
  return api.post<ConsultaContactoRespuesta>(
    `${RUTA_CONTACTO}/consultas`,
    consulta
  );
}