import { describe, expect, it } from "vitest";

import {
  mostrarEstadoLegajo,
} from "../src/shared/utils/estadosLegajo";

describe("Estados del legajo", () => {
  it.each([
    ["BORRADOR", "Borrador"],
    ["PENDIENTE", "Pendiente de revisión"],
    ["EN_REVISION", "En revisión"],
    ["OBSERVADO", "Requiere correcciones"],
    ["COMPLETADO", "Aprobada"],
    ["RECHAZADO", "Rechazada"],
    ["ACTIVO", "Matriculada"],
    ["EN_RIESGO", "En riesgo"],
    ["VENCIDO", "Vencida"],
    ["BAJA", "De baja"],
    ["GRADUADO", "Graduado"],
  ])("representa correctamente %s", (estado, esperado) => {
    expect(mostrarEstadoLegajo(estado)).toBe(esperado);
  });

  it("normaliza espacios y minúsculas", () => {
    expect(mostrarEstadoLegajo(" pendiente "))
      .toBe("Pendiente de revisión");
  });

  it("maneja estados desconocidos", () => {
    expect(mostrarEstadoLegajo("ESTADO_NUEVO"))
      .toBe("Estado nuevo");
  });

  it.each([null, undefined, "", "   "])(
    "maneja estados sin información: %s",
    (estado) => {
      expect(mostrarEstadoLegajo(estado))
        .toBe("Sin información");
    },
  );
});
