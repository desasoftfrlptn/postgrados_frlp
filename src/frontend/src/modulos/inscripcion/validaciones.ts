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

export function normalizarDocumento(valor: string): string {
  return valor.replace(/[.\s]/g, "").toUpperCase();
}

export function validarDniPasaporte(valor: string): boolean {
  const documento = normalizarDocumento(valor);

  return (
    /^[0-9]{7,8}$/.test(documento) ||
    /^(?=.*[A-Z])[A-Z0-9]{6,20}$/.test(documento)
  );
}

export function validarNombrePersonal(valor: string): boolean {
  return (
    /\p{L}/u.test(valor) &&
    /^[\p{L}\p{M}\s'’-]+$/u.test(valor.trim())
  );
}

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
