import { ETIQUETA_TIPO } from "@/shared/types/types";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/Button";
import { Spinner } from "@/shared/components/Spinner";
import ThemeToggle from "@/shared/components/ThemeToggle";
import {
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  X,
} from "lucide-react";
import { useAdjuntarDocumento, useConsultaEstado } from "../hooks/useEstados";
import { useCerrarSesionAcceso } from "@/shared/hooks/useAccesos";
import { isApiError } from "@/shared/api/client";
import { MENSAJE_ESTADO, documentosRequeridos } from "@/shared/types/types";
import type { EstadoLegajo, TipoDocumento } from "@/shared/types/types";

const TAMANIO_MAX_BYTES = 5 * 1024 * 1024;

/* Qué tiene que hacer el aspirante, según el estado del legajo y sus documentos. */
type ProximoPaso =
  | { tipo: "subir"; cantidad: number }
  | { tipo: "esperar" }
  | { tipo: "contactar" }
  | { tipo: "ninguno" };

const ESTADOS_CERRADOS: EstadoLegajo[] = ["RECHAZADO", "BAJA", "VENCIDO"];
const ESTADOS_EN_ESPERA: EstadoLegajo[] = ["BORRADOR", "PENDIENTE", "EN_REVISION"];

function proximoPaso(estado: EstadoLegajo, pendientes: number): ProximoPaso {
  if (ESTADOS_CERRADOS.includes(estado)) return { tipo: "contactar" };
  if (pendientes > 0) return { tipo: "subir", cantidad: pendientes };
  if (ESTADOS_EN_ESPERA.includes(estado)) return { tipo: "esperar" };
  // Observado, pero sin documentos para volver a subir: hay que resolverlo con la coordinación
  if (estado === "OBSERVADO") return { tipo: "contactar" };
  return { tipo: "ninguno" };
}

