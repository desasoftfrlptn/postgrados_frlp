import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import FaqAdmin from "../src/modulos/perfiles/administrador/home/secciones/FaqAdmin";
import { faqApi } from "../src/shared/api/faq";

vi.mock("../src/shared/api/faq", () => ({
  faqApi: {
    listarAdministracion: vi.fn(),
    crear: vi.fn(),
    modificar: vi.fn(),
    cambiarEstado: vi.fn(),
  },
}));

vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({
  useAuth: () => ({
    user: {
      token: "token-admin",
      rol: "ADMIN",
    },
  }),
}));

const pregunta = {
  id: "faq-1",
  categoria: "Inscripción",
  pregunta: "¿Cómo me inscribo?",
  respuesta: "Completando el formulario de inscripción.",
  orden: 1,
  activa: true,
};

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(faqApi.listarAdministracion)
    .mockResolvedValue([pregunta]);

  vi.mocked(faqApi.crear)
    .mockResolvedValue({
      ...pregunta,
      id: "faq-2",
      pregunta: "¿Cómo consulto mi inscripción?",
    });

  vi.mocked(faqApi.modificar)
    .mockResolvedValue({
      ...pregunta,
      respuesta: "Respuesta actualizada.",
    });

  vi.mocked(faqApi.cambiarEstado)
    .mockResolvedValue({
      ...pregunta,
      activa: false,
    });
});

async function abrirAdministrador() {
  render(<FaqAdmin />);

  await screen.findByText(pregunta.pregunta);
}

function completarNuevaPregunta() {
  fireEvent.click(
    screen.getByRole("button", {
      name: "+ Nueva pregunta",
    })
  );

  fireEvent.change(
    screen.getByLabelText("Categoría"),
    { target: { value: "Inscripción" } }
  );

  fireEvent.change(
    screen.getByLabelText("Pregunta"),
    {
      target: {
        value: "¿Cómo consulto mi inscripción?",
      },
    }
  );

  fireEvent.change(
    screen.getByLabelText("Respuesta"),
    {
      target: {
        value: "Desde el seguimiento público.",
      },
    }
  );

  fireEvent.click(
    screen.getByRole("button", {
      name: "Guardar pregunta",
    })
  );
}

function confirmar(nombre = "Confirmar guardado") {
  fireEvent.click(
    within(screen.getByRole("alertdialog"))
      .getByRole("button", { name: nombre })
  );
}

function cancelarConfirmacion() {
  fireEvent.click(
    within(screen.getByRole("alertdialog"))
      .getByRole("button", { name: "Cancelar" })
  );
}

describe("Administración de preguntas frecuentes", () => {
  it("consulta las preguntas del backend", async () => {
    await abrirAdministrador();

    expect(faqApi.listarAdministracion)
      .toHaveBeenCalledWith("token-admin");

    expect(screen.getByText("Activa"))
      .toBeInTheDocument();
  });

  it("no crea preguntas antes de confirmar", async () => {
    await abrirAdministrador();

    completarNuevaPregunta();

    expect(screen.getByRole("alertdialog"))
      .toBeInTheDocument();

    expect(faqApi.crear).not.toHaveBeenCalled();
  });

  it("crea una pregunta después de confirmar", async () => {
    await abrirAdministrador();

    completarNuevaPregunta();

    confirmar();

    await waitFor(() => {
      expect(faqApi.crear).toHaveBeenCalledTimes(1);
    });

    expect(
      await screen.findByText(
        "Pregunta creada correctamente."
      )
    ).toBeInTheDocument();
  });

  it("conserva los datos al cancelar el guardado", async () => {
    await abrirAdministrador();

    completarNuevaPregunta();

    cancelarConfirmacion();

    expect(faqApi.crear).not.toHaveBeenCalled();

    expect(screen.getByLabelText("Pregunta"))
      .toHaveValue("¿Cómo consulto mi inscripción?");
  });

  it("modifica una pregunta existente", async () => {
    await abrirAdministrador();

    fireEvent.click(
      screen.getByRole("button", { name: "Editar" })
    );

    fireEvent.change(
      screen.getByLabelText("Respuesta"),
      {
        target: {
          value: "Respuesta actualizada.",
        },
      }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Guardar pregunta",
      })
    );

    expect(faqApi.modificar).not.toHaveBeenCalled();

    confirmar();

    await waitFor(() => {
      expect(faqApi.modificar)
        .toHaveBeenCalledWith(
          "faq-1",
          expect.objectContaining({
            respuesta: "Respuesta actualizada.",
          }),
          "token-admin"
        );
    });
  });

  it("no desactiva si se cancela", async () => {
    await abrirAdministrador();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Desactivar",
      })
    );

    cancelarConfirmacion();

    expect(faqApi.cambiarEstado)
      .not.toHaveBeenCalled();
  });

  it("desactiva después de confirmar", async () => {
    await abrirAdministrador();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Desactivar",
      })
    );

    confirmar("Desactivar");

    await waitFor(() => {
      expect(faqApi.cambiarEstado)
        .toHaveBeenCalledWith(
          "faq-1",
          false,
          "token-admin"
        );
    });

    expect(await screen.findByText("Inactiva"))
      .toBeInTheDocument();
  });

  it("informa un error sin perder el formulario", async () => {
    vi.mocked(faqApi.crear)
      .mockRejectedValueOnce(
        new Error("No se pudo guardar.")
      );

    await abrirAdministrador();

    completarNuevaPregunta();

    confirmar();

    expect(
      await screen.findByText("No se pudo guardar.")
    ).toBeInTheDocument();

    expect(screen.getByLabelText("Pregunta"))
      .toHaveValue("¿Cómo consulto mi inscripción?");
  });
});
