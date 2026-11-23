import { describe, expect, it } from "vitest";

import {
  emailValido,
  telefonoValido,
  enlaceValido,
  validarContacto,
  obtenerEnlaceTelefono,
} from "../src/shared/validaciones/contacto";

describe("Validaciones de contacto", () => {
  it("acepta un correo válido", () => {
    expect(
      emailValido("posgrado@example.com")
    ).toBe(true);
  });

  it("rechaza un correo inválido", () => {
    expect(emailValido("correo-invalido")).toBe(false);
  });

  it("acepta teléfonos con código internacional", () => {
    expect(
      telefonoValido("+54 221 4277270")
    ).toBe(true);
  });

  it("rechaza teléfonos demasiado cortos", () => {
    expect(telefonoValido("123")).toBe(false);
  });

  it("rechaza letras en teléfonos", () => {
    expect(telefonoValido("221 ABC1234")).toBe(false);
  });

  it("acepta una red social sin configurar", () => {
    expect(enlaceValido("")).toBe(true);
  });

  it("acepta enlaces HTTPS", () => {
    expect(
      enlaceValido("https://www.instagram.com/utn")
    ).toBe(true);
  });

  it("rechaza protocolos no permitidos", () => {
    expect(
      enlaceValido("javascript:alert(1)")
    ).toBe(false);
  });

  it("rechaza enlaces con credenciales", () => {
    expect(
      enlaceValido("https://usuario:clave@example.com")
    ).toBe(false);
  });

  it("rechaza campos obligatorios vacíos", () => {
    const errores = validarContacto({
      titulo: "   ",
    });

    expect(errores.titulo).toBeDefined();
    expect(errores.email).toBeDefined();
    expect(errores.facebook).toBeUndefined();
  });

  it("acepta una configuración completa y válida", () => {
    const errores = validarContacto({
      titulo: "Contacto",
      descripcion: "Información institucional",
      formulario_titulo: "Envianos tu consulta",
      formulario_descripcion: "Completá el formulario",
      direccion: "Calle 60 y 124",
      email: "posgrado@example.com",
      telefono: "+54 221 4277270",
      horario: "Lunes a viernes",
      facebook: "",
      instagram: "",
      linkedin: "",
      youtube: "",
    });

    expect(errores).toEqual({});
  });

  it("normaliza el enlace telefónico", () => {
    expect(
      obtenerEnlaceTelefono("+54 (221) 427-7270")
    ).toBe("tel:+542214277270");
  });
});