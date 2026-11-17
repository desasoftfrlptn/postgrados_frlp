import { useEffect, useState, type FormEvent } from "react";
import { Copy, Link2 } from "lucide-react";
import { Button } from "@/shared/components/Button";
import { Spinner } from "@/shared/components/Spinner";
import { useCrearEnlace } from "@/shared/hooks/useAccesos";
import { estaAbierto, formatFecha, usePeriodosInscripcion } from "@/shared/hooks/usePeriodos";
import { useCohortes } from "../hooks/useCohortes";
import { useLegajos } from "../hooks/useLegajos";
import { prepararEnlace } from "../helpers/enlaces";
import type { EnlaceCreado, TipoEnlace } from "@/shared/api/endpoints";
import type { Legajo } from "@/shared/types/types";

function SelectorLegajo({ seleccionado, onSeleccionar }: {
  seleccionado: Legajo | null; onSeleccionar: (legajo: Legajo) => void;
}) {
  const [apellido, setApellido] = useState("");
  const [dni, setDni] = useState("");
  const [filtros, setFiltros] = useState({ apellido: "", dni: "" });
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => setFiltros({ apellido: apellido.trim(), dni: dni.trim() }), 300);
    return () => clearTimeout(timer);
  }, [apellido, dni]);
  const query = useLegajos({ page, limit: 10, dni: filtros.dni || undefined,
    apellido: filtros.apellido.length >= 3 ? filtros.apellido : undefined });
  const pages = Math.max(1, query.data?.totalPages ?? 1);
  return <section className="space-y-3" aria-label="Seleccionar legajo">
    <h2 className="font-semibold text-ink">Destinatario del seguimiento</h2>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-sm">Apellido
        <input className="block w-full" value={apellido} placeholder="Mínimo 3 caracteres"
          onChange={(e) => { setApellido(e.target.value); setPage(1); }} />
      </label>
      <label className="space-y-1 text-sm">DNI
        <input className="block w-full" value={dni} inputMode="numeric" maxLength={8} placeholder="Buscar por DNI"
          onChange={(e) => { setDni(e.target.value.replace(/\D/g, "")); setPage(1); }} />
      </label>
    </div>
    {apellido.trim().length > 0 && apellido.trim().length < 3 && <p className="text-xs text-ink-muted">Escribí al menos 3 letras para filtrar por apellido.</p>}
    {query.isLoading ? <p className="flex items-center gap-2 text-sm"><Spinner size="sm" /> Buscando legajos…</p>
      : query.isError ? <div role="alert" className="space-y-2 text-sm text-semaforo-rojo">{query.error.message}
        <Button type="button" variant="outline" onClick={() => void query.refetch()}>Reintentar</Button></div>
      : <>
        <div className="divide-y divide-line rounded-xl border border-line">
          {query.data?.legajos.length === 0 && <p className="p-3 text-sm text-ink-secondary">No hay legajos para esta búsqueda.</p>}
          {query.data?.legajos.map((legajo) => <label key={legajo.id} className="flex cursor-pointer items-start gap-3 p-3 text-sm">
            <input type="radio" name="legajo-seguimiento" value={legajo.id} checked={seleccionado?.id === legajo.id}
              disabled={query.isPlaceholderData} onChange={() => onSeleccionar(legajo)} />
            <span><span className="font-medium">{legajo.apellido}, {legajo.nombre}</span>
              <span className="block text-xs text-ink-secondary">DNI {legajo.dni} · {legajo.carrera_elegida} · {legajo.numero_legajo ?? "Sin número asignado"}</span>
            </span>
          </label>)}
        </div>
        <nav aria-label="Paginación de legajos" className="flex items-center justify-between gap-2 text-sm">
          <Button type="button" variant="outline" disabled={page === 1 || query.isPlaceholderData} onClick={() => setPage(page - 1)}>Anterior</Button>
          <span>Página {page} de {pages}</span>
          <Button type="button" variant="outline" disabled={page >= pages || query.isPlaceholderData} onClick={() => setPage(page + 1)}>Siguiente</Button>
        </nav>
      </>}
    {seleccionado && <p role="status" className="rounded-lg bg-brand-50 p-3 text-sm text-brand-700 dark:bg-brand-950 dark:text-brand-300">
      Legajo seleccionado: {seleccionado.apellido}, {seleccionado.nombre} · DNI {seleccionado.dni} · {seleccionado.carrera_elegida}
    </p>}
  </section>;
}

export default function EnlacesAccesoPage() {
  const [tipo, setTipo] = useState<TipoEnlace>("INSCRIPCION");
  const [cohorteId, setCohorteId] = useState("");
  const [periodoId, setPeriodoId] = useState("");
  const [legajo, setLegajo] = useState<Legajo | null>(null);
  const [dias, setDias] = useState("7");
  const [usos, setUsos] = useState("");
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);
  const [generado, setGenerado] = useState<{ enlace: EnlaceCreado; destinatario: string } | null>(null);
  const [mensajeCopia, setMensajeCopia] = useState<string | null>(null);
  const cohortes = useCohortes();
  const periodos = usePeriodosInscripcion(tipo === "INSCRIPCION" ? cohorteId : "");
  const crear = useCrearEnlace();
  function generar(event: FormEvent) {
    event.preventDefault();
    if (crear.isPending) return;
    setErrorFormulario(null);
    try {
      const datos = prepararEnlace({ tipo, cohorteId, periodoId, legajoId: legajo?.id ?? "",
        duracionDias: Number(dias), usosMaximos: usos.trim() ? Number(usos) : null });
      const cohorte = cohortes.data?.find((c) => c.id === cohorteId);
      if (tipo === "INSCRIPCION" && !cohorte?.inscripcion_abierta) throw new Error("La cohorte debe tener la inscripción abierta.");
      const destinatario = tipo === "INSCRIPCION" ? cohorte!.nombre : `${legajo!.apellido}, ${legajo!.nombre} · DNI ${legajo!.dni}`;
      crear.mutate(datos, { onSuccess: (enlace) => { setGenerado({ enlace, destinatario }); setMensajeCopia(null); } });
    } catch (error) {
      setErrorFormulario(error instanceof Error ? error.message : "Revisá los datos del enlace.");
    }
  }
  async function copiar() {
    if (!generado) return;
    try {
      await navigator.clipboard.writeText(generado.enlace.url);
      setMensajeCopia("Enlace copiado.");
    } catch {
      setMensajeCopia("No se pudo copiar automáticamente. Seleccioná y copiá el enlace del campo.");
    }
  }
  return <div className="mx-auto max-w-3xl space-y-6">
    <div><h1 className="text-xl font-bold text-ink">Enlaces de acceso</h1>
      <p className="mt-1 text-sm text-ink-secondary">Generá y compartí enlaces de inscripción o de seguimiento para los aspirantes.</p></div>
    <form onSubmit={generar} className="rounded-xl border border-line bg-paper-surface p-5">
      <fieldset disabled={crear.isPending} className="space-y-5">
        <label className="block space-y-1 text-sm font-medium">Tipo de enlace
          <select className="block w-full" value={tipo} onChange={(e) => {
            setTipo(e.target.value as TipoEnlace); setCohorteId(""); setPeriodoId(""); setLegajo(null); setErrorFormulario(null); crear.reset();
          }}>
            <option value="INSCRIPCION">Inscripción</option><option value="SEGUIMIENTO">Seguimiento</option>
          </select>
        </label>
        {tipo === "INSCRIPCION" ? <div className="space-y-3">
          <label className="block space-y-1 text-sm">Cohorte
            <select className="block w-full" required value={cohorteId} disabled={cohortes.isLoading || cohortes.isError}
              onChange={(e) => { setCohorteId(e.target.value); setPeriodoId(""); }}>
              <option value="">{cohortes.isLoading ? "Cargando cohortes…" : "Seleccioná una cohorte"}</option>
              {cohortes.data?.map((c) => <option key={c.id} value={c.id} disabled={!c.inscripcion_abierta}>
                {c.nombre} ({c.anio}){c.inscripcion_abierta ? "" : " — inscripción cerrada"}
              </option>)}
            </select>
          </label>
          {cohortes.isError && <p role="alert" className="text-sm text-semaforo-rojo">{cohortes.error.message}</p>}
          {cohorteId && <label className="block space-y-1 text-sm">Período de inscripción (opcional)
            <select className="block w-full" value={periodoId} disabled={periodos.isLoading || periodos.isError} onChange={(e) => setPeriodoId(e.target.value)}>
              <option value="">Sin restricción a un período específico</option>
              {periodos.data?.map((p) => <option key={p.id} value={p.id}>
                {formatFecha(p.fecha_abre)} — {p.fecha_cierra ? formatFecha(p.fecha_cierra) : "Sin cierre"} · {estaAbierto(p) ? "Vigente" : "Fuera de fecha"}
              </option>)}
            </select>
          </label>}
          {periodos.isError && <p role="alert" className="text-sm text-semaforo-rojo">No se pudieron consultar los períodos: {periodos.error.message}</p>}
          <p className="text-xs text-ink-muted">Para completar la inscripción, la cohorte debe estar abierta y tener un período vigente. Si asociás un período al enlace, solo podrá usarse durante esas fechas.</p>
        </div> : <SelectorLegajo seleccionado={legajo} onSeleccionar={setLegajo} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">Vigencia en días
            <input className="block w-full" type="number" min={1} max={90} step={1} required value={dias} onChange={(e) => setDias(e.target.value)} />
          </label>
          <label className="space-y-1 text-sm">Límite de usos (opcional)
            <input className="block w-full" type="number" min={1} max={10000} step={1} value={usos} placeholder="Sin límite" onChange={(e) => setUsos(e.target.value)} />
          </label>
        </div>
        {(errorFormulario || crear.isError) && <p role="alert" className="text-sm text-semaforo-rojo">{errorFormulario ?? crear.error?.message}</p>}
        <Button type="submit" icon={Link2} isLoading={crear.isPending}
          disabled={tipo === "INSCRIPCION" ? !cohorteId || cohortes.isError : !legajo}>
          {crear.isPending ? "Generando enlace…" : "Generar enlace"}
        </Button>
      </fieldset>
    </form>
    {generado && <section className="space-y-3 rounded-xl border border-semaforo-verde/30 bg-paper-surface p-5" aria-label="Enlace generado">
      <h2 role="status" className="font-semibold text-semaforo-verde">Enlace generado correctamente</h2>
      <p className="text-sm text-ink">{generado.enlace.tipo === "INSCRIPCION" ? "Inscripción" : "Seguimiento"} · {generado.destinatario}</p>
      <p className="text-sm text-ink-secondary">Vence: {new Date(generado.enlace.expira_at).toLocaleString("es-AR")}</p>
      <label className="block space-y-1 text-sm">Enlace para compartir
        <input className="block w-full" readOnly value={generado.enlace.url} onFocus={(e) => e.currentTarget.select()} />
      </label>
      <Button type="button" variant="outline" icon={Copy} onClick={() => void copiar()}>Copiar enlace</Button>
      {mensajeCopia && <p role="status" className="text-sm text-ink-secondary">{mensajeCopia}</p>}
    </section>}
  </div>;
}
