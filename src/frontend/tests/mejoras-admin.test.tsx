import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { menuAdministrador } from "../src/modulos/perfiles/administrador/config/menuAdministrador";
import DashboardAdministradorPage from "../src/modulos/perfiles/administrador/paginas/DashboardAdministradorPage";
import { api } from "../src/shared/api/client";
import ReportesPage from "../src/modulos/perfiles/administrador/paginas/ReportesPage";

vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({ useAuth: () => ({ user: { id: "admin", token: "prueba", rol: "ADMIN" } }) }));
vi.mock("../src/shared/api/client", () => ({ api: { get: vi.fn() } }));

vi.mock("../src/modulos/perfiles/administrador/hooks/useResumenAdmin", () => ({
  useResumenAdmin: () => ({
    datos: {
      usuarios: [{ id: "u1", activo: true, tipo_usuario: "ALUMNO" }],
      carreras: [{ id: "c1", activo: true, nombre: "Maestría" }],
      seminarios: [{ id: "s1", activo: true }],
      cohortes: [{ id: "co1", abierta: true, nombre: "Cohorte 2026", carrera_id: "c1", anio: 2026 }],
      admisiones: { PENDIENTE: 2, COMPLETADO: 1 },
    },
    cargando: false,
    error: false,
    reintentar: vi.fn(),
  }),
}));

describe("Mejoras de Administración", () => {
  it("elimina Configuración general sin eliminar las opciones útiles", () => {
    expect(menuAdministrador.some(opcion => opcion.ruta === "/dashboard/administrador/configuracion")).toBe(false);
    render(<MemoryRouter><DashboardAdministradorPage /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Panel de Administración" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Configuración general/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Estadísticas y reportes/ })).toBeInTheDocument();
  });
  it("representa indicadores reales, cambia de reporte y filtra por carrera", async () => {
    vi.mocked(api.get).mockImplementation(async <T,>(ruta: string): Promise<T> => ({
      usuarios: { Activos: 1, Inactivos: 0 }, roles: { ALUMNO: 1 },
      admisiones: { PENDIENTE: ruta.includes("carrera_id=c1") ? 1 : 2, COMPLETADO: 1 },
      tutorias: { Activas: 2, Inactivas: 0 },
    }) as T);
    render(<MemoryRouter><ReportesPage /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Usuarios por rol" })).toBeInTheDocument();
    expect(screen.getByRole("heading", {name:"Distribución de admisiones"})).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Indicador"), { target: { value: "tutorias" } });
    expect(screen.getByRole("heading", { name: "Tutorías" })).toBeInTheDocument();
    expect(screen.queryByText("Vista previa del reporte seleccionado")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descargar CSV" })).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Tipo de reporte"), { target: { value: "admision" } });
    const grafico = screen.getByRole("heading", { name: "Distribución de admisiones" }).closest("section")!;
    expect(within(grafico).getByText("Pendiente de revisión")).toBeInTheDocument();
    expect(within(grafico).getByText("Aprobada")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Carrera"), { target: { value: "c1" } });
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/inscripcion/estadisticas-administrativas?carrera_id=c1", "prueba"));
    expect(await screen.findByRole("heading", { name: "Distribución de admisiones" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Estado de usuarios" })).not.toBeInTheDocument();
  });
});
