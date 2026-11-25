import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/shared/components/Button";
import { Spinner } from "@/shared/components/Spinner";
import ThemeToggle from "@/shared/components/ThemeToggle";
import { useAuth } from "@/shared/auth/authContext";
import { BadgeEstado } from "@/dashboard-coordinador/components/BadgeEstado";
import { useMisLegajos } from "@/dashboard-coordinador/hooks/useLegajos";
import { useDocumentos } from "@/dashboard-coordinador/hooks/useDocumentos";
import { MENSAJE_ESTADO, documentosRequeridos } from "@/shared/types/types";
import { ETIQUETA_TIPO } from "@/shared/types/types";
import type { EstadoDocumento, Legajo } from "@/shared/types/types";

const formatearFecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-AR") : "—";

function describirBeca(legajo: Legajo): string {
  if (!legajo.solicita_beca) return "No solicitada";
  return legajo.tipo_beca ? `Beca del ${legajo.tipo_beca}%` : "Solicitada";
}

/**
 * Consulta del propio legajo para el estudiante logueado (se llega desde WelcomeScreen → "Consultar Estado").
 * Es de solo lectura. Un estudiante puede tener hasta dos legajos (uno por carrera).
 *
 * PENDIENTE (backend): GET /legajos/mios y GET /legajos/:id/documentos con acceso a los propios.
 */
export function MiLegajo() {
  const { user } = useAuth();
  const { data: legajos, isLoading, isError, error, refetch } = useMisLegajos();

  return (
    <div className="screen-shell relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="mx-auto max-w-2xl space-y-6 p-6 screen-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-ink">Mi legajo</h1>
            {user && <p className="text-sm text-ink-secondary">Hola, {user.nombre}</p>}
          </div>
          <Link to="/welcome" className="text-sm font-medium text-brand-600 hover:underline">
            Volver
          </Link>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            <Spinner size="sm" /> Buscando tu legajo…
          </div>
        )}

        {isError && (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-semaforo-rojo">
              No pudimos cargar tu legajo: {error.message}
            </p>
            <Button className="w-full" onClick={() => void refetch()}>
              Reintentar
            </Button>
          </div>
        )}

        {legajos && legajos.length === 0 && (
          <div className="rounded-xl border border-line bg-paper-surface p-4 text-sm text-ink">
            Todavía no hay un legajo asociado a tu cuenta. Si ya te inscribiste, comunicate con la
            coordinación.
          </div>
        )}

        {legajos?.map((legajo) => (
          <TarjetaLegajo key={legajo.id} legajo={legajo} />
        ))}
      </div>
    </div>
  );
}

