import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PeriodosInscripcionPage from "../src/modulos/perfiles/conduccion/paginas/PeriodosInscripcionPage";
import { api } from "../src/shared/api/client";

vi.mock("../src/shared/api/client", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
vi.mock("../src/modulos/manejo-sesion/useAuth", () => ({ useAuth: () => ({ user: { token: "prueba", rol: "COORDINADOR" } }) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockImplementation(async <T,>(ruta: string): Promise<T> => {
    if (ruta === "/cohortes") return [] as T;
    if (ruta === "/carreras") return [{ id: "carrera-1", nombre: "Sistemas", activo: true }] as T;
    throw new Error(`Ruta inesperada: ${ruta}`);
  });
  vi.mocked(api.post).mockResolvedValue({ id:"nueva-1", nombre:"Cohorte 2027", anio:2027, carrera_id:"carrera-1", abierta:false, fecha_inicio:null, created_at:null });
});

describe("Conducción - Alta de cohortes", () => {
  it("crea una cohorte usando POST y la muestra en la tabla", async () => {
    render(<PeriodosInscripcionPage />);
    await screen.findByText("No hay cohortes registradas.");
    fireEvent.click(screen.getByRole("button", {name:"+ Nueva cohorte"}));
    fireEvent.change(screen.getByLabelText("Nombre"), {target:{value:"Cohorte 2027"}});
    fireEvent.change(screen.getByLabelText("Año"), {target:{value:"2027"}});
    fireEvent.change(document.getElementById("nueva-cohorte-carrera") as HTMLSelectElement, {target:{value:"carrera-1"}});
    fireEvent.click(screen.getByRole("button", {name:"Crear cohorte"}));

    expect(api.post).not.toHaveBeenCalled();

    fireEvent.click(
      within(await screen.findByRole("alertdialog"))
        .getByRole("button", { name: "Confirmar" }),
    );

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/cohortes", {
      nombre:"Cohorte 2027", anio:2027, carrera_id:"carrera-1", fecha_inicio:null,
    }, "prueba"));
    expect(await screen.findByText("Cohorte 2027")).toBeInTheDocument();
  });
});


async function prepararAlta() {
  render(<PeriodosInscripcionPage />);

  await screen.findByText("No hay cohortes registradas.");

  fireEvent.click(
    screen.getByRole("button", { name: "+ Nueva cohorte" }),
  );

  fireEvent.change(screen.getByLabelText("Nombre"), {
    target: { value: "Cohorte 2027" },
  });

  fireEvent.change(screen.getByLabelText("Año"), {
    target: { value: "2027" },
  });

  fireEvent.change(
    document.getElementById("nueva-cohorte-carrera")!,
    { target: { value: "carrera-1" } },
  );

  fireEvent.click(
    screen.getByRole("button", { name: "Crear cohorte" }),
  );

  return await screen.findByRole("alertdialog");
}

it("cancela el alta sin enviar datos y conserva el formulario", async () => {
  const modal = await prepararAlta();

  fireEvent.click(
    within(modal).getByRole("button", { name: "Cancelar" }),
  );

  expect(api.post).not.toHaveBeenCalled();

  expect(screen.getByLabelText("Nombre"))
    .toHaveValue("Cohorte 2027");

  expect(screen.queryByRole("alertdialog"))
    .not.toBeInTheDocument();
});

it("conserva el formulario cuando falla la creación", async () => {
  vi.mocked(api.post).mockRejectedValueOnce(
    new Error("Ya existe una cohorte con ese nombre."),
  );

  const modal = await prepararAlta();

  fireEvent.click(
    within(modal).getByRole("button", { name: "Confirmar" }),
  );

  expect(await screen.findByRole("alert"))
    .toHaveTextContent("Ya existe una cohorte");

  expect(screen.getByLabelText("Nombre"))
    .toHaveValue("Cohorte 2027");

  expect(api.post).toHaveBeenCalledTimes(1);
});
