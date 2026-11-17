import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../src");

// Transpila en memoria con el TypeScript del proyecto, sin agregar un runner ni emitir archivos.
// Solo se sustituye React Query para inspeccionar y ejecutar sus queryFn/mutationFn.
function cargarCliente(env = { VITE_API_BASE_URL: "http://api.test/api/v1" }) {
  const cache = new Map();
  let libroExportado;
  const xlsx = require("xlsx-js-style");
  function cargar(nombre, desde = root) {
    if (nombre === "@tanstack/react-query") return {
      useQuery: (options) => options,
      useMutation: (options) => ({ ...options, mutate: options.mutationFn, mutateAsync: options.mutationFn }),
      useQueryClient: () => ({ invalidateQueries() {} }),
    };
    if (nombre === "xlsx-js-style") return {
      ...xlsx, writeFile: (libro, archivo) => { libroExportado = { libro, archivo }; },
    };
    if (!nombre.startsWith(".") && !nombre.startsWith("@/")) return require(nombre);
    let path = nombre.startsWith("@/") ? resolve(root, nombre.slice(2)) : resolve(desde, nombre);
    if (!existsSync(path)) path += existsSync(path + ".ts") ? ".ts" : ".tsx";
    if (cache.has(path)) return cache.get(path).exports;
    const source = readFileSync(path, "utf8").replaceAll("import.meta.env", JSON.stringify(env));
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: path,
    });
    const module = { exports: {} };
    cache.set(path, module);
    new Function("require", "module", "exports", outputText)(
      (id) => cargar(id, dirname(path)), module, module.exports,
    );
    return module.exports;
  }
  return { cargar: (p) => cargar("@/" + p), exportado: () => libroExportado };
}
const json = (body) => new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
const fila = (id) => ({ id, numero_legajo: null, nombre: "Ana", apellido: `Apellido ${id}`,
  carrera_elegida: "Maestria", tipo_carrera: "Maestria", cohorte_id: "cohorte",
  fecha_inscripcion: null, semaforo: "ROJO" });

test("cohortes: listado y detalle reales con el campo abierta", async (t) => {
  const { cargar } = cargarCliente();
  const cohortes = [{ id: "1", anio: 2026, nombre: "Cohorte", abierta: true, fecha_inicio: null }];
  const llamadas = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    llamadas.push({ url, options }); return json(new URL(url).pathname.endsWith("/1") ? cohortes[0] : cohortes);
  });
  const hooks = cargar("dashboard-coordinador/hooks/useCohortes.ts");
  const listado = hooks.useCohortes();
  assert.equal(listado.select(await listado.queryFn())[0].inscripcion_abierta, true);
  const detalle = hooks.useCohorte("1");
  assert.equal(detalle.select(await detalle.queryFn()).id, "1");
  assert.deepEqual(llamadas.map(({ url }) => new URL(url).pathname), ["/api/v1/cohortes", "/api/v1/cohortes/1"]);
  assert.ok(llamadas.every(({ options }) => !options.headers.has("Authorization")));
  assert.equal(hooks.useCohorte("").enabled, false);
});

test("estadisticas y documentos: rutas reales, filtro de carrera y revision PATCH", async (t) => {
  const { cargar } = cargarCliente();
  const llamadas = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    llamadas.push({ url, options });
    return json(options.method === "PATCH" ? { id: "2", estado: "OBSERVADO" } : []);
  });
  const { cohortesApi, documentosApi } = cargar("shared/api/endpoints.ts");
  await cohortesApi.estadisticas("Maestria");
  await documentosApi.listar("1", { auth: false });
  await documentosApi.revisar("1", "2", { accion: "OBSERVAR", motivo: "PDF incompleto" });
  assert.equal(new URL(llamadas[0].url).pathname, "/api/v1/estadisticas/cohortes");
  assert.equal(new URL(llamadas[0].url).searchParams.get("tipo_carrera"), "Maestria");
  assert.equal(new URL(llamadas[1].url).pathname, "/api/v1/legajos/1/documentos");
  assert.equal(llamadas[1].options.credentials, "include");
  assert.equal(llamadas[1].options.headers.has("Authorization"), false);
  assert.equal(new URL(llamadas[2].url).pathname, "/api/v1/legajos/1/documentos/2");
  assert.equal(llamadas[2].options.method, "PATCH");
  assert.deepEqual(JSON.parse(llamadas[2].options.body), { accion: "OBSERVAR", motivo: "PDF incompleto" });
  const hook = cargar("dashboard-coordinador/hooks/useDocumentos.ts");
  assert.equal(hook.useDocumentos("1").enabled, true);
  assert.equal(hook.useDocumentos("").enabled, false);
  assert.notEqual(cargar("dashboard-coordinador/hooks/useCohortes.ts").useEstadisticasCohortes().enabled, false);
});

