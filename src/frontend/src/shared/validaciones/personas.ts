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
