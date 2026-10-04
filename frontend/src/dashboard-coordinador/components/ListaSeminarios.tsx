import { useState } from "react";
import { Search, Link as LinkIcon, ArrowLeft } from "lucide-react";
import { useSeminarios } from "../hooks/useSeminarios";
import { Button } from "@/shared/components/Button";
import { Spinner } from "@/shared/components/Spinner";

const limit = 10;

function obtenerFinDeCuatrimestrePorDefecto(): string {
  const anioActual = new Date().getFullYear();
  return `${anioActual}-12-31`;
}

function ListaSeminarios() {
  const [nombre, setNombre] = useState<string>("");
  const [docente, setDocente] = useState<string>("");
  const [es_obligatorio, setEsObligatorio] = useState<boolean | undefined>(undefined);
  const [horas_catedra, setHorasCatedra] = useState<string>("");
  const [page, setPage] = useState(1);

  const [linksGenerados, setLinksGenerados] = useState<Record<string, { link: string; expira: string }>>({});
  const [fechasExpiracion, setFechasExpiracion] = useState<Record<string, string>>({});

  const handleFechaChange = (id: string, fecha: string) => {
    setFechasExpiracion((prev) => ({ ...prev, [id]: fecha }));
  };

  const generarLinkDocente = (id: string) => {
    const fecha = fechasExpiracion[id] || obtenerFinDeCuatrimestrePorDefecto();
    const buffer = new Uint8Array(32);
    window.crypto.getRandomValues(buffer);
    const token = Array.from(buffer, (b) => b.toString(16).padStart(2, "0")).join("");

    setLinksGenerados((prev) => ({
      ...prev,
      [id]: { link: `/api/v1/seminarios/${id}/link?token=${token}`, expira: fecha },
    }));
  };

  const {
    data: seminarios,
    isLoading: isLoadingSeminarios,
    isError: isErrorSeminarios,
    error: errorSeminarios,
    isPlaceholderData,
  } = useSeminarios({
    nombre,
    docente,
    es_obligatorio,
    horas_catedra,
    page,
    limit,
  });
  const totalPages = seminarios?.totalPages ?? 1;

  if (isLoadingSeminarios) {
    return (
      <div className="flex items-center gap-2 p-6 text-ink-secondary">
        <Spinner size="sm" /> Cargando…
      </div>
    );
  }

  if (isErrorSeminarios) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-semaforo-rojo/20 bg-semaforo-rojo-soft p-4 text-sm text-semaforo-rojo dark:bg-semaforo-rojo-soft-dark"
      >
        {`No se pudieron cargar los seminarios: ${(errorSeminarios as Error).message}`}
      </div>
    );
  }

  const seminariosFiltrados = seminarios?.seminarios.filter(
    (sem) => {
     const cumpleNombre = sem.nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .includes(
        nombre
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
      );

    const cumpleDocente = sem.docente
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .includes(
        docente
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
      );

    const cumpleObligatorio =
      es_obligatorio === undefined || sem.es_obligatorio === es_obligatorio;

    return cumpleNombre && cumpleDocente && cumpleObligatorio;
    }
  );

  return (
  <div className="space-y-6">
    {/* Encabezado */}
    <div className="space-y-3">
      <h1>Seminarios</h1>
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
                  placeholder="Buscar por nombre"
                  className="w-full pl-9"
                />
              </div>
              <input
                type="text"
                name="docente"
                id="docente"
                value={docente ?? ""}
                onChange={(e) => {
                  setDocente(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por docente"
                className="sm:w-56"
              />
            </div>
          </div>

          {/* Filtros */}
        <div className="flex flex-wrap gap-3 border-b border-line bg-paper-elevated/50 px-4 py-3">
          <select
            name="es_obligatorio"
            id="es_obligatorio"
            value={es_obligatorio === undefined ? "" : String(es_obligatorio)}
            onChange={(e) => {
              const v = e.target.value;
              setEsObligatorio(v === "" ? undefined : v === "true");
              setPage(1);
            }}
            className="!py-1.5 text-xs"
          >
            <option value="">Tipo de Seminario</option>
            <option value="true">Obligatorio</option>
            <option value="false">Optativo</option>
          </select>
        </div>

        {/* Tabla */}
        <div className="scroll-fade overflow-x-auto transition-all duration-300">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-medium uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3">Seminario</th>
                <th className="px-4 py-3">Docente</th>
                <th className="px-4 py-3">Condición</th>
                <th className="px-4 py-3">Horas Cátedra</th>
                <th className="px-4 py-3">Fecha de Expiración</th>
                <th className="px-4 py-3 text-right">Generar Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {seminariosFiltrados?.map((sem) => {
                const fechaActual = fechasExpiracion[sem.id] || obtenerFinDeCuatrimestrePorDefecto();

                return (
                  <tr
                    key={sem.id}
                    className="transition-colors hover:bg-paper-elevated/60"
                  >
                    <td className="px-4 py-3 font-medium text-ink">
                      {sem.nombre} {sem.codigo && <span className="text-xs text-ink-muted">({sem.codigo})</span>}
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">
                      {sem.docente} {sem.email_docente && <span className="block text-xs text-ink-muted">{sem.email_docente}</span>}
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">
                      {sem.es_obligatorio ? "Obligatorio" : "Optativo"}
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">
                      {sem.horas_catedra ?? sem.horasCatedra ?? "—"} hs
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">
                      <input 
                        type="date" 
                        value={fechaActual}
                        onChange={(e) => handleFechaChange(sem.id, e.target.value)}
                        className="border rounded px-2 py-1 text-xs bg-paper text-ink"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-2">
                          {linksGenerados[sem.id] && (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                readOnly
                                value={linksGenerados[sem.id].link}
                                className="w-56 rounded border px-2 py-1 text-xs bg-paper text-ink"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}${linksGenerados[sem.id].link}`);
                                }}
                                title="Copiar link"
                              >
                                Copiar
                              </Button>
                            </div>
                          )}
                          <Button
                            icon={LinkIcon}
                            variant="ghost"
                            title="Generar Link"
                            onClick={() => generarLinkDocente(sem.id)}
                          />
                        </div>
                        {linksGenerados[sem.id] && (
                          <span className="text-[10px] text-ink-muted">
                            Expira: {linksGenerados[sem.id].expira}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

            {seminarios?.seminarios.length === 0 && (
            <p className="p-10 text-center text-sm text-ink-muted">
              No hay seminarios para este filtro.
            </p>
          )}
        </div>

        {/* Paginación */}
        {seminarios && seminarios.total > 0 && (
          <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-3 text-sm text-ink-secondary">
            <span>
              Página {seminarios.page} de {totalPages} — {seminarios.total} seminario
              {seminarios.total !== 1 ? "s" : ""} en total
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

export default ListaSeminarios;