
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import ListadoAspirantesPage from "../src/modulos/perfiles/conduccion/paginas/ListadoAspirantesPage";
import { api } from "../src/shared/api/client";

vi.mock("../src/shared/api/client", () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({
  useAuth: () => ({
    user: {
      token: "token-prueba",
      rol: "COORDINADOR",
    },
  }),
}));

// Simulamos GestionInscripcion para comprobar
// su integración con el listado de aspirantes.
vi.mock(
  "../src/modulos/perfiles/conduccion/componentes/GestionInscripcion",
  () => ({
    default: ({
      legajoId,
      onEstadoActualizado,
    }: {
      legajoId: string;
      onEstadoActualizado: (estado: string) => void;
    }) => (
      <div aria-label="Gestión simulada de inscripción">
        <span>Legajo seleccionado: {legajoId}</span>

        <button
          type="button"
          onClick={() => onEstadoActualizado("COMPLETADO")}
        >
          Simular confirmación del Backend
        </button>
      </div>
    ),
  })
);

const cohortes = [
  {
    id: "cohorte-1",
    nombre: "Cohorte 2026",
    anio: 2026,
    abierta: true,
  },
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

  vi.mocked(api.get).mockImplementation(
    async <T,>(ruta: string): Promise<T> => {
      if (ruta === "/cohortes") {
        return cohortes as T;
      }

      if (ruta === "/inscripcion/?cohorte_id=cohorte-1") {
        return legajos as T;
      }

      throw new Error(`Ruta no simulada: ${ruta}`);
    }
  );
});

async function mostrarListadoConCohorte() {
  render(
    <MemoryRouter>
      <ListadoAspirantesPage />
    </MemoryRouter>
  );

  await screen.findByRole("option", {
    name: /Cohorte 2026/,
  });

  fireEvent.change(screen.getByLabelText("Cohorte"), {
    target: { value: "cohorte-1" },
  });

  await screen.findByRole("button", {
    name: "Decidir admisión",
  });
}

describe("Listado de aspirantes - acceso a la gestión", () => {
  it("abre y cierra la gestión del aspirante seleccionado", async () => {
    await mostrarListadoConCohorte();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Decidir admisión",
      })
    );

    expect(
      screen.getByText("Legajo seleccionado: legajo-1")
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Cerrar gestión",
      })
    );

    expect(
      screen.queryByText("Legajo seleccionado: legajo-1")
    ).not.toBeInTheDocument();
  });

  it("actualiza el estado del aspirante cuando la gestión confirma el cambio", async () => {
    await mostrarListadoConCohorte();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Decidir admisión",
      })
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Simular confirmación del Backend",
      })
    );

    const tabla = screen.getByRole("table");
    const fila = within(tabla).getByText(
      /Pérez/
    ).closest("tr");

    expect(fila).not.toBeNull();

    await waitFor(() => {
      expect(
        within(fila!).getByText("Completado")
      ).toBeInTheDocument();
    });
  });
});
