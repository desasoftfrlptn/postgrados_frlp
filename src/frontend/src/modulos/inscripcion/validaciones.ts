export const MAX_TAMANIO_PDF = 5 * 1024 * 1024;

// Valida el formato y tamaño antes de incorporar el documento.
export function validarArchivoPDF(archivo: File): string | null {
  if (
    archivo.type !== "application/pdf" ||
    !archivo.name.toLowerCase().endsWith(".pdf")
  ) {
    return "El archivo debe estar en formato PDF.";
  }

  if (archivo.size === 0) {
    return "El archivo PDF está vacío.";
  }

  if (archivo.size > MAX_TAMANIO_PDF) {
    return "El archivo no puede superar los 5 MB.";
  }

  return null;
}

// Validaciones de los datos personales.

export {
  normalizarDocumento,
  validarDniPasaporte,
  validarNombrePersonal,
} from "../../shared/validaciones/personas";

export function validarTelefonoInscripcion(
  valor: string
): boolean {
  const telefono = valor.trim();
  const digitos = telefono.replace(/\D/g, "");

  return (
    /^\+?[0-9()\s-]+$/.test(telefono) &&
    digitos.length >= 7 &&
    digitos.length <= 15
  );
}

export const LIMITES_DATOS_INSCRIPCION = {
  apellido: 100,
  nombre: 100,
  nacionalidad: 100,
  telefono: 100,
  email: 255,
  correo_alternativo: 255,
  domicilio: 255,
  pais: 100,
  provincia: 200,
  ciudad: 200,
  titulo_anterior: 200,
  universidad_anterior: 200,
  tipo_carrera: 200,
  forma_conocio_ofertas: 100,
} as const;

export function validarLongitud(
  valor: string,
  maximo: number
): boolean {
  return Array.from(valor.trim()).length <= maximo;
}
