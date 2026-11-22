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
