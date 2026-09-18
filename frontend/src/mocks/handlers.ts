import { http, HttpResponse, delay } from "msw";
import { legajosFixture } from "./data/legajos";
import { cohortesFixture } from "./data/cohortes";
import { seminariosFixture } from "./data/seminarios";
import type {
  CrearLegajoRequest,
  EstadoLegajo,
  Legajo,
  Cohorte,
  Seminario,
} from "@/shared/types/types";
import { getDocumentosPorLegajo } from "./data/documentos";

let legajos: Legajo[] = [...legajosFixture];
const cohortes: Cohorte[] = [...cohortesFixture];
const seminarios: Seminario[] = [...seminariosFixture];

const LATENCIA_MS = { min: 300, max: 800 };
const randomDelay = () =>
  delay(LATENCIA_MS.min + Math.random() * (LATENCIA_MS.max - LATENCIA_MS.min));

function errorResponse(
  status: number,
  error: string,
  message: string,
  field?: string,
) {
  return HttpResponse.json(
    {
      statusCode: status,
      error,
      message,
      field,
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}

export const handlers = [
  // POST /api/v1/legajos
  http.post("/api/v1/legajos", async ({ request }) => {
    await randomDelay();
    const body = (await request.json()) as CrearLegajoRequest;

    const dniDuplicado = legajos.some((l) => l.dni === body.dni);
    if (dniDuplicado) {
      return errorResponse(
        400,
        "VALIDATION_ERROR",
        "Ya existe una preinscripción con este DNI para la cohorte actual",
        "dni",
      );
    }

    if (body.motivacion.length < 50) {
      return errorResponse(
        400,
        "VALIDATION_ERROR",
        "La motivación debe tener al menos 50 caracteres",
        "motivacion",
      );
    }

    const nuevo: Legajo = {
      id: `leg-${Date.now()}`,
      numero_legajo: null,
      cohorte_id: "c1a2b3c4-0001-0000-0000-000000000003",
      dni: body.dni,
      apellido: body.apellido,
      nombre: body.nombre,
      email: body.email,
      email_alternativo: body.email_alternativo,
      telefono_movil: body.telefono_movil,
      domicilio: body.domicilio,
      titulo_grado: body.titulo_grado,
      motivacion: body.motivacion,
      estado: "PENDIENTE",
      tipo_carrera: body.tipo_carreras[0] ?? null,
      carrera_elegida: body.carreras[0] ?? null,
      solicita_beca: body.solicita_beca,
      tipo_beca: body.tipo_beca,
      semaforo: "VERDE",
      semaforo_manual: false,
      fecha_inscripcion: new Date().toISOString(),
      fecha_activacion: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    legajos = [...legajos, nuevo];

    return HttpResponse.json(nuevo, { status: 201 });
  }),

  // GET /api/v1/legajos
  http.get("/api/v1/legajos", async ({ request }) => {
    await randomDelay();
    const url = new URL(request.url);
    const estado = url.searchParams.get("estado") as EstadoLegajo | null;
    const cohorte_id = url.searchParams.get("cohorte_id");
    const beca =
      (url.searchParams.get("solo_con_beca") === "true" ? true : false) ||
      undefined;
    const tipo_carrera = url.searchParams.get("tipo_carrera");
    const page = Number(url.searchParams.get("page") ?? "1");
    const limit = Number(url.searchParams.get("limit") ?? "10");

    let resultado = legajos;
    if (estado) resultado = resultado.filter((l) => l.estado === estado);
    if (cohorte_id)
      resultado = resultado.filter((l) => l.cohorte_id === cohorte_id);
    if (beca) resultado = resultado.filter((l) => l.solicita_beca === beca);
    if (tipo_carrera)
      resultado = resultado.filter((l) => l.tipo_carrera === tipo_carrera);

    const total = resultado.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const inicio = (page - 1) * limit;
    const paginados = resultado.slice(inicio, inicio + limit);

    return HttpResponse.json({
    legajos: paginados,
    total,
    page,
    limit,
    totalPages,
  });
  }),

  // GET /api/v1/legajos/:id
  http.get("/api/v1/legajos/:id", async ({ params }) => {
    await randomDelay();
    const legajo = legajos.find((l) => l.id === params.id);
    if (!legajo) return errorResponse(404, "NOT_FOUND", "Legajo no encontrado");
    return HttpResponse.json(legajo);
  }),

  // PATCH /api/v1/legajos/:id/estado
  http.patch("/api/v1/legajos/:id/estado", async ({ params, request }) => {
    await randomDelay();
    const { estado } = (await request.json()) as { estado: EstadoLegajo };
    const legajo = legajos.find((l) => l.id === params.id);
    if (!legajo) return errorResponse(404, "NOT_FOUND", "Legajo no encontrado");

    legajo.estado = estado;
    legajo.updated_at = new Date().toISOString();
    if (estado === "COMPLETADO" && !legajo.numero_legajo) {
      legajo.numero_legajo = `leg-2026-${String(legajos.indexOf(legajo) + 1).padStart(3, "0")}`;
    }

    return HttpResponse.json(legajo);
  }),

  // POST /api/v1/legajos/:id/documentos
  http.post("/api/v1/legajos/:id/documentos", async ({ params, request }) => {
    await randomDelay();
    const legajo = legajos.find((l) => l.id === params.id);
    if (!legajo) return errorResponse(404, "NOT_FOUND", "Legajo no encontrado");

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file)
      return errorResponse(
        400,
        "VALIDATION_ERROR",
        "No se envió ningún archivo",
      );

    if (file.type !== "application/pdf") {
      return errorResponse(
        400,
        "VALIDATION_ERROR",
        "Solo se aceptan archivos en formato PDF",
      );
    }
    if (file.size > 5 * 1024 * 1024) {
      return errorResponse(
        400,
        "VALIDATION_ERROR",
        "El archivo es demasiado grande. Máximo permitido: 5MB",
      );
    }

    return HttpResponse.json(
      {
        id: `doc-${Date.now()}`,
        legajoId: legajo.id,
        tipo: formData.get("tipo"),
        nombreOriginal: file.name,
        tamanioBytes: file.size,
        fechaSubida: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),

  // GET /api/v1/legajos/:id/documentos
  http.get("/api/v1/legajos/:id/documentos", async ({ params }) => {
  await randomDelay();
  return HttpResponse.json(getDocumentosPorLegajo(params.id as string));
}),

  // GET /api/v1/cohortes
  http.get("/api/v1/cohortes", async () => {
    await randomDelay();

    const resultado = cohortes;

    return HttpResponse.json(resultado);
  }),

  // GET /api/v1/seminarios
  http.get("/api/v1/seminarios", async () => {
    await randomDelay();

    const resultado = seminarios;

    return HttpResponse.json(resultado);
  }),
];
