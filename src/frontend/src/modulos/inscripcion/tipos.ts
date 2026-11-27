// Define los tipos de datos utilizados en el módulo de inscripción.

export interface Aspirante {
  id: string;
  dni: string;
  apellido: string;
  nombre: string;
  email: string;
  telefonoMovil: string;
  carreraElegida: string;
  estado: string;
}

export interface EstadoInscripcion {
  numero_seguimiento: string;
  estado: string;
  observaciones?: string | string[] | null;
  documentacion_pendiente?: string[];
  documentacion_a_corregir?: string[];
}