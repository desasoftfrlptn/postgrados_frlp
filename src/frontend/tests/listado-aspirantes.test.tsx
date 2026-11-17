import { MemoryRouter } from "react-router-dom";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

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
      token: "token-coordinador",
      rol: "COORDINADOR",
    },
  }),
}));

const legajos = [
  {
    id: "legajo-1",
    cohorte_id: "cohorte-1",
    carrera_elegida: "Maestría",
    apellido: "Becatreinta",
    nombre: "Ana",
    dni_pasaporte: "41000001",
    correo_electronico: "ana@example.com",
    estado: "PENDIENTE",
    solicitud_beca: 30,
  },
  {
    id: "legajo-2",
    cohorte_id: "cohorte-1",
    carrera_elegida: "Maestría",
    apellido: "Becacien",
    nombre: "Bruno",
    dni_pasaporte: "41000002",
    correo_electronico: "bruno@example.com",
    estado: "EN_REVISION",
    solicitud_beca: 100,
  },
  {
    id: "legajo-3",
    cohorte_id: "cohorte-1",
    carrera_elegida: "Maestría",
    apellido: "Sinbeca",
    nombre: "Carla",
    dni_pasaporte: "41000003",
    correo_electronico: "carla@example.com",
    estado: "PENDIENTE",
    solicitud_beca: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(api.get).mockImplementation(
    async <T,>(ruta: string): Promise<T> => {
      if (ruta === "/cohortes") {
        return [
          {
            id: "cohorte-1",
            nombre: "Cohorte 2026",
            anio: 2026,
            abierta: true,
          },
        ] as T;
      }

      if (ruta.startsWith("/inscripcion/")) {
        return legajos as T;
      }

      throw new Error(`Ruta no simulada: ${ruta}`);
    },
  );
});

async function seleccionarCohorte() {
  render(
    <MemoryRouter>
      <ListadoAspirantesPage />
    </MemoryRouter>,
  );

  const selector = screen.getByLabelText("Cohorte");

  await waitFor(() => {
    expect(selector).toBeEnabled();
  });

  fireEvent.change(selector, {
    target: { value: "cohorte-1" },
  });

  await waitFor(() => {
    expect(api.get).toHaveBeenCalledWith(
      "/inscripcion/?cohorte_id=cohorte-1",
      "token-coordinador",
    );
  });

  await waitFor(() => {
    expect(document.body).toHaveTextContent("Becatreinta");
  });
}

describe("Listado de aspirantes - Filtros", () => {
  it("no consulta legajos sin una cohorte", async () => {
    render(
    <MemoryRouter>
      <ListadoAspirantesPage />
    </MemoryRouter>,
  );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/cohortes");
    });

    expect(
      vi.mocked(api.get).mock.calls.some(
        ([ruta]) => ruta.startsWith("/inscripcion/"),
      ),
    ).toBe(false);
  });

  it("consulta los legajos de la cohorte seleccionada", async () => {
    await seleccionarCohorte();

    expect(document.body).toHaveTextContent("Becatreinta");
    expect(document.body).toHaveTextContent("Becacien");
    expect(document.body).toHaveTextContent("Sinbeca");
  });

  it.each([
    ["30", "Becatreinta", ["Becacien", "Sinbeca"]],
    ["100", "Becacien", ["Becatreinta", "Sinbeca"]],
    ["SIN_BECA", "Sinbeca", ["Becatreinta", "Becacien"]],
  ])(
    "filtra correctamente la beca %s",
    async (beca, esperado, excluidos) => {
      await seleccionarCohorte();

      fireEvent.click(
        screen.getByRole("button", {
          name: /Más filtros/,
        }),
      );

      fireEvent.change(screen.getByLabelText("Beca"), {
        target: { value: beca },
      });

      await waitFor(() => {
        expect(document.body).toHaveTextContent(esperado);

        for (const excluido of excluidos) {
          expect(document.body).not.toHaveTextContent(excluido);
        }
      });
    },
  );

  it("limpia los filtros seleccionados", async () => {
    await seleccionarCohorte();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Más filtros/,
      }),
    );

    fireEvent.change(screen.getByLabelText("Beca"), {
      target: { value: "30" },
    });

    await waitFor(() => {
      expect(document.body).not.toHaveTextContent("Becacien");
    });

    fireEvent.click(
      screen.getAllByRole("button", {
        name: "Limpiar filtros",
      })[0],
    );

    expect(screen.getByLabelText("Cohorte")).toHaveValue("");
    expect(screen.getByLabelText("Beca")).toHaveValue("");

    await waitFor(() => {
      expect(document.body).toHaveTextContent(
        "Seleccioná una cohorte para consultar sus legajos.",
      );
    });
  });
});
