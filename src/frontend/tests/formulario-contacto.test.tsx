import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";

import FormularioContacto from "../src/modulos/contacto/componentes/FormularioContacto";

import {
  enviarConsultaContacto,
} from "../src/shared/api/contacto";

vi.mock("../src/shared/api/contacto", () => ({
  enviarConsultaContacto: vi.fn(),
}));

const enviar = vi.mocked(enviarConsultaContacto);

const consultaValida = {
  nombre: "Usuario de prueba",
  email: "usuario@example.com",
  asunto: "Consulta académica",
  mensaje: "Quisiera información sobre las carreras de posgrado.",
};

function completarFormulario() {
  fireEvent.change(
    screen.getByLabelText(/^Nombre y apellido/),
    {
      target: { value: consultaValida.nombre },
    }
  );

  fireEvent.change(
    screen.getByLabelText(/^Correo electrónico/),
    {
      target: { value: consultaValida.email },
    }
  );

  fireEvent.change(
    screen.getByLabelText(/^Asunto/),
    {
      target: { value: consultaValida.asunto },
    }
  );

  fireEvent.change(
    screen.getByLabelText(/^Mensaje/),
    {
      target: { value: consultaValida.mensaje },
    }
  );
}

function solicitarEnvio() {
  fireEvent.click(
    screen.getByRole("button", {
      name: "Enviar consulta",
    })
  );
}

function confirmarEnvio() {
  fireEvent.click(
    within(
      screen.getByRole("alertdialog")
    ).getByRole("button", {
      name: "Confirmar envío",
    })
  );
}

beforeEach(() => {
  vi.resetAllMocks();

  enviar.mockResolvedValue({
    mensaje: "Tu consulta fue enviada correctamente.",
  });
});

describe("Formulario público de contacto", () => {
  it("muestra todos los campos del formulario", () => {
    render(<FormularioContacto />);

    expect(
      screen.getByLabelText(/^Nombre y apellido/)
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/^Correo electrónico/)
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/^Asunto/)
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/^Mensaje/)
    ).toBeInTheDocument();
  });

  it("rechaza un formulario vacío", () => {
    render(<FormularioContacto />);

    solicitarEnvio();

    expect(
      screen.getByText("Ingresá un nombre válido.")
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Ingresá un correo electrónico válido."
      )
    ).toBeInTheDocument();

    expect(enviar).not.toHaveBeenCalled();
  });

  it("rechaza un correo inválido", () => {
    render(<FormularioContacto />);

    completarFormulario();

    fireEvent.change(
      screen.getByLabelText(/^Correo electrónico/),
      {
        target: { value: "correo-invalido" },
      }
    );

    solicitarEnvio();

    expect(
      screen.getByText(
        "Ingresá un correo electrónico válido."
      )
    ).toBeInTheDocument();

    expect(enviar).not.toHaveBeenCalled();
  });

  it("rechaza un mensaje demasiado corto", () => {
    render(<FormularioContacto />);

    completarFormulario();

    fireEvent.change(
      screen.getByLabelText(/^Mensaje/),
      {
        target: { value: "Hola" },
      }
    );

    solicitarEnvio();

    expect(
      screen.getByText(
        "El mensaje debe contener entre 10 y 3000 caracteres."
      )
    ).toBeInTheDocument();

    expect(enviar).not.toHaveBeenCalled();
  });

  it("solicita confirmación antes de enviar", () => {
    render(<FormularioContacto />);

    completarFormulario();
    solicitarEnvio();

    expect(
      screen.getByRole("alertdialog")
    ).toBeInTheDocument();

    expect(enviar).not.toHaveBeenCalled();
  });

  it("no realiza peticiones si se cancela el envío", () => {
    render(<FormularioContacto />);

    completarFormulario();
    solicitarEnvio();

    fireEvent.click(
      within(
        screen.getByRole("alertdialog")
      ).getByRole("button", {
        name: "Volver",
      })
    );

    expect(enviar).not.toHaveBeenCalled();

    expect(
      screen.queryByRole("alertdialog")
    ).not.toBeInTheDocument();

    expect(
      screen.getByLabelText(/^Mensaje/)
    ).toHaveValue(consultaValida.mensaje);
  });

  it("envía la consulta después de confirmar", async () => {
    render(<FormularioContacto />);

    completarFormulario();
    solicitarEnvio();
    confirmarEnvio();

    await waitFor(() => {
      expect(enviar).toHaveBeenCalledExactlyOnceWith(
        consultaValida
      );
    });

    expect(
      await screen.findByText(
        "Tu consulta fue enviada correctamente."
      )
    ).toBeInTheDocument();
  });

  it("limpia los campos después de un envío exitoso", async () => {
    render(<FormularioContacto />);

    completarFormulario();
    solicitarEnvio();
    confirmarEnvio();

    await screen.findByText(
      "Tu consulta fue enviada correctamente."
    );

    expect(
      screen.getByLabelText(/^Nombre y apellido/)
    ).toHaveValue("");

    expect(
      screen.getByLabelText(/^Correo electrónico/)
    ).toHaveValue("");

    expect(
      screen.getByLabelText(/^Asunto/)
    ).toHaveValue("");

    expect(
      screen.getByLabelText(/^Mensaje/)
    ).toHaveValue("");
  });

  it("conserva los datos cuando falla el envío", async () => {
    enviar.mockRejectedValueOnce(
      new Error("No se pudo enviar la consulta.")
    );

    render(<FormularioContacto />);

    completarFormulario();
    solicitarEnvio();
    confirmarEnvio();

    expect(
      await screen.findByText(
        "No se pudo enviar la consulta."
      )
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/^Mensaje/)
    ).toHaveValue(consultaValida.mensaje);

    expect(
      screen.getByRole("button", {
        name: "Enviar consulta",
      })
    ).toBeEnabled();
  });

  it("evita envíos duplicados durante una petición", async () => {
    let resolver!: (respuesta: {
      mensaje: string;
    }) => void;

    enviar.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolver = resolve;
        })
    );

    render(<FormularioContacto />);

    completarFormulario();
    solicitarEnvio();

    const boton = within(
      screen.getByRole("alertdialog")
    ).getByRole("button", {
      name: "Confirmar envío",
    });

    fireEvent.click(boton);
    fireEvent.click(boton);

    expect(enviar).toHaveBeenCalledTimes(1);

    expect(
      screen.getByLabelText(/^Mensaje/)
    ).toBeDisabled();

    resolver({
      mensaje: "Tu consulta fue enviada correctamente.",
    });

    await screen.findByText(
      "Tu consulta fue enviada correctamente."
    );

    expect(enviar).toHaveBeenCalledTimes(1);
  });
});