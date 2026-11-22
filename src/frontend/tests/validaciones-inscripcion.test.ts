import { describe, expect, it } from "vitest";

import {
  MAX_TAMANIO_PDF,
  validarArchivoPDF,
} from "../src/modulos/inscripcion/validaciones";

function crearArchivo(
  nombre: string,
  tipo: string,
  tamanio: number
) {
  return new File(
    [new Uint8Array(tamanio)],
    nombre,
    { type: tipo }
  );
}

describe("Validaciones de documentos de inscripción", () => {
  it("acepta un archivo PDF dentro del límite", () => {
    const archivo = crearArchivo(
      "documento.pdf",
      "application/pdf",
      1024
    );

    expect(validarArchivoPDF(archivo)).toBeNull();
  });

  it("acepta la extensión PDF en mayúsculas", () => {
    const archivo = crearArchivo(
      "documento.PDF",
      "application/pdf",
      1024
    );

    expect(validarArchivoPDF(archivo)).toBeNull();
  });

  it("rechaza archivos que no son PDF", () => {
    const archivo = crearArchivo(
      "documento.png",
      "image/png",
      1024
    );

    expect(validarArchivoPDF(archivo))
      .toBe("El archivo debe estar en formato PDF.");
  });

  it("rechaza una extensión incorrecta", () => {
    const archivo = crearArchivo(
      "documento.txt",
      "application/pdf",
      1024
    );

    expect(validarArchivoPDF(archivo))
      .toBe("El archivo debe estar en formato PDF.");
  });

  it("rechaza un tipo MIME incorrecto", () => {
    const archivo = crearArchivo(
      "documento.pdf",
      "text/plain",
      1024
    );

    expect(validarArchivoPDF(archivo))
      .toBe("El archivo debe estar en formato PDF.");
  });

  it("rechaza archivos vacíos", () => {
    const archivo = crearArchivo(
      "documento.pdf",
      "application/pdf",
      0
    );

    expect(validarArchivoPDF(archivo))
      .toBe("El archivo PDF está vacío.");
  });

  it("acepta exactamente 5 MB", () => {
    const archivo = crearArchivo(
      "documento.pdf",
      "application/pdf",
      MAX_TAMANIO_PDF
    );

    expect(validarArchivoPDF(archivo)).toBeNull();
  });

  it("rechaza archivos superiores a 5 MB", () => {
    const archivo = crearArchivo(
      "documento.pdf",
      "application/pdf",
      MAX_TAMANIO_PDF + 1
    );

    expect(validarArchivoPDF(archivo))
      .toBe("El archivo no puede superar los 5 MB.");
  });
});
