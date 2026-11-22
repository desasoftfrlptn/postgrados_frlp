import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ExportacionesConduccionPage from "../src/modulos/perfiles/conduccion/paginas/ExportacionesConduccionPage";
import PerfilesAcademicosConduccionPage from "../src/modulos/perfiles/conduccion/paginas/PerfilesAcademicosConduccionPage";
import TutoriasConduccionPage from "../src/modulos/perfiles/conduccion/paginas/TutoriasConduccionPage";
import TrabajosFinalesConduccionPage from "../src/modulos/perfiles/conduccion/paginas/TrabajosFinalesConduccionPage";
import SeminariosConduccionPage from "../src/modulos/perfiles/conduccion/paginas/SeminariosConduccionPage";
import AlertasConduccionPage from "../src/modulos/perfiles/conduccion/paginas/AlertasConduccionPage";
import EstadisticasConduccionPage from "../src/modulos/perfiles/conduccion/paginas/EstadisticasConduccionPage";
import PanelConduccionPage from "../src/modulos/perfiles/conduccion/paginas/PanelConduccionPage";
import { menuConduccion } from "../src/modulos/perfiles/conduccion/config/menuConduccion";
import { api } from "../src/shared/api/client";

vi.mock("../src/shared/api/client", () => ({ api: { get: vi.fn() } }));
vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({
  useAuth: () => ({ user: { token: "prueba", rol: "COORDINADOR" } }),
}));
const cohortes = [{id:"cohorte-1", anio:2026, nombre:"Cohorte 2026", carrera_id:"carrera-1", abierta:true, fecha_inicio:null, created_at:null}];
const carreras = [{id:"carrera-1",nombre:"Especialización en Datos",activo:true}];
const legajos = [{id:"legajo-1",cohorte_id:"cohorte-1",nombre:"Ana",apellido:"Pérez",dni_pasaporte:"123",correo_electronico:"a@example.com",carrera_elegida:"Especialización en Datos",estado:"PENDIENTE",solicitud_beca:30}];
function montar(elemento: ReactNode) { render(<MemoryRouter>{elemento}</MemoryRouter>); }

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockImplementation(async <T,>(ruta: string): Promise<T> => {
    if (ruta === "/inscripcion/tesis/registros") return [] as T;
    if (ruta === "/cohortes") return cohortes as T;
    if (ruta === "/carreras") return carreras as T;
    if (ruta === "/inscripcion/?cohorte_id=cohorte-1") return legajos as T;
    throw new Error(`Ruta no simulada: ${ruta}`);
  });
});

describe("Navegación completa de Conducción", () => {
  it("tiene las 11 opciones con rutas", () => {
    expect(menuConduccion).toHaveLength(11);
    expect(menuConduccion.every((item) => !!item.ruta)).toBe(true);
  });
  it("el panel muestra todos los módulos", () => {
    montar(<PanelConduccionPage />);
    expect(screen.getByRole("heading", { name: /Panel del Equipo de Conducción/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", {name:"Ingresar al módulo"})).toHaveLength(9);
  });
  it("muestra indicadores de la cohorte seleccionada sin inventar datos", async () => {
    montar(<PanelConduccionPage />);
    await screen.findByRole("option", {name: /Cohorte 2026/});
    expect(api.get).not.toHaveBeenCalledWith(expect.stringContaining("/inscripcion/?"), expect.anything());
    fireEvent.change(screen.getByLabelText("Cohorte"), {target:{value:"cohorte-1"}});
    expect(await screen.findByText("Pérez, Ana")).toBeInTheDocument();
    expect(screen.getByRole("heading", {name:"Pendientes de revisión"}).parentElement).toHaveTextContent("1");
  });
  it("exportaciones no consulta legajos hasta elegir cohorte", async () => {
    montar(<ExportacionesConduccionPage />);
    expect(await screen.findByRole("heading", { name: "Exportación de legajos" })).toBeInTheDocument();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/cohortes", "prueba"));
    expect(api.get).not.toHaveBeenCalledWith(expect.stringContaining("/inscripcion/?"), expect.anything());
    fireEvent.change(screen.getByLabelText("Cohorte"), {target:{value:"cohorte-1"}});
    expect(await screen.findByText("Pérez, Ana")).toBeInTheDocument();
  });
  it("muestra la ficha de perfiles cuando elige estudiante", async () => {
    montar(<PerfilesAcademicosConduccionPage />);
    await screen.findByRole("option", {name:/Cohorte 2026/});
    fireEvent.change(screen.getByLabelText("Cohorte"), {target:{value:"cohorte-1"}});
    await screen.findByRole("option", {name:/Pérez, Ana/});
    fireEvent.change(screen.getByLabelText("Estudiante o aspirante"), {target:{value:"legajo-1"}});
    expect(screen.getByRole("heading", {name:"Pérez, Ana"})).toBeInTheDocument();
  });
  it("muestra alertas basadas en estados reales", async () => {
    montar(<AlertasConduccionPage />);
    await screen.findByRole("option", {name:/Cohorte 2026/});
    fireEvent.change(screen.getByLabelText("Cohorte"), {target:{value:"cohorte-1"}});
    expect(await screen.findByText("Pérez, Ana")).toBeInTheDocument();
  });
  it("calcula estadísticas solamente con datos reales", async () => {
    montar(<EstadisticasConduccionPage />);
    await screen.findByRole("option", {name:/Cohorte 2026/});
    fireEvent.change(screen.getByLabelText("Cohorte"), {target:{value:"cohorte-1"}});
    expect(await screen.findByText("Pendiente de revisión")).toBeInTheDocument();
    expect(screen.getByText("100 %")).toBeInTheDocument();
  });
  it("consulta tesis reales sin acciones de escritura", async () => {
    montar(<TrabajosFinalesConduccionPage />);
    expect(await screen.findByText("No hay tesis que coincidan con la consulta.")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/inscripcion/tesis/registros", "prueba");
    expect(screen.queryByRole("button", {name: "Registrar tesis"})).not.toBeInTheDocument();
  });
  it.each([
    ["Tutorías y seguimiento", <TutoriasConduccionPage />],
    ["Seminarios y calificaciones", <SeminariosConduccionPage />],
  ])("muestra %s sin simular datos académicos", async (titulo, componente) => {
    montar(componente);
    expect(screen.getByRole("heading", {name: titulo})).toBeInTheDocument();
    expect((await screen.findAllByText(/Sin datos disponibles desde el Backend/)).length).toBeGreaterThan(0);
  });
});

