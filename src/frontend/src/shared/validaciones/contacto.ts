export const REDES_SOCIALES = [
  "facebook",
  "instagram",
  "linkedin",
  "youtube",
] as const;

export const CAMPOS_CONTACTO = [
  "titulo",
  "descripcion",
  "formulario_titulo",
  "formulario_descripcion",
  "direccion",
  "email",
  "telefono",
  "horario",
  ...REDES_SOCIALES,
] as const;

export type CampoContacto =
  (typeof CAMPOS_CONTACTO)[number];

export type ErroresContacto =
  Partial<Record<CampoContacto, string>>;

export function emailValido(valor: string): boolean {
  return (
    valor.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)
  );
}

export function telefonoValido(valor: string): boolean {
  const digitos = valor.replace(/\D/g, "");

  return (
    /^\+?[0-9 ()-]+$/.test(valor) &&
    digitos.length >= 7 &&
    digitos.length <= 15
  );
}

export function enlaceValido(valor: string): boolean {
  if (!valor.trim()) return true;

  if (
    valor.length > 500 ||
    /\s/.test(valor) ||
    valor.includes("\\")
  ) {
    return false;
  }

  try {
    const url = new URL(valor);

    return (
      ["http:", "https:"].includes(url.protocol) &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function validarContacto(
  valores: Record<string, string>
): ErroresContacto {
  const errores: ErroresContacto = {};

  for (const campo of CAMPOS_CONTACTO) {
    const valor = (valores[campo] ?? "").trim();

    const esRedSocial = REDES_SOCIALES.some(
      (red) => red === campo
    );

    if (esRedSocial) {
      if (!enlaceValido(valor)) {
        errores[campo] = "Ingresá un enlace HTTP o HTTPS válido.";
      }

      continue;
    }

    if (!valor) {
      errores[campo] = "Este campo es obligatorio.";
      continue;
    }

    if (valor.length > 1000) {
      errores[campo] = "El campo es demasiado largo.";
      continue;
    }

    if (campo === "email" && !emailValido(valor)) {
      errores[campo] = "Ingresá un correo electrónico válido.";
    }

    if (campo === "telefono" && !telefonoValido(valor)) {
      errores[campo] = "Ingresá un teléfono válido.";
    }
  }

  return errores;
}

export function obtenerEnlaceTelefono(
  telefono: string
): string {
  return `tel:${telefono.replace(/[^+\d]/g, "")}`;
}