test("documentos: multipart file/tipo, cookie y sin Content-Type ni Bearer de personal", async (t) => {
  const { cargar } = cargarCliente();
  cargar("shared/api/client.ts").configureApiClient({ getToken: () => "staff-token" });
  let request;
  t.mock.method(globalThis, "fetch", async (url, options) => { request = { url, options }; return json({ id: "doc" }); });
  const { documentosApi } = cargar("shared/api/endpoints.ts");
  await documentosApi.subir("legajo", new File(["%PDF"], "dni.pdf", { type: "application/pdf" }), "DNI");
  assert.equal(new URL(request.url).pathname, "/api/v1/legajos/legajo/documentos");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.credentials, "include");
  assert.equal(request.options.headers.has("Authorization"), false);
  assert.equal(request.options.headers.has("Content-Type"), false);
  assert.equal(request.options.body.get("file").name, "dni.pdf");
  assert.equal(request.options.body.get("tipo"), "DNI");
  assert.deepEqual([...request.options.body.keys()], ["file", "tipo"]);
  await assert.rejects(documentosApi.subir("legajo", new File([], "dni.pdf"), "DNI", { auth: true }),
    (error) => error.errorCode === "FEATURE_UNAVAILABLE");
});

test("descarga PDF: permite Bearer o cookie sin mezclarlos y conserva filename", async (t) => {
  const { cargar } = cargarCliente();
  cargar("shared/api/client.ts").configureApiClient({ getToken: () => "staff-token" });
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url, options });
    return new Response("%PDF", { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=archivo.pdf" } });
  });
  const { documentosApi } = cargar("shared/api/endpoints.ts");
  const staff = await documentosApi.descargar("doc");
  const aspirante = await documentosApi.descargar("doc", { auth: false });
  assert.equal(staff.filename, "archivo.pdf");
  assert.equal(await aspirante.blob.text(), "%PDF");
  assert.ok(requests.every(({ url }) => new URL(url).pathname === "/api/v1/documentos/doc/download"));
  assert.equal(requests[0].options.headers.get("Authorization"), "Bearer staff-token");
  assert.equal(requests[1].options.headers.has("Authorization"), false);
  assert.equal(requests[1].options.credentials, "include");
});

test("riesgo: recorre mas de 20 filas, pagina hasta el final y propaga la cancelacion", async (t) => {
  const { cargar } = cargarCliente();
  const pages = [];
  const signal = new AbortController().signal;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    const parsed = new URL(url); const page = Number(parsed.searchParams.get("page")); pages.push(page);
    assert.equal(parsed.pathname, "/api/v1/graduacion/en-riesgo");
    assert.equal(parsed.searchParams.get("limit"), "100");
    assert.equal(options.signal, signal);
    return json({ data: Array.from({ length: page === 1 ? 100 : 5 }, (_, i) => fila(String((page - 1) * 100 + i))),
      page, limit: 100, total: 105, pages: 2 });
  });
  const { riesgoApi } = cargar("shared/api/endpoints.ts");
  assert.equal((await riesgoApi.listarTodos(signal)).length, 105);
  assert.deepEqual(pages, [1, 2]);
  const hook = cargar("dashboard-coordinador/hooks/useEstudiantesEnRiesgo.ts");
  const estudiante = hook.desdeApiRiesgo(fila("1"));
  assert.equal(estudiante.id, "1");
  assert.equal(estudiante.fechaInscripcion, null);
  assert.equal(estudiante.seminariosAdeudados, null);
  assert.equal(estudiante.diasSinAvance, null);
  assert.equal(estudiante.estado, "rojo");
});

test("riesgo: un error en otra pagina se propaga sin devolver un listado parcial", async (t) => {
  const { cargar } = cargarCliente();
  t.mock.method(globalThis, "fetch", async (url) => new URL(url).searchParams.get("page") === "1"
    ? json({ data: [fila("1")], page: 1, limit: 100, total: 101, pages: 2 })
    : new Response(JSON.stringify({ detail: "Error real" }), { status: 500, headers: { "Content-Type": "application/json" } }));
  await assert.rejects(cargar("shared/api/endpoints.ts").riesgoApi.listarTodos(), /Error real/);
});

test("consulta del aspirante: consulta legajo y documentos con cookie", async (t) => {
  const { cargar } = cargarCliente();
  const urls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    urls.push(url);
    assert.equal(options.credentials, "include");
    assert.equal(options.headers.has("Authorization"), false);
    return json(url.endsWith("/documentos") ? [{ id: "doc", estado: "OBSERVADO" }] : { id: "1", nombre: "Ana", estado: "PENDIENTE" });
  });
  const query = cargar("inscripcion-aspirante/hooks/useEstados.ts").useConsultaEstado();
  const result = await query.queryFn();
  assert.equal(result.id, "1");
  assert.equal(result.documentos[0].estado, "OBSERVADO");
  assert.deepEqual(urls.map((url) => new URL(url).pathname), ["/api/v1/accesos/legajo", "/api/v1/legajos/1/documentos"]);
});

