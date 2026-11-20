// Define los tipos compartidos por la administración del sitio público.

export type SeccionHomeAdmin =
  | "inicio"
  | "carreras"
  | "noticias"
  | "contacto"
  | "calendario"
  | "faq";


export interface ConfiguracionPublicaRespuesta {
  seccion: string;
  valores: Record<string, string>;
}


export interface CampoConfiguracionDefinicion {
  clave: string;
  etiqueta: string;
  multilinea?: boolean;
  tipo?: "text" | "email" | "number";
}