import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PeriodosInscripcionPage from "../src/modulos/perfiles/conduccion/paginas/PeriodosInscripcionPage";
import { api } from "../src/shared/api/client";

vi.mock("../src/shared/api/client", () => ({
  api: { get: vi.fn(), patch: vi.fn() },
}));

vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({
  useAuth: () => ({ user: { token: "token-de-prueba", rol: "COORDINADOR" } }),
}));

const carreras = [
  { id: "carrera-1", nombre: "Especialización en Datos", activo: true },
  { id: "carrera-2", nombre: "Especialización en Historia", activo: true },
];

const cohortes = [
  {
    id: "cohorte-1",
    anio: 2026,
    nombre: "Cohorte Datos 2026",
    carrera_id: "carrera-1",
    abierta: false,
    fecha_inicio: "2026-03-01",
    created_at: null,
  },
  {
    id: "cohorte-2",
    anio: 2025,
    nombre: "Cohorte Historia 2025",
    carrera_id: "carrera-2",
    abierta: true,
    fecha_inicio: null,
    created_at: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);

  vi.mocked(api.get).mockImplementation(async <T,>(ruta: string): Promise<T> => {
    if (ruta === "/cohortes") return cohortes.map((c) => ({ ...c })) as T;
    if (ruta === "/carreras") return carreras as T;
    throw new Error(`Ruta no simulada: ${ruta}`);
  });

  vi.mocked(api.patch).mockImplementation(async <T,>(ruta: string, datos?: unknown): Promise<T> => {
    const cohorte = cohortes.find((item) => ruta === `/cohortes/${item.id}/inscripcion`);
    if (!cohorte) throw new Error(`Ruta no simulada: ${ruta}`);
    const abierta = (datos as { abierta: boolean }).abierta;
    return { ...cohorte, abierta } as T;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Equipo de Conducción - Períodos de inscripción", () => {
  it("muestra las cohortes, sus carreras y estados usando la API existente", async () => {
    render(<PeriodosInscripcionPage />);

    expect(await screen.findByText("Cohorte Datos 2026")).toBeInTheDocument();
    expect(screen.getByText("Cohorte Historia 2025")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Especialización en Datos" })).toBeInTheDocument();
    expect(screen.getByText("01/03/2026")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/cohortes", "token-de-prueba");
    expect(api.get).toHaveBeenCalledWith("/carreras", "token-de-prueba");
  });

  it("filtra cohortes por carrera y estado", async () => {
    render(<PeriodosInscripcionPage />);
    await screen.findByText("Cohorte Datos 2026");

    fireEvent.change(screen.getByLabelText("Carrera"), {
      target: { value: "carrera-1" },
    });
    expect(screen.getByText("Cohorte Datos 2026")).toBeInTheDocument();
    expect(screen.queryByText("Cohorte Historia 2025")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Estado de inscripción"), {
      target: { value: "ABIERTAS" },
    });
    expect(screen.getByText(/No se encontraron cohortes/)).toBeInTheDocument();
  });

  it("abre inscripciones mediante PATCH y actualiza el estado visible", async () => {
    render(<PeriodosInscripcionPage />);
    await screen.findByText("Cohorte Datos 2026");

    fireEvent.click(screen.getByRole("button", {
      name: "Abrir inscripciones de Cohorte Datos 2026",
    }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        "/cohortes/cohorte-1/inscripcion",
        { abierta: true },
        "token-de-prueba",
      );
    });
    expect(await screen.findByText(/se abrieron correctamente/)).toBeInTheDocument();
    const fila = screen.getByText("Cohorte Datos 2026").closest("tr");
    expect(fila).not.toBeNull();
    expect(within(fila!).getByText("Abierta")).toBeInTheDocument();
  });

  it("cierra inscripciones mediante PATCH", async () => {
    render(<PeriodosInscripcionPage />);
    await screen.findByText("Cohorte Historia 2025");

    fireEvent.click(screen.getByRole("button", {
      name: "Cerrar inscripciones de Cohorte Historia 2025",
    }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        "/cohortes/cohorte-2/inscripcion",
        { abierta: false },
        "token-de-prueba",
      );
    });
    expect(await screen.findByText(/se cerraron correctamente/)).toBeInTheDocument();
  });

  it("no modifica el estado si la persona cancela la confirmación", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    render(<PeriodosInscripcionPage />);
    await screen.findByText("Cohorte Datos 2026");

    fireEvent.click(screen.getByRole("button", {
      name: "Abrir inscripciones de Cohorte Datos 2026",
    }));

    expect(api.patch).not.toHaveBeenCalled();
  });

  it("informa errores de actualización sin ocultar la tabla", async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error("No tenés permisos para modificar inscripciones."));
    render(<PeriodosInscripcionPage />);
    await screen.findByText("Cohorte Datos 2026");

    fireEvent.click(screen.getByRole("button", {
      name: "Abrir inscripciones de Cohorte Datos 2026",
    }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No tenés permisos");
    expect(screen.getByText("Cohorte Datos 2026")).toBeInTheDocument();
  });
});

