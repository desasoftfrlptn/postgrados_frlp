import { useState } from "react";
import { Eye, Download, Search, ArrowLeft } from "lucide-react";
import type { EstadoLegajo, TipoCarrera } from "@/shared/types/types";
import { useLegajos } from "../hooks/useLegajos";
import { useCohortes } from "../hooks/useCohortes";
import { Spinner } from "@/shared/components/Spinner";
import { BadgeEstado } from "./BadgeEstado";
import { Button } from "@/shared/components/Button";
import DetalleLegajo from "./DetalleLegajo";

const limit = 10;

function ListaInscriptos() {
  const [estado, setEstado] = useState<EstadoLegajo | undefined>(undefined);
  const [solo_con_beca, setBeca] = useState<boolean | undefined>(undefined);
  const [dni, setDni] = useState<string>("");
  const [nombre, setNombre] = useState<string>("");
  const [cohorte_id, setCohorte] = useState<string | undefined>(undefined);
  const [tipo_carrera, setTipoCarrera] = useState<TipoCarrera | undefined>(
    undefined,
  );
  const [page, setPage] = useState(1);
  const [inscripto, setInscripto] = useState<string | undefined>(undefined);
  const {
    data: legajos,
    isLoading: isLoadingLegajos,
    isError: isErrorLegajos,
    error: errorLegajos,
    isPlaceholderData,
  } = useLegajos({
    estado,
    solo_con_beca,
    tipo_carrera,
    cohorte_id,
    page,
    limit,
  });
  const {
    data: cohortes,
    isLoading: isLoadingCohortes,
    isError: isErrorCohortes,
    error: errorCohortes,
  } = useCohortes();
  const totalPages = legajos?.totalPages ?? 1;

  if (isLoadingLegajos || isLoadingCohortes) {
    return (
      <div className="flex items-center gap-2 p-6 text-ink-secondary">
        <Spinner size="sm" /> Cargando…
      </div>
    );
  }

  if (isErrorLegajos || isErrorCohortes) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-semaforo-rojo/20 bg-semaforo-rojo-soft p-4 text-sm text-semaforo-rojo dark:bg-semaforo-rojo-soft-dark"
      >
        {isErrorLegajos &&
          `No se pudieron cargar los legajos: ${(errorLegajos as Error).message}`}
        {isErrorCohortes &&
          `No se pudieron cargar los cohortes: ${(errorCohortes as Error).message}`}
      </div>
    );
  }

  if (inscripto) {
    return (
    <>
      <Button icon={ArrowLeft} variant="ghost" onClick={() => setInscripto(undefined)}>
        Volver
      </Button>
      <DetalleLegajo id={inscripto} />
    </>
    )
  }

  const legajosFiltrados = legajos?.legajos.filter(
    (legajo) =>
      (legajo.apellido + legajo.nombre)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(
          nombre
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase(),
        ) && legajo.dni.includes(dni),
  );

  return (
    <div className="space-y-6">
      {/* Encabezado + tabs de cohorte */}
      <div className="space-y-3">
        <h1>Inscriptos por cohorte</h1>
        <div className="flex flex-wrap gap-2">
          {cohortes?.map((c) => {
            const isActive = c.id === cohorte_id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setCohorte(c.id);
                  setPage(1);
                }}
                aria-pressed={isActive}
                className={[
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-500 text-white shadow-sm"
                    : "bg-paper-surface text-ink-secondary ring-1 ring-inset ring-line hover:bg-paper-elevated",
                ].join(" ")}
              >
                {c.nombre}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tarjeta de tabla */}
      <div className="rounded-2xl border border-line bg-paper-surface shadow-card transition-[height] duration-300">
        {/* Barra de búsqueda */}
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                name="nombre"
                id="nombre"
                value={nombre ?? ""}
                onChange={(e) => {
                  setNombre(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por nombre completo"
                className="w-full pl-9"
              />
            </div>
            <input
              type="number"
              name="dni"
              id="dni"
              value={dni ?? ""}
              onChange={(e) => {
                setDni(e.target.value.toString());
                setPage(1);
              }}
              placeholder="Buscar por DNI"
              className="sm:w-44"
            />
          </div>
          <Button icon={Download} variant="outline">
            Exportar
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 border-b border-line bg-paper-elevated/50 px-4 py-3">
          <select
            name="tipo_carrera"
            id="tipo_carrera"
            value={tipo_carrera ?? ""}
            onChange={(e) => {
              setTipoCarrera(
                (e.target.value || undefined) as TipoCarrera | undefined,
              );
              setPage(1);
            }}
            className="!py-1.5 text-xs"
          >
            <option value="">Carrera</option>
            <option value="Maestria">Maestría</option>
            <option value="Especializacion">Especialización</option>
            <option value="Doctorado">Doctorado</option>
          </select>

          <select
            value={estado ?? ""}
            onChange={(e) => {
              setEstado(
                (e.target.value || undefined) as EstadoLegajo | undefined,
              );
              setPage(1);
            }}
            className="!py-1.5 text-xs"
          >
            <option value="">Estado</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="EN_REVISION">En revisión</option>
            <option value="OBSERVADO">Observado</option>
            <option value="ACTIVO">Activo</option>
          </select>

          <select
            name="solo_con_beca"
            id="solo_con_beca"
            value={solo_con_beca === undefined ? "" : String(solo_con_beca)}
            onChange={(e) => {
              const v = e.target.value;
              setBeca(v === "" ? undefined : v === "true");
              setPage(1);
            }}
            className="!py-1.5 text-xs"
          >
            <option value="">Beca</option>
            <option value="true">Con beca</option>
            <option value="false">Sin beca</option>
          </select>
        </div>

        {/* Tabla */}
        <div className="scroll-fade overflow-x-auto transition-all duration-300">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-medium uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3">Apellido y nombre</th>
                <th className="px-4 py-3">DNI</th>
                <th className="px-4 py-3">Carrera</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Beca</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {legajosFiltrados?.map((legajo) => (
                <tr
                  key={legajo.id}
                  className="transition-colors hover:bg-paper-elevated/60"
                >
                  <td className="px-4 py-3 font-medium text-ink">
                    {legajo.apellido}, {legajo.nombre}
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">{legajo.dni}</td>
                  <td className="px-4 py-3 text-ink-secondary">
                    {legajo.tipo_carrera ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <BadgeEstado estado={legajo.estado} />
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">
                    {legajo.solicita_beca ? `${legajo.tipo_beca}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      icon={Eye}
                      variant="ghost"
                      onClick={() => setInscripto(legajo.id)}
                    >
                      Ver legajo
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {legajos?.legajos.length === 0 && (
            <p className="p-10 text-center text-sm text-ink-muted">
              No hay legajos para este filtro.
            </p>
          )}
        </div>

        {/* Paginación */}
        {legajos && legajos.total > 0 && (
          <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-3 text-sm text-ink-secondary">
            <span>
              Página {legajos.page} de {totalPages} — {legajos.total} legajo
              {legajos.total !== 1 ? "s" : ""} en total
            </span>

            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                disabled={page >= totalPages || isPlaceholderData}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ListaInscriptos;
