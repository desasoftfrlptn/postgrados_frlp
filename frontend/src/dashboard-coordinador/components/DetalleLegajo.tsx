import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useLegajo } from "../hooks/useLegajos";
import { useAbrirDocumento, useDocumentos } from "../hooks/useDocumentos";
import { useTrabajoFinal } from "../hooks/useTrabajoFinal";
import { Spinner } from "@/shared/components/Spinner";
import { Button } from "@/shared/components/Button";
import { ArrowLeft, Download, Eye, GraduationCap } from "lucide-react";
import { Workflow } from "./Workflow";
import { ObservarDocumentoModal } from "./ObservarDocumentoModal";
import { AltaTrabajoFinalModal } from "./AltaTrabajoFinalModal";
import {
  type TipoDocumento,
  ETIQUETA_TIPO,
  type DocumentoConEstado,
} from "@/shared/types/types";
import { useAuth } from "@/shared/auth/authContext";
import { isApiError } from "@/shared/api/client";

export default function DetalleLegajo({ id: idProp }: { id?: string } = {}) {
  const { user: currentUser } = useAuth();
  const routeParams = useParams();
  const id = idProp || routeParams.id;

  const {
    data: legajo,
    isLoading: isLoadingLegajo,
    isError: isErrorLegajo,
    error: errorLegajo,
  } = useLegajo(id || "");

  const {
    data: documentos,
    isLoading: isLoadingDocumentos,
    isError: isErrorDocumentos,
    error: errorDocumentos,
  } = useDocumentos(id || "");

  const {
    data: trabajo,
    isError: isErrorTrabajo,
    error: errorTrabajo,
  } = useTrabajoFinal(id || "");
  const abrirDocumento = useAbrirDocumento();

  // "Todavía no hay trabajo final" puede llegar como 404: no es un error de la pantalla
  const trabajoNoExiste = isErrorTrabajo && isApiError(errorTrabajo) && errorTrabajo.isNotFound;
  const errorTrabajoReal = isErrorTrabajo && !trabajoNoExiste;

  const iniciales = `${legajo?.nombre[0] || ""}${legajo?.apellido[0] || ""}`.toUpperCase();
  const [docSeleccionado, setDocSeleccionado] = useState<DocumentoConEstado | null>(null);
  const [legajoParaTrabajoFinal, setLegajoParaTrabajoFinal] = useState<string | null>(null);

  // Solo el legajo bloquea la pantalla. Documentos y trabajo final dependen de endpoints propios:
  // si fallan, lo muestra su sección y el resto del detalle sigue disponible.
  if (isLoadingLegajo) {
    return (
      <div className="flex items-center gap-2 p-6 text-ink-secondary">
        <Spinner size="sm" /> Cargando legajo…
      </div>
    );
  }

  if (isErrorLegajo || !legajo) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-semaforo-rojo/20 bg-semaforo-rojo-soft p-4 text-sm text-semaforo-rojo dark:bg-semaforo-rojo-soft-dark"
      >
        No se pudo cargar el legajo: {errorLegajo?.message ?? "no se encontró."}
      </div>
    );
  }

  return (
    <>
      <Link to="/inscriptos">
        <Button variant="ghost" icon={ArrowLeft}>
          Volver
        </Button>
      </Link>

      <div className="flex flex-col gap-6 mt-4">
        {/* Cabecera */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center border-b border-line pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700 font-bold text-lg dark:bg-brand-950 dark:text-brand-300">
            {iniciales}
          </div>
          <div>
            <div className="text-lg font-bold text-ink">
              {legajo?.apellido}, {legajo?.nombre}
            </div>
            <div className="text-sm font-medium text-ink-secondary">
              {legajo?.numero_legajo
                ? `Legajo #${legajo.numero_legajo}`
                : `Estado: ${legajo?.estado?.replaceAll("_", " ") ?? ""}`}
            </div>
          </div>
          <div className="sm:ml-auto flex items-center gap-2">
            {currentUser?.rol === "cpr" && legajo?.estado === "ACTIVO" && !trabajo && !errorTrabajoReal && (
              <Button
                variant="outline"
                icon={GraduationCap}
                onClick={() => legajo && setLegajoParaTrabajoFinal(legajo.id)}
              >
                Trabajo Final
              </Button>
            )}
            <Button icon={Download} variant="outline">
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Datos personales y académicos */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="rounded-xl border border-line bg-surface-alt/50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Título de Grado
            </div>
            <div className="text-sm font-medium text-ink mt-1">
              {legajo?.titulo_grado}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-surface-alt/50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Tipo de Carrera
            </div>
            <div className="text-sm font-medium text-ink mt-1">
              {legajo?.tipo_carrera || "No especificado"}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-surface-alt/50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              DNI
            </div>
            <div className="text-sm font-medium text-ink mt-1 font-mono">
              {legajo?.dni}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-surface-alt/50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Ciudad / Provincia
            </div>
            <div className="text-sm font-medium text-ink mt-1">
              {legajo?.domicilio?.ciudad}, {legajo?.domicilio?.provincia}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-surface-alt/50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Email
            </div>
            <div className="text-xs font-medium text-ink mt-1 truncate">
              {legajo?.email}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-surface-alt/50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Teléfono
            </div>
            <div className="text-sm font-medium text-ink mt-1 font-mono">
              {legajo?.telefono_movil}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-surface-alt/50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Estado
            </div>
            <div className="text-sm font-medium text-ink mt-1">
              {legajo?.estado?.replaceAll("_", " ")}
            </div>
          </div>

          {/* Semáforo */}
          <div className="rounded-xl border border-line bg-surface-alt/50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Semáforo
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-block h-3 w-3 rounded-full ${
                  legajo?.semaforo === "VERDE"
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    : legajo?.semaforo === "AMARILLO"
                      ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                      : legajo?.semaforo === "ROJO"
                        ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                        : "bg-gray-400"
                }`}
              />
              <span className="text-sm font-medium text-ink uppercase">
                {legajo?.semaforo || "DESCONOCIDO"}
              </span>
            </div>
          </div>
        </div>

        {/* Motivación */}
        <div className="rounded-xl border border-line bg-surface-alt/30 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
            Motivación
          </div>
          <p className="text-sm text-ink italic">"{legajo?.motivacion}"</p>
        </div>

        {/* Documentos */}
        <div className="rounded-xl border border-line bg-surface-alt/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">
            Documentos
          </p>

          {isLoadingDocumentos && (
            <div className="flex items-center gap-2 py-2 text-sm text-ink-secondary">
              <Spinner size="sm" /> Cargando documentos…
            </div>
          )}
          {isErrorDocumentos && (
            <p role="alert" className="text-sm text-semaforo-rojo">
              No se pudieron cargar los documentos: {errorDocumentos?.message}
            </p>
          )}
          {abrirDocumento.isError && (
            <p role="alert" className="mb-2 text-xs text-semaforo-rojo">
              No se pudo abrir el documento: {abrirDocumento.error.message}
            </p>
          )}

          {!isLoadingDocumentos && !isErrorDocumentos && (
          <div className="flex flex-col divide-y divide-line">
            {(Object.keys(ETIQUETA_TIPO) as TipoDocumento[]).map((t) => {
              const docsDeEseTipo =
                documentos?.filter((d) => d.tipo === t) ?? [];
              const doc =
                docsDeEseTipo.find((d) => d.estado !== "FALTANTE") ??
                docsDeEseTipo[0];
              const noAplica =
                (t === "FORM_BECA" && !legajo?.solicita_beca) ||
                (t === "TITULO_POSGRADO" && !legajo?.titulo_posgrado);

              return (
                <div
                  key={t}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">
                      {ETIQUETA_TIPO[t]}
                    </p>

                    {doc ? (
                      <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-semaforo-verde-soft dark:bg-semaforo-verde-soft-dark px-2 py-0.5 text-xs font-medium text-semaforo-verde">
                        <span className="h-1.5 w-1.5 rounded-full bg-semaforo-verde" />
                        Subido
                      </span>
                    ) : noAplica ? (
                      <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-medium text-ink-muted">
                        <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
                        No aplica
                      </span>
                    ) : (
                      <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-semaforo-rojo-soft dark:bg-semaforo-rojo-soft-dark px-2 py-0.5 text-xs font-medium text-semaforo-rojo">
                        <span className="h-1.5 w-1.5 rounded-full bg-semaforo-rojo" />
                        No subido
                      </span>
                    )}
                  </div>

                  {doc && (
                    <>
                    <Button
                      variant="outline"
                      icon={Eye}
                      className="shrink-0"
                      onClick={() => setDocSeleccionado(doc)}
                    >
                      Observar
                    </Button>
                    <Button
                      type="button"
                      icon={Eye}
                      variant="outline"
                      disabled={abrirDocumento.isPending}
                      onClick={() => abrirDocumento.mutate({ docId: doc.id })}
                    >
                      Vista previa
                    </Button>
                    </>
                  )}
                </div>
              );
            })}
            {legajo && (
              <ObservarDocumentoModal
                doc={docSeleccionado}
                legajoId={legajo.id}
                onClose={() => setDocSeleccionado(null)}
              />
            )}
          </div>
          )}
        </div>

        {/* Trabajo Final */}
        {errorTrabajoReal && (
          <p role="alert" className="text-sm text-semaforo-rojo">
            No se pudo cargar el trabajo final: {errorTrabajo?.message}
          </p>
        )}
        {trabajo && (
          <div className="rounded-xl border border-line bg-surface-alt/50 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Trabajo Final
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 mt-3">
              <div className="rounded-xl border border-line bg-surface-alt/50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Título
                </div>
                <div className="text-sm font-medium text-ink mt-1">
                  {trabajo.titulo}
                </div>
              </div>
              <div className="rounded-xl border border-line bg-surface-alt/50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Director
                </div>
                <div className="text-sm font-medium text-ink mt-1">
                  {trabajo.director}
                </div>
              </div>
              <div className="rounded-xl border border-line bg-surface-alt/50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Codirector
                </div>
                <div className="text-sm font-medium text-ink mt-1">
                  {trabajo.codirector ?? "-"}
                </div>
              </div>
              <div className="rounded-xl border border-line bg-surface-alt/50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Tipo
                </div>
                <div className="text-sm font-medium text-ink mt-1">
                  {trabajo.tipo}
                </div>
              </div>
              <div className="rounded-xl border border-line bg-surface-alt/50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Fecha
                </div>
                <div className="text-sm font-medium text-ink mt-1">
                  {trabajo.fecha_cpr}
                </div>
              </div>
              <div className="rounded-xl border border-line bg-surface-alt/50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Número de resolución
                </div>
                <div className="text-sm font-medium text-ink mt-1">
                  {trabajo.numero_resolucion}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Workflow */}
        {legajo && <Workflow legajo={legajo} />}
      </div>

     {currentUser && (
           <AltaTrabajoFinalModal
        isOpen={legajoParaTrabajoFinal !== null}
        legajoId={legajoParaTrabajoFinal ?? ""}
        usuarioRol={currentUser.rol}
        onClose={() => setLegajoParaTrabajoFinal(null)}
       />
     )}
     </>
  );
}
