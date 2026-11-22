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

import {
  normalizarDocumento,
  validarDniPasaporte,
  validarNombrePersonal,
  validarTelefonoInscripcion,
} from "../src/modulos/inscripcion/validaciones";

describe("Validaciones personales", () => {
  it.each([
    "44000000",
    "4400000",
    "44.000.000",
    "AB123456",
    "ab123456",
  ])("acepta el documento %s", (documento) => {
    expect(validarDniPasaporte(documento)).toBe(true);
  });

  it.each([
    "",
    "123",
    "123456789",
    "ABC",
    "AB@123456",
  ])("rechaza el documento inválido %s", (documento) => {
    expect(validarDniPasaporte(documento)).toBe(false);
  });

  it("normaliza documentos antes de enviarlos", () => {
    expect(normalizarDocumento(" 44.000.000 "))
      .toBe("44000000");

    expect(normalizarDocumento(" ab123456 "))
      .toBe("AB123456");
  });

  it.each([
    "María José",
    "García-López",
    "O'Connor",
    "Müller",
    "François",
  ])("acepta nombres internacionales: %s", (nombre) => {
    expect(validarNombrePersonal(nombre)).toBe(true);
  });

  it.each([
    "",
    "   ",
    "12345",
    "Juan123",
    "---",
  ])("rechaza nombres inválidos: %s", (nombre) => {
    expect(validarNombrePersonal(nombre)).toBe(false);
  });

  it.each([
    "2215551234",
    "+54 221 5551234",
    "+39 (06) 12345678",
    "221-555-1234",
  ])("acepta teléfonos válidos: %s", (telefono) => {
    expect(validarTelefonoInscripcion(telefono))
      .toBe(true);
  });

  it.each([
    "",
    "123",
    "abcdef",
    "1234567890123456",
    "++542215551234",
  ])("rechaza teléfonos inválidos: %s", (telefono) => {
    expect(validarTelefonoInscripcion(telefono))
      .toBe(false);
  });
});