function TarjetaLegajo({ legajo }: { legajo: Legajo }) {
  const { data: documentos, isLoading, isError, error } = useDocumentos(legajo.id);

  const vigentes = (documentos ?? []).filter((d) => d.estado !== "FALTANTE");
  const porTipo = new Map(vigentes.map((d) => [d.tipo, d]));
  // Los obligatorios, más cualquier otro que ya haya subido (ej. el título de posgrado, que es opcional)
  const tipos = Array.from(
    new Set([...documentosRequeridos(legajo.solicita_beca), ...vigentes.map((d) => d.tipo)]),
  );
  const conPendientes = tipos.some((tipo) => {
    const estado = porTipo.get(tipo)?.estado;
    return !estado || estado === "OBSERVADO";
  });

  const subtitulo = [
    legajo.tipo_carrera,
    legajo.numero_legajo ? `Legajo N.º ${legajo.numero_legajo}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="space-y-5 rounded-xl border border-line bg-paper-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate">{legajo.carrera_elegida}</h2>
          {subtitulo && <p className="text-xs text-ink-secondary">{subtitulo}</p>}
        </div>
        <BadgeEstado estado={legajo.estado} />
      </div>

      <p className="text-sm text-ink">{MENSAJE_ESTADO[legajo.estado]}</p>

      <Seccion titulo="Inscripción">
        <Dato etiqueta="Fecha de inscripción" valor={formatearFecha(legajo.fecha_inscripcion)} />
        {legajo.fecha_activacion && (
          <Dato etiqueta="Fecha de activación" valor={formatearFecha(legajo.fecha_activacion)} />
        )}
        <Dato etiqueta="Beca" valor={describirBeca(legajo)} />
        <Dato etiqueta="Título de grado" valor={legajo.titulo_grado} />
        {legajo.titulo_posgrado && (
          <Dato etiqueta="Título de posgrado" valor={legajo.titulo_posgrado} />
        )}
      </Seccion>

      <Seccion titulo="Datos personales">
        <Dato etiqueta="Apellido y nombre" valor={`${legajo.apellido} ${legajo.nombre}`} />
        <Dato etiqueta="DNI" valor={legajo.dni} />
        <Dato etiqueta="Email" valor={legajo.email} />
        {legajo.email_alternativo && (
          <Dato etiqueta="Email alternativo" valor={legajo.email_alternativo} />
        )}
        <Dato etiqueta="Teléfono móvil" valor={legajo.telefono_movil} />
        <Dato
          etiqueta="Domicilio"
          valor={[
            legajo.domicilio.direccion,
            legajo.domicilio.ciudad,
            legajo.domicilio.provincia,
            legajo.domicilio.pais,
          ]
            .filter(Boolean)
            .join(", ")}
        />
      </Seccion>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-ink">Documentación</h3>

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            <Spinner size="sm" /> Cargando documentos…
          </div>
        )}

        {isError && (
          <p role="alert" className="text-xs text-semaforo-rojo">
            No pudimos cargar tus documentos: {error.message}
          </p>
        )}

        {!isLoading && !isError && (
          <>
            <ul className="divide-y divide-line">
              {tipos.map((tipo) => {
                const doc = porTipo.get(tipo);
                return (
                  <li key={tipo} className="flex items-start justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm text-ink">{ETIQUETA_TIPO[tipo]}</p>
                      {doc?.estado === "OBSERVADO" && (
                        <p className="mt-1 flex items-start gap-1 text-xs text-semaforo-amarillo">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {doc.motivo_observacion ?? "La coordinación pidió corregir este documento."}
                        </p>
                      )}
                    </div>
                    <EstadoDocumentoChip estado={doc?.estado ?? "FALTANTE"} />
                  </li>
                );
              })}
            </ul>
            {conPendientes && (
              <p className="text-xs text-ink-muted">
                Para completar o corregir documentos, comunicate con la coordinación.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-ink">{titulo}</h3>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-muted">{etiqueta}</dt>
      <dd className="break-words text-sm text-ink">{valor}</dd>
    </div>
  );
}

const CHIP_DOCUMENTO: Record<EstadoDocumento, { texto: string; clases: string; punto: string }> = {
  APROBADO: {
    texto: "Aprobado",
    clases: "bg-semaforo-verde-soft text-semaforo-verde dark:bg-semaforo-verde-soft-dark",
    punto: "bg-semaforo-verde",
  },
  PENDIENTE_REVISION: {
    texto: "En revisión",
    clases: "bg-neutral-100 text-ink-muted dark:bg-neutral-800",
    punto: "bg-neutral-400",
  },
  OBSERVADO: {
    texto: "Observado",
    clases: "bg-semaforo-amarillo-soft text-semaforo-amarillo dark:bg-semaforo-amarillo-soft-dark",
    punto: "bg-semaforo-amarillo",
  },
  FALTANTE: {
    texto: "Falta subir",
    clases: "bg-semaforo-rojo-soft text-semaforo-rojo dark:bg-semaforo-rojo-soft-dark",
    punto: "bg-semaforo-rojo",
  },
};

function EstadoDocumentoChip({ estado }: { estado: EstadoDocumento }) {
  const { texto, clases, punto } = CHIP_DOCUMENTO[estado];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${clases}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${punto}`} />
      {texto}
    </span>
  );
}
