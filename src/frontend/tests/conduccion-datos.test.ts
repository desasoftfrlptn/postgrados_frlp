import { describe, expect, it } from "vitest";
import { campoCSV, construirCSV, contarPorEstado, csvLegajos, type LegajoConduccion } from "../src/modulos/perfiles/conduccion/datos/conduccionDatos";

const legajos: LegajoConduccion[] = [
  { id:"1", cohorte_id:"a", nombre:"Ana", apellido:"López", carrera_elegida:"Datos", dni_pasaporte:"123", correo_electronico:"ana@example.com", estado:"PENDIENTE", solicitud_beca:30, numero_seguimiento:"SEG-1" },
  { id:"2", cohorte_id:"a", nombre:"Leo", apellido:"Paz", carrera_elegida:"Datos", dni_pasaporte:"456", correo_electronico:"leo@example.com", estado:"ACTIVO", solicitud_beca:null },
  { id:"3", cohorte_id:"b", nombre:"Sol", apellido:"Ruiz", carrera_elegida:"Historia", dni_pasaporte:"789", correo_electronico:"sol@example.com", estado:"PENDIENTE", solicitud_beca:100 },
];

describe("Conducción: estadísticas y exportaciones", () => {
  it("cuenta estados sin duplicar personas", () => {
    expect(contarPorEstado(legajos)).toEqual({ PENDIENTE: 2, ACTIVO: 1 });
  });
  it("genera CSV de datos reales", () => {
    const csv = csvLegajos(legajos);
    expect(csv).toContain('"López"');
    expect(csv).toContain('"SEG-1"');
    expect(csv).toContain('"30"');
  });
  it("escapa comillas y separadores", () => {
    expect(construirCSV(["Nombre"], [['Ana; "test"']])).toContain('"Ana; ""test"""');
  });
  it("neutraliza fórmulas peligrosas en Excel", () => {
    expect(campoCSV('=HYPERLINK("x")')).toMatch(/^"'/);
    expect(campoCSV('+SUM(1,1)')).toMatch(/^"'/);
    expect(campoCSV('@cmd')).toMatch(/^"'/);
  });
});
