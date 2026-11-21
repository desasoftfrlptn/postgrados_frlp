import {
  fireEvent,
  render,
  screen,
  waitFor,
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

it("no conserva el error de una apertura anterior", async () => {
  const props = {
    titulo: "Confirmar",
    descripcion: "Operación de prueba",
    alConfirmar: vi.fn().mockRejectedValueOnce(new Error("Error")),
    alCancelar: vi.fn(),
  };
  const { rerender } = render(<ConfirmacionModal {...props} abierto />);
  fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled());
  rerender(<ConfirmacionModal {...props} abierto={false} />);
  rerender(<ConfirmacionModal {...props} abierto />);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("mantiene el foco dentro del diálogo al pulsar Tab", () => {
  render(<ConfirmacionModal abierto titulo="Confirmar" descripcion="Prueba" alConfirmar={vi.fn()} alCancelar={vi.fn()} />);
  const cancelar = screen.getByRole("button", { name: "Cancelar" });
  const confirmar = screen.getByRole("button", { name: "Confirmar" });
  expect(cancelar).toHaveFocus();
  fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
  expect(confirmar).toHaveFocus();
  fireEvent.keyDown(document, { key: "Tab" });
  expect(cancelar).toHaveFocus();
});
