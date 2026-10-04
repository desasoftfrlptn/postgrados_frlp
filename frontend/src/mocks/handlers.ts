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
import { actualizarDocumento, getDocumentosPorLegajo } from "./data/documentos";
import {
  actualizarPeriodo,
  crearPeriodo,
  getPeriodosPorCohorte,
  getPeriodoVigente,
} from "./data/periodos";
import type { CrearTrabajoFinalRequest, TrabajoFinal, EstadisticasCohorte, TipoCarrera } from "@/shared/types/types";
import type { Rol } from "@/shared/types/types";
 
const usuarioActualMock: { email: string; rol: Rol } = {
  email: "laura.martinez@fenix.test",
  rol: "cpr",
};
 
let trabajosFinales: TrabajoFinal[] = [{
  id: "1",
  legajo_id: "leg-004",
  tipo: "TFI",
  titulo: "Especializacion",
  director: "Ana",
  codirector: null,
  fecha_cpr: "12-12-2026",
  numero_resolucion: "12000",
  creado_por: "ana@example.com",
  created_at: "17-09-2026"
}];

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
      (url.searchParams.get("solo_con_beca") === null ? "" : true);
    const tipo_carrera = url.searchParams.get("tipo_carrera");
    const page = Number(url.searchParams.get("page") ?? "1");
    const limit = Number(url.searchParams.get("limit") ?? "10");

    let resultado = legajos;
    if (estado) resultado = resultado.filter((l) => l.estado === estado);
    if (cohorte_id)
      resultado = resultado.filter((l) => l.cohorte_id === cohorte_id);
    if (beca) resultado = resultado.filter((l) => l.solicita_beca);
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

  // GET /api/v1/legajos/consulta - Consulta sin login del estado de un legajo para la vista de aspirante/estudiante
  http.get("/api/v1/legajos/consulta", async ({ request }) => {
    await randomDelay();
    const url = new URL(request.url);
    const dni = url.searchParams.get("dni");
    const email = url.searchParams.get("email");

    const legajo = legajos.find((l) => l.dni === dni && l.email === email);
    if (!legajo) {
      return errorResponse(
        404,
        "NOT_FOUND",
        "No encontramos una inscripción con esos datos.",
      );
    }

    return HttpResponse.json({
      id: legajo.id,
      numero_legajo: legajo.numero_legajo,
      nombre: legajo.nombre,
      apellido: legajo.apellido,
      estado: legajo.estado,
      solicita_beca: legajo.solicita_beca,
      documentos: getDocumentosPorLegajo(legajo.id),
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

  // PATCH /api/v1/legajos/:id/documentos para observar un documento con un comentario
  http.patch(
    "/api/v1/legajos/:legajoId/documentos/:docId",
    async ({ params, request }) => {
      await randomDelay();

      const body = (await request.json()) as {
        accion: "OBSERVAR" | "MARCAR_FALTANTE";
        motivo: string;
      };

      if (!body.motivo || body.motivo.trim().length === 0) {
        return errorResponse(
          400,
          "VALIDATION_ERROR",
          "El texto de observación es obligatorio",
          "motivo",
        );
      }

      const actualizado = actualizarDocumento(params.docId as string, {
        estado: body.accion === "MARCAR_FALTANTE" ? "FALTANTE" : "OBSERVADO",
        motivo_observacion: body.motivo,
      });

      if (!actualizado) {
        return errorResponse(404, "NOT_FOUND", "Documento no encontrado");
      }

      return HttpResponse.json(actualizado);
    },
  ),

  // GET /api/v1/legajos/:id/documentos
  http.get("/api/v1/legajos/:id/documentos", async ({ params }) => {
    await randomDelay();
    return HttpResponse.json(getDocumentosPorLegajo(params.id as string));
  }),

  // GET /api/v1/legajos/:id/trabajo-final
http.get("/api/v1/legajos/:id/trabajo-final", async ({ params }) => {
  await randomDelay();
  const trabajo = trabajosFinales.find((t) => t.legajo_id === params.id);
  return HttpResponse.json(trabajo ?? null);
}),
 
// POST /api/v1/legajos/:id/trabajo-final
http.post("/api/v1/legajos/:id/trabajo-final", async ({ params, request }) => {
  await randomDelay();
 
  // BR-004: solo CPR puede crear/modificar registros de tesis.
  if (usuarioActualMock.rol !== "cpr") {
    return errorResponse(403, "FORBIDDEN", "No tenés permisos para registrar un trabajo final.");
  }
 
  const body = (await request.json()) as CrearTrabajoFinalRequest;
 
  if (!body.titulo || !body.director || !body.fecha_cpr || !body.numero_resolucion) {
    return errorResponse(400, "VALIDATION_ERROR", "Faltan campos obligatorios.");
  }
 
  const nuevo: TrabajoFinal = {
    id: `tf-${Date.now()}`,
    legajo_id: params.id as string,
    tipo: body.tipo,
    titulo: body.titulo,
    director: body.director,
    codirector: body.codirector,
    fecha_cpr: body.fecha_cpr,
    numero_resolucion: body.numero_resolucion,
    creado_por: usuarioActualMock.email,
    created_at: new Date().toISOString(),
  };
  trabajosFinales = [...trabajosFinales, nuevo];
 
  return HttpResponse.json(nuevo, { status: 201 });
}),

  // GET /api/v1/cohortes
  http.get("/api/v1/cohortes", async () => {
    await randomDelay();

    const resultado = cohortes;

    return HttpResponse.json(resultado);
  }),

  // GET /api/v1/estadisticas/cohortes?tipo_carrera= - traer unicamente las ultimas 3 cohortes
http.get("/api/v1/estadisticas/cohortes", async ({ request }) => {
  await randomDelay();
  const url = new URL(request.url);
  const tipoCarrera = url.searchParams.get("tipo_carrera") as TipoCarrera | null;
 
  // Últimas 3 cohortes por año, más reciente primero.
  const ultimasCohortes = [...cohortes].sort((a, b) => b.anio - a.anio).slice(0, 3);
 
  const estadisticas: EstadisticasCohorte[] = ultimasCohortes.map((cohorte) => {
    let legajosDeCohorte = legajos.filter((l) => l.cohorte_id === cohorte.id);
    if (tipoCarrera) {
      legajosDeCohorte = legajosDeCohorte.filter((l) => l.tipo_carrera === tipoCarrera);
    }
 
    return {
      cohorte_id: cohorte.id,
      cohorte_nombre: cohorte.nombre,
      anio: cohorte.anio,
      total_inscriptos: legajosDeCohorte.filter((l) => l.estado !== "BORRADOR").length,
      activos: legajosDeCohorte.filter((l) => l.estado === "ACTIVO").length,
      graduados: legajosDeCohorte.filter((l) => l.estado === "GRADUADO").length,
      en_riesgo: legajosDeCohorte.filter((l) => l.semaforo === "ROJO").length,
      dados_de_baja: legajosDeCohorte.filter((l) => l.estado === "BAJA").length,
    };
  });
 
  return HttpResponse.json(estadisticas);
}),

  // GET /api/v1/cohortes/:cohorteId/periodos
  http.get("/api/v1/cohortes/:cohorteId/periodos", async ({ params }) => {
    await randomDelay();
    return HttpResponse.json(getPeriodosPorCohorte(params.cohorteId as string));
  }),

  // GET /api/v1/periodos/vigente — público, sin login. El aspirante no
  // necesita saber el cohorte_id: el backend lo calcula mirando fechas.
  http.get("/api/v1/periodos/vigente", async () => {
    await randomDelay();
    return HttpResponse.json(getPeriodoVigente());
  }),

  // POST /api/v1/cohortes/:cohorteId/periodos
  http.post(
    "/api/v1/cohortes/:cohorteId/periodos",
    async ({ params, request }) => {
      await randomDelay();
      const body = (await request.json()) as {
        fecha_abre: string;
        fecha_cierra: string | null;
      };

      if (!body.fecha_abre) {
        return errorResponse(
          400,
          "VALIDATION_ERROR",
          "La fecha de apertura es obligatoria",
          "fecha_abre",
        );
      }
      if (body.fecha_cierra && body.fecha_cierra < body.fecha_abre) {
        return errorResponse(
          400,
          "VALIDATION_ERROR",
          "La fecha de cierre no puede ser anterior a la de apertura",
          "fecha_cierra",
        );
      }

      const nuevo = crearPeriodo(params.cohorteId as string, {
        fecha_abre: body.fecha_abre,
        fecha_cierra: body.fecha_cierra ?? null,
      });

      return HttpResponse.json(nuevo, { status: 201 });
    },
  ),

  // PATCH /api/v1/periodos/:id  (usado para cerrar el período)
  http.patch("/api/v1/periodos/:id", async ({ params, request }) => {
    await randomDelay();
    const body = (await request.json()) as { fecha_cierra: string | null };

    const actualizado = actualizarPeriodo(params.id as string, {
      fecha_cierra: body.fecha_cierra,
    });
    if (!actualizado) {
      return errorResponse(404, "NOT_FOUND", "Período no encontrado");
    }

    return HttpResponse.json(actualizado);
  }),

  // GET /api/v1/seminarios
  http.get("/api/v1/seminarios", async ({ request }) => {
    await randomDelay();
    const url = new URL(request.url);
    const nombre = url.searchParams.get("nombre");
    const docente = url.searchParams.get("docente");
    const es_obligatorio = url.searchParams.get("es_obligatorio");
    const page = Number(url.searchParams.get("page") ?? "1");
    const limit = Number(url.searchParams.get("limit") ?? "10");

    let resultado = seminarios;
    if (nombre) {
      resultado = resultado.filter((s) => 
        s.nombre.toLowerCase().includes(nombre.toLowerCase())
      );
    }
    if (docente) {
      resultado = resultado.filter((s) => 
        s.docente.toLowerCase().includes(docente.toLowerCase())
      );
    }
    if (es_obligatorio !== null) {
      const esObligatorioBool = es_obligatorio === "true";
      resultado = resultado.filter((s) => s.es_obligatorio === esObligatorioBool);
    }

    const total = resultado.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const inicio = (page - 1) * limit;
    const paginados = resultado.slice(inicio, inicio + limit);

    return HttpResponse.json({
      seminarios: paginados,
      total,
      page,
      limit,
      totalPages,
    });
  }),
];
