import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DetalleLegajoPage from "../src/modulos/perfiles/conduccion/paginas/DetalleLegajoPage";
import { api } from "../src/shared/api/client";

vi.mock("../src/shared/api/client", () => ({
  api: {
    get: vi.fn(),
    descargar: vi.fn(),
  },
}));

vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({
  useAuth: () => ({ user: { token: "token-de-prueba", rol: "COORDINADOR" } }),
}));

vi.mock(
  "../src/modulos/perfiles/conduccion/componentes/GestionInscripcion",
  () => ({
    default: () => <div>Gestión de inscripción</div>,
  }),
);

const legajo = {
  id: "legajo-1",
  cohorte_id: "cohorte-1",
  carrera_elegida: "Especialización en Sistemas",
  apellido: "Pérez",
  nombre: "Ana",
  nacionalidad: "Argentina",
  dni_pasaporte: "12345678",
  telefono_movil: "2215551234",
  correo_electronico: "ana@example.com",
  correo_alternativo: null,
  domicilio: "Calle 10",
  estado: "EN_REVISION",
  pais: "Argentina",
  provincia: "Buenos Aires",
  ciudad: "La Plata",
  titulo_anterior: "Ingeniera",
  universidad_anterior: "UTN",
  numero_seguimiento: "SEG-123",
  forma_conocio_ofertas: "Redes sociales",
  motivos_cursar: "Desarrollo profesional",
  solicitud_beca: 30,
};

const documentacion = {
  legajo_id: "legajo-1",
  documentos: [
    { id: "documento-1", tipo: "DNI_PASAPORTE", fecha: "2026-11-10T12:00:00" },
  ],
  completitud: {
    porcentaje: 50,
    documentos_requeridos: 2,
    documentos_presentados: 1,
    documentos_faltantes: ["TITULO_GRADO"],
    completo: false,
  },
};

function mostrarDetalle() {
  return render(
    <MemoryRouter initialEntries={["/dashboard/conduccion/aspirantes/legajo-1"]}>
      <Routes>
        <Route
          path="/dashboard/conduccion/aspirantes/:id"
          element={<DetalleLegajoPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockImplementation(async <T,>(ruta: string): Promise<T> => {
    if (ruta === "/inscripcion/legajo-1") return legajo as T;
    if (ruta === "/inscripcion/legajo-1/documentos")
      return documentacion as T;
    throw new Error(`Ruta no simulada: ${ruta}`);
  });
});

describe("Equipo de Conducción - Detalle del legajo", () => {
  it("muestra los datos adicionales de inscripción que devuelve la API", async () => {
    mostrarDetalle();

    expect(await screen.findByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText(/Seguimiento:\s*SEG-123/)).toBeInTheDocument();
    expect(screen.getByText("Redes sociales")).toBeInTheDocument();
    expect(screen.getByText("Desarrollo profesional")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(
      "/inscripcion/legajo-1",
      "token-de-prueba",
    );
  });

  it("informa porcentaje documental, cantidad y documentos faltantes", async () => {
    mostrarDetalle();

    const seccion = await screen.findByRole("region", {
      name: "Estado de la documentación",
    });
    await waitFor(() => {
      expect(within(seccion).getByRole("progressbar")).toHaveAttribute(
        "value",
        "50",
      );
    });
    expect(seccion).toHaveTextContent("Documentos presentados: 1 de 2");
    expect(within(seccion).getByText("Copia del título de grado")).toBeInTheDocument();
  });

  it("ofrece visualizar y descargar los PDFs del legajo", async () => {
    mostrarDetalle();

    expect(await screen.findByRole("button", { name: "Ver PDF" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Descargar PDF" })).toBeEnabled();
    expect(screen.getByText(/Copia de DNI o pasaporte/)).toBeInTheDocument();
  });

  it("no inventa un porcentaje cuando el backend no puede calcularlo", async () => {
    vi.mocked(api.get).mockImplementation(async <T,>(ruta: string): Promise<T> => {
      if (ruta === "/inscripcion/legajo-1") return legajo as T;
      if (ruta === "/inscripcion/legajo-1/documentos")
        return { ...documentacion, completitud: null } as T;
      throw new Error(`Ruta no simulada: ${ruta}`);
    });

    mostrarDetalle();

    expect(
      await screen.findByText(/Todavía no se puede determinar la completitud documental/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});

