import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ListadoAspirantesPage from "../src/modulos/perfiles/conduccion/paginas/ListadoAspirantesPage";
import { api } from "../src/shared/api/client";

vi.mock("../src/shared/api/client", () => ({
  api: { get: vi.fn() },
}));

vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({
  useAuth: () => ({ user: { token: "token-prueba", rol: "COORDINADOR" } }),
}));

// El flujo real de aprobación/rechazo se prueba en los tests propios
// de GestionInscripcion. Aquí comprobamos su integración con el listado.
vi.mock("../src/modulos/perfiles/conduccion/componentes/GestionInscripcion", () => ({
  default: ({ legajoId, onEstadoActualizado }: {
    legajoId: string;
    onEstadoActualizado: (estado: string) => void;
  }) => (
    <div aria-label="Gestión simulada de inscripción">
      <span>Legajo seleccionado: {legajoId}</span>
      <button type="button" onClick={() => onEstadoActualizado("COMPLETADO")}>
        Simular confirmación del Backend
      </button>
    </div>
  ),
}));

const cohortes = [
  { id: "cohorte-1", nombre: "Cohorte 2026", anio: 2026, abierta: true },
];

const legajos = [
  {
    id: "legajo-1",
    cohorte_id: "cohorte-1",
    nombre: "Ana",
    apellido: "Pérez",
    dni_pasaporte: "12345678",
    correo_electronico: "ana@example.com",
    carrera_elegida: "Sistemas",
    estado: "EN_REVISION",
    solicitud_beca: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockImplementation(async <T,>(ruta: string): Promise<T> => {
    if (ruta === "/cohortes") return cohortes as T;
    if (ruta === "/inscripcion/?cohorte_id=cohorte-1") return legajos as T;
    throw new Error(`Ruta no simulada: ${ruta}`);
  });
});

describe("Listado de aspirantes - acceso a la gestión", () => {
  it("abre y cierra la gestión del aspirante seleccionado", async () => {
    render(<MemoryRouter><ListadoAspirantesPage /></MemoryRouter>);

    await screen.findByRole("option", { name: /Cohorte 2026/ });
    fireEvent.change(screen.getByLabelText("Cohorte"), {
      target: { value: "cohorte-1" },
    });

    const boton = await screen.findByRole("button", { name: "Aprobar / rechazar" });
    fireEvent.click(boton);
    expect(screen.getByText("Legajo seleccionado: legajo-1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar gestión" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar gestión" }));
    expect(screen.queryByText("Legajo seleccionado: legajo-1")).not.toBeInTheDocument();
  });

  it("recarga los datos cuando la gestión informa un cambio confirmado", async () => {
    render(<MemoryRouter><ListadoAspirantesPage /></MemoryRouter>);

    await screen.findByRole("option", { name: /Cohorte 2026/ });
    fireEvent.change(screen.getByLabelText("Cohorte"), {
      target: { value: "cohorte-1" },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Aprobar / rechazar" }));
    fireEvent.click(screen.getByRole("button", { name: "Simular confirmación del Backend" }));

    await waitFor(() => {
      const consultas = vi.mocked(api.get).mock.calls.filter(([ruta]) =>
        ruta === "/inscripcion/?cohorte_id=cohorte-1",
      );
      expect(consultas.length).toBeGreaterThanOrEqual(2);
    });
  });
});

