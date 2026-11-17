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
/*
export interface DatosInscripcion {
  carreraElegida: string;
  apellido: string;
  nombre: string;
  nacionalidad: string;
  dniPasaporte: string;
  telefonoMovil: string;
  email: string;
  correoAlternativo: string;
  domicilio: string;
  pais: string;
  provincia: string;
  ciudad: string;
  tituloAnterior: string;
  universidadAnterior: string;
  formaConocioOfertas: string;
  motivosCursar: string;
  solicitudBeca: string;
}
  */