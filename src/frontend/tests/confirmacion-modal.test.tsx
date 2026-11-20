
import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";

import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import ConfirmacionModal from "../src/shared/componentes/ConfirmacionModal/ConfirmacionModal";

describe("ConfirmacionModal", () => {
  it("permanece oculto cuando abierto es false", () => {
    render(
      <ConfirmacionModal
        abierto={false}
        titulo="¿Eliminar?"
        descripcion="Se eliminará el registro."
        alConfirmar={vi.fn()}
        alCancelar={vi.fn()}
      />
    );

    expect(
      screen.queryByRole("alertdialog")
    ).not.toBeInTheDocument();
  });

  it("muestra el título y la descripción", () => {
    render(
      <ConfirmacionModal
        abierto
        titulo="¿Guardar cambios?"
        descripcion="Se actualizarán los datos."
        alConfirmar={vi.fn()}
        alCancelar={vi.fn()}
      />
    );

    expect(
      screen.getByRole("alertdialog", {
        name: "¿Guardar cambios?",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText("Se actualizarán los datos.")
    ).toBeInTheDocument();
  });

  it("permite confirmar la operación", () => {
    const alConfirmar = vi.fn();

    render(
      <ConfirmacionModal
        abierto
        titulo="¿Guardar?"
        descripcion="Se guardarán los cambios."
        alConfirmar={alConfirmar}
        alCancelar={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Confirmar",
      })
    );

    expect(alConfirmar).toHaveBeenCalledOnce();
  });

  it("permite cancelar con Escape", () => {
    const alCancelar = vi.fn();

    render(
      <ConfirmacionModal
        abierto
        titulo="¿Eliminar?"
        descripcion="Se eliminará el registro."
        alConfirmar={vi.fn()}
        alCancelar={alCancelar}
      />
    );

    fireEvent.keyDown(document, {
      key: "Escape",
    });

    expect(alCancelar).toHaveBeenCalledOnce();
  });

  it("no permite confirmar mientras está procesando", () => {
    const alConfirmar = vi.fn();

    render(
      <ConfirmacionModal
        abierto
        titulo="¿Publicar?"
        descripcion="La noticia será publicada."
        confirmando
        alConfirmar={alConfirmar}
        alCancelar={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", {
        name: "Procesando...",
      })
    ).toBeDisabled();

    expect(alConfirmar).not.toHaveBeenCalled();
  });

  it("coloca el foco inicialmente en Cancelar", () => {
    render(
      <ConfirmacionModal
        abierto
        titulo="¿Eliminar?"
        descripcion="Se eliminará el registro."
        alConfirmar={vi.fn()}
        alCancelar={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", {
        name: "Cancelar",
      })
    ).toHaveFocus();
  });
});