function Pantalla({ children }: { children: React.ReactNode }) {
  return (
    <div className="screen-shell relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}

export function ConsultarEstado() {
  const navigate = useNavigate();

  // Archivos elegidos pero todavía no enviados al servidor.
  const [archivosStaging, setArchivosStaging] = useState<
    Map<TipoDocumento, File>
  >(new Map());
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [envioExitoso, setEnvioExitoso] = useState(false);

  const { data: legajo, isLoading, isError, error, refetch } = useConsultaEstado();
  const adjuntar = useAdjuntarDocumento(legajo?.id);
  const cerrarSesion = useCerrarSesionAcceso();

  function handleSalir() {
    cerrarSesion.mutate(undefined, {
      onSuccess: () => navigate("/", { replace: true }),
    });
  }

  function handleSeleccionarArchivo(tipo: TipoDocumento, file: File) {
    setArchivosStaging((prev) => {
      const copia = new Map(prev);
      copia.set(tipo, file);
      return copia;
    });
    setEnvioExitoso(false);
  }

  function handleQuitarArchivo(tipo: TipoDocumento) {
    setArchivosStaging((prev) => {
      const copia = new Map(prev);
      copia.delete(tipo);
      return copia;
    });
  }

  async function handleEnviar() {
    if (!legajo || archivosStaging.size === 0) return;
    setErrorEnvio(null);
    setEnvioExitoso(false);

    let subidos = 0;
    try {
      // Sube los documentos elegidos de a uno. El backend actualiza solo el estado del legajo
      // cuando recibe los documentos nuevos: acá no hay que cambiarlo.
      for (const [tipo, file] of Array.from(archivosStaging)) {
        await adjuntar.mutateAsync({ file, tipo });
        handleQuitarArchivo(tipo); // lo que ya se subió sale de la lista a enviar
        subidos++;
      }
      setEnvioExitoso(true);
    } catch (err) {
      const mensaje =
        err instanceof Error
          ? err.message
          : "No pudimos enviar tus documentos. Probá de nuevo.";
      setErrorEnvio(
        subidos > 0 ? `${mensaje} Los documentos anteriores sí se enviaron.` : mensaje,
      );
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-ink-secondary screen-shell relative">
        <Spinner size="sm" /> Buscando tu inscripción…
      </div>
    );
  }

  if (isError || !legajo) {
    const enlaceVencido = isApiError(error) && error.isUnauthorized;
    return (
      <Pantalla>
        <div className="mx-auto max-w-md space-y-4 p-6 screen-card">
          <h1 className="text-lg font-semibold text-ink">
            No pudimos cargar tu inscripción
          </h1>
          <p role="alert" className="text-sm text-ink-secondary">
            {enlaceVencido
              ? "Tu enlace venció. Pedile a la coordinación que te envíe uno nuevo."
              : (error?.message ?? "Probá de nuevo en unos minutos.")}
          </p>
          {!enlaceVencido && (
            <Button className="w-full" onClick={() => void refetch()}>
              Reintentar
            </Button>
          )}
        </div>
      </Pantalla>
    );
  }

  const requeridos = documentosRequeridos(legajo.solicita_beca);
  const documentosVigentes = legajo.documentos.filter((d) => d.estado !== "FALTANTE");
  const subidosPorTipo = new Map(documentosVigentes.map((d) => [d.tipo, d]));
  const faltantes = requeridos.filter((tipo) => !subidosPorTipo.has(tipo));
  const observados = documentosVigentes.filter((d) => d.estado === "OBSERVADO");
  const paso = proximoPaso(legajo.estado, faltantes.length + observados.length);

  return (
    <Pantalla>
      <div className="mx-auto max-w-2xl space-y-6 p-6 screen-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-ink">
              Hola, {legajo.nombre} {legajo.apellido}
            </h1>
            {legajo.numero_legajo && (
              <p className="text-sm text-ink-secondary">
                Legajo N.º {legajo.numero_legajo}
              </p>
            )}
          </div>
          <button
            onClick={handleSalir}
            disabled={cerrarSesion.isPending}
            className="text-sm font-medium text-brand-600 hover:underline disabled:opacity-50"
          >
            Salir
          </button>
        </div>

        <div className="rounded-xl border border-line bg-paper-surface p-4">
          <p className="text-sm text-ink">{MENSAJE_ESTADO[legajo.estado]}</p>
        </div>

        {envioExitoso && (
          <div className="flex items-center gap-2 rounded-xl bg-semaforo-verde-soft p-4 text-sm text-semaforo-verde dark:bg-semaforo-verde-soft-dark">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            ¡Listo! Recibimos tus documentos. La coordinación los va a revisar.
          </div>
        )}

        {paso.tipo === "ninguno" && (
          <div className="flex items-start gap-2 rounded-xl bg-semaforo-verde-soft p-4 text-sm text-semaforo-verde dark:bg-semaforo-verde-soft-dark">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            No tenés nada pendiente. Toda tu documentación está al día.
          </div>
        )}

        {paso.tipo === "esperar" && (
          <div className="flex items-start gap-2 rounded-xl border border-line bg-paper-elevated p-4 text-sm text-ink">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" aria-hidden="true" />
            <div>
              <p className="font-medium">No tenés nada para hacer por ahora.</p>
              <p className="mt-1 text-ink-secondary">
                Estamos revisando tu documentación. Cuando haya novedades, las vas a ver
                en esta página.
              </p>
            </div>
          </div>
        )}

        {paso.tipo === "contactar" && (
          <div className="flex items-start gap-2 rounded-xl border border-semaforo-amarillo/30 bg-semaforo-amarillo-soft p-4 text-sm text-semaforo-amarillo dark:bg-semaforo-amarillo-soft-dark">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-medium">Comunicate con la coordinación.</p>
              <p className="mt-1">
                Para saber cómo seguir con tu inscripción, escribile o consultá a la coordinación.
              </p>
            </div>
          </div>
        )}

        {paso.tipo === "subir" && (
          <>
            <div className="flex items-start gap-2 rounded-xl border border-semaforo-amarillo/30 bg-semaforo-amarillo-soft p-4 text-sm text-semaforo-amarillo dark:bg-semaforo-amarillo-soft-dark">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">
                  Tenés {paso.cantidad} {paso.cantidad === 1 ? "documento" : "documentos"}{" "}
                  para subir.
                </p>
                <p className="mt-1">
                  Adjuntalos abajo y tocá “Enviar cambios”. Después, la coordinación los revisa.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-ink">
                Documentos pendientes
              </h2>

              {observados.map((doc) => (
                <DocumentoPendienteItem
                  key={doc.id}
                  tipo={doc.tipo}
                  motivo={doc.motivo_observacion}
                  variante="observado"
                  archivoSeleccionado={archivosStaging.get(doc.tipo)}
                  onSeleccionar={(file) =>
                    handleSeleccionarArchivo(doc.tipo, file)
                  }
                  onQuitar={() => handleQuitarArchivo(doc.tipo)}
                />
              ))}

              {faltantes.map((tipo) => (
                <DocumentoPendienteItem
                  key={tipo}
                  tipo={tipo}
                  variante="faltante"
                  archivoSeleccionado={archivosStaging.get(tipo)}
                  onSeleccionar={(file) => handleSeleccionarArchivo(tipo, file)}
                  onQuitar={() => handleQuitarArchivo(tipo)}
                />
              ))}
            </div>

            {errorEnvio && (
              <p role="alert" className="text-sm text-semaforo-rojo">
                {errorEnvio}
              </p>
            )}

            <Button
              className="w-full"
              disabled={archivosStaging.size === 0}
              isLoading={adjuntar.isPending}
              onClick={handleEnviar}
            >
              Enviar cambios
              {archivosStaging.size > 0 ? ` (${archivosStaging.size})` : ""}
            </Button>
          </>
        )}
      </div>
    </Pantalla>
  );
}

interface DocumentoPendienteItemProps {
  tipo: TipoDocumento;
  motivo?: string;
  variante: "faltante" | "observado";
  archivoSeleccionado?: File;
  onSeleccionar: (file: File) => void;
  onQuitar: () => void;
}

function DocumentoPendienteItem({
  tipo,
  motivo,
  variante,
  archivoSeleccionado,
  onSeleccionar,
  onQuitar,
}: DocumentoPendienteItemProps) {
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSeleccionArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setErrorArchivo("Solo se aceptan archivos PDF.");
      return;
    }
    if (file.size > TAMANIO_MAX_BYTES) {
      setErrorArchivo("El archivo supera los 5MB permitidos.");
      return;
    }

    setErrorArchivo(null);
    onSeleccionar(file);
    e.target.value = ""; // permite volver a elegir el mismo archivo si hace falta
  }

  const esObservado = variante === "observado";

  return (
    <div
      className={`rounded-xl border p-4 ${
        esObservado
          ? "border-semaforo-amarillo/30 bg-semaforo-amarillo-soft dark:bg-semaforo-amarillo-soft-dark"
          : "border-line bg-paper-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{ETIQUETA_TIPO[tipo]}</p>
          {esObservado ? (
            <p className="mt-1 flex items-start gap-1 text-xs text-semaforo-amarillo">
              <AlertTriangle
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              {motivo ??
                "El coordinador pidió que vuelvas a subir este documento."}
            </p>
          ) : (
            <p className="mt-1 text-xs text-ink-muted">
              Todavía no lo subiste.
            </p>
          )}
          {errorArchivo && (
            <p className="mt-1 text-xs text-semaforo-rojo">{errorArchivo}</p>
          )}
        </div>

        <div className="shrink-0">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleSeleccionArchivo}
          />
          <Button
            variant="outline"
            icon={Paperclip}
            onClick={() => inputRef.current?.click()}
          >
            {esObservado ? "Volver a subir" : "Adjuntar"}
          </Button>
        </div>
      </div>

      {/* Archivo elegido, todavía no enviado */}
      {archivoSeleccionado && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-paper-elevated px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <FileText
              className="h-4 w-4 shrink-0 text-ink-muted"
              aria-hidden="true"
            />
            <span className="truncate text-sm text-ink">
              {archivoSeleccionado.name}
            </span>
            <span className="shrink-0 text-xs text-ink-muted">
              ({(archivoSeleccionado.size / 1024).toFixed(0)} KB)
            </span>
          </div>
          <button
            onClick={onQuitar}
            aria-label={`Quitar ${archivoSeleccionado.name}`}
            className="shrink-0 rounded p-1 text-ink-muted hover:bg-neutral-200 hover:text-ink dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
