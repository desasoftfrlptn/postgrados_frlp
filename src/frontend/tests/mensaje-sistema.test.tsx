
import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";

import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import MensajeSistema from "../src/shared/componentes/MensajeSistema/MensajeSistema";

afterEach(() => {
  vi.useRealTimers();
});

describe("MensajeSistema", () => {
  it("muestra un mensaje de éxito", () => {
    render(
      <MensajeSistema
        tipo="exito"
        texto="Datos guardados correctamente."
      />
    );

    expect(
      screen.getByRole("status")
    ).toHaveTextContent(
      "Datos guardados correctamente."
    );
  });

  it("muestra errores con role alert", () => {
    render(
      <MensajeSistema
        tipo="error"
        texto="No se pudo guardar."
      />
    );

    expect(
      screen.getByRole("alert")
    ).toHaveTextContent(
      "No se pudo guardar."
    );
  });

  it("permite cerrar manualmente", () => {
    const alCerrar = vi.fn();

    render(
      <MensajeSistema
        tipo="informacion"
        texto="Operación en proceso."
        alCerrar={alCerrar}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Cerrar notificación",
      })
    );

    expect(
      screen.queryByRole("status")
    ).not.toBeInTheDocument();

    expect(alCerrar).toHaveBeenCalledOnce();
  });

  it("muestra un mensaje nuevo después de cerrar el anterior", () => {
    const { rerender } = render(
      <MensajeSistema
        tipo="exito"
        texto="Primer mensaje"
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Cerrar notificación",
      })
    );

    rerender(
      <MensajeSistema
        tipo="exito"
        texto="Segundo mensaje"
      />
    );

    expect(
      screen.getByRole("status")
    ).toHaveTextContent("Segundo mensaje");
  });

  it("no muestra mensajes vacíos", () => {
    render(
      <MensajeSistema
        tipo="informacion"
        texto=""
      />
    );

    expect(
      screen.queryByRole("status")
    ).not.toBeInTheDocument();
  });
});
