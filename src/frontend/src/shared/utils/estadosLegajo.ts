export const ETIQUETAS_ESTADO_LEGAJO: Readonly<Record<string, string>> = {
  BORRADOR: "Borrador",
  PENDIENTE: "Pendiente de revisión",
  EN_REVISION: "En revisión",
  OBSERVADO: "Requiere correcciones",
  COMPLETADO: "Aprobada",
  RECHAZADO: "Rechazada",
  ACTIVO: "Matriculada",
  EN_RIESGO: "En riesgo",
  VENCIDO: "Vencida",
  BAJA: "De baja",
  GRADUADO: "Graduado",
};

export function mostrarEstadoLegajo(
  estado: string | null | undefined,
): string {
  const valor = estado?.trim().toUpperCase();

  if (!valor) {
    return "Sin información";
  }

  return (
    ETIQUETAS_ESTADO_LEGAJO[valor] ??
    valor
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/^./, (letra) => letra.toUpperCase())
  );
}
