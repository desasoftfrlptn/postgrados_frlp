import { mostrarEstadoLegajo } from "../../../../shared/utils/estadosLegajo";
/** Tipos y cálculos sin dependencias externas para el Equipo de Conducción. */
export interface CohorteConduccion {
  id: string;
  nombre: string;
  anio: number;
  carrera_id: string | null;
  abierta: boolean;
  fecha_inicio: string | null;
  created_at: string | null;
}
export interface CarreraConduccion {
  id: string;
  nombre: string;
  activo: boolean;
}
export interface LegajoConduccion {
  id: string;
  cohorte_id: string | null;
  nombre: string;
  apellido: string;
  carrera_elegida: string;
  dni_pasaporte: string;
  correo_electronico: string;
  estado: string;
  solicitud_beca: number | null;
  numero_seguimiento?: string;
}

export function contarPorEstado(legajos: LegajoConduccion[]): Record<string, number> {
  return legajos.reduce<Record<string, number>>((resultado, legajo) => {
    const estado = legajo.estado || "SIN_ESTADO";
    resultado[estado] = (resultado[estado] ?? 0) + 1;
    return resultado;
  }, {});
}

/** Proteger contra inyección de fórmulas al abrir CSV en hojas de cálculo. */
export function campoCSV(valor: unknown): string {
  let texto = String(valor ?? "").replace(/\r\n?/g, "\n");
  if (/^\s*[=+@\-\t]/.test(texto)) texto = "'" + texto;
  return `"${texto.replace(/"/g, '""')}"`;
}

export function construirCSV(
  columnas: string[],
  filas: unknown[][],
): string {
  return [columnas.map(campoCSV).join(";"), ...filas.map((fila) => fila.map(campoCSV).join(";"))].join("\r\n");
}

export function csvLegajos(legajos: LegajoConduccion[]): string {
  return construirCSV(
    ["Nombre", "Apellido", "DNI/Pasaporte", "Correo", "Carrera", "Estado", "Beca solicitada (%)", "Seguimiento"],
    legajos.map((legajo) => [
      legajo.nombre, legajo.apellido, legajo.dni_pasaporte,
      legajo.correo_electronico, legajo.carrera_elegida,
      legajo.estado, legajo.solicitud_beca ?? "", legajo.numero_seguimiento ?? "",
    ]),
  );
}

export function descargarCSV(nombre: string, contenido: string): void {
  const blob = new Blob(["\uFEFF", contenido], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre.replace(/[^\w.-]/g, "_");
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatearEstado(estado: string): string {
  return mostrarEstadoLegajo(estado);
}