test("riesgo: tabla paginada y Excel completo muestran metricas no disponibles", async () => {
  const { cargar, exportado } = cargarCliente();
  const { desdeApiRiesgo } = cargar("dashboard-coordinador/hooks/useEstudiantesEnRiesgo.ts");
  const estudiantes = Array.from({ length: 25 }, (_, i) => desdeApiRiesgo(fila(String(i))));
  const componente = cargar("dashboard-coordinador/components/EstudiantesEnRiesgo.tsx");
  const html = renderToStaticMarkup(createElement(componente.default, { estudiantes }));
  assert.equal((html.match(/<tr /g) ?? []).length, 20);
  assert.match(html, /No disponible/);
  assert.match(html, /25 estudiantes/);
  assert.match(html, /Siguiente/);
  assert.doesNotMatch(html, /amarillo|Recalcular|Asignar VERDE/);
  await componente.exportarExcel(estudiantes, "riesgo", "Ana");
  const { libro } = exportado();
  const rows = require("xlsx-js-style").utils.sheet_to_json(libro.Sheets[libro.SheetNames[0]]);
  assert.equal(rows.length, 25);
  assert.equal(rows[0]["Seminarios adeudados"], "No disponible");
  assert.equal(rows[0]["D\u00edas sin avance"], "No disponible");
  assert.equal(rows[0]["Fecha de inscripci\u00f3n"], "No disponible");
});


test("vista previa: abre antes del fetch, usa cookie y revoca el blob", async (t) => {
  const { cargar } = cargarCliente();
  const eventos = [];
  const ventana = { opener: {}, location: { href: "" }, closed: false, close() { this.closed = true; } };
  const previo = globalThis.window;
  globalThis.window = { open: () => { eventos.push("open"); return ventana; } };
  t.after(() => { if (previo === undefined) delete globalThis.window; else globalThis.window = previo; });
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    eventos.push("fetch"); assert.equal(options.credentials, "include");
    assert.equal(options.headers.has("Authorization"), false);
    return new Response("%PDF", { headers: { "Content-Type": "application/pdf" } });
  });
  t.mock.method(URL, "createObjectURL", (blob) => { assert.equal(blob.type, "application/pdf"); return "blob:pdf"; });
  let liberar;
  t.mock.method(globalThis, "setTimeout", (callback) => { liberar = callback; return 1; });
  const revocados = [];
  t.mock.method(URL, "revokeObjectURL", (url) => revocados.push(url));
  await cargar("dashboard-coordinador/hooks/useDocumentos.ts").useAbrirDocumento().mutate({ docId: "doc", auth: false });
  assert.deepEqual(eventos, ["open", "fetch"]);
  assert.equal(ventana.opener, null);
  assert.equal(ventana.location.href, "blob:pdf");
  liberar();
  assert.deepEqual(revocados, ["blob:pdf"]);
});

test("vista previa: cierra la ventana cuando la descarga falla", async (t) => {
  const { cargar } = cargarCliente();
  const ventana = { close: t.mock.fn() };
  t.mock.method(globalThis, "fetch", async () => new Response("", { status: 403 }));
  const hook = cargar("dashboard-coordinador/hooks/useDocumentos.ts").useAbrirDocumento();
  await assert.rejects(hook.mutationFn({ docId: "doc", ventana, auth: false }), (error) => error.statusCode === 403);
  assert.equal(ventana.close.mock.calls.length, 1);
});

test("funciones ausentes no se confunden con errores de red ni se reintentan", async () => {
  const { cargar } = cargarCliente();
  const { documentosApi } = cargar("shared/api/endpoints.ts");
  const { shouldRetryQuery } = cargar("shared/api/client.ts");
  await assert.rejects(documentosApi.subir("1", new File([], "dni.pdf"), "DNI", { auth: true }), (error) => {
    assert.equal(error.isNetworkError, false);
    assert.equal(shouldRetryQuery(0, error), false);
    return true;
  });
});


test("cliente: respeta VITE_API_BASE_URL y usa proxy relativo por defecto", async (t) => {
  const urls = [];
  t.mock.method(globalThis, "fetch", async (url) => { urls.push(url); return json([]); });
  await cargarCliente({ VITE_API_BASE_URL: "/api/v1", VITE_API_URL: "http://incorrecto.test" })
    .cargar("shared/api/endpoints.ts").cohortesApi.listar();
  await cargarCliente({}).cargar("shared/api/endpoints.ts").cohortesApi.listar();
  assert.deepEqual(urls, ["/api/v1/cohortes", "/api/v1/cohortes"]);
});


test("exportar legajo PDF: descarga autenticada con filename del backend", async (t) => {
  const { cargar } = cargarCliente();
  cargar("shared/api/client.ts").configureApiClient({ getToken: () => "staff-token" });
  let solicitud;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    solicitud = { url, options };
    return new Response("%PDF-1.7", { headers: { "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="legajo-1.pdf"' } });
  });
  const result = await cargar("shared/api/endpoints.ts").legajosApi.exportarPdf("1");
  assert.equal(new URL(solicitud.url).pathname, "/api/v1/legajos/1/exportar-pdf");
  assert.equal(solicitud.options.method, "GET");
  assert.equal(solicitud.options.headers.get("Authorization"), "Bearer staff-token");
  assert.equal(result.filename, "legajo-1.pdf");
  assert.equal(await result.blob.text(), "%PDF-1.7");
});
