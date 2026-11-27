import { describe, expect, it } from "vitest";

import {
  borradorVencido,
  VIGENCIA_BORRADOR_MS,
} from "../src/modulos/inscripcion/borrador";

describe("Vigencia de borradores de inscripción", () => {
  const ahora = new Date(
    "2026-11-22T12:00:00Z"
  ).getTime();

  it("mantiene un borrador reciente", () => {
    expect(
      borradorVencido(ahora - 1000, ahora)
    ).toBe(false);
  });

  it("mantiene un borrador antes del límite", () => {
    expect(
      borradorVencido(
        ahora - VIGENCIA_BORRADOR_MS + 1,
        ahora
      )
    ).toBe(false);
  });

  it("considera vencido un borrador de exactamente 24 horas", () => {
    expect(
      borradorVencido(
        ahora - VIGENCIA_BORRADOR_MS,
        ahora
      )
    ).toBe(true);
  });

  it("considera vencido un borrador antiguo", () => {
    expect(
      borradorVencido(
        ahora - VIGENCIA_BORRADOR_MS * 2,
        ahora
      )
    ).toBe(true);
  });

  it.each([
    NaN,
    Infinity,
    0,
    -1,
  ])("rechaza una fecha inválida: %s", (fecha) => {
    expect(
      borradorVencido(fecha, ahora)
    ).toBe(true);
  });

  it("rechaza una fecha futura", () => {
    expect(
      borradorVencido(ahora + 1000, ahora)
    ).toBe(true);
  });
});
