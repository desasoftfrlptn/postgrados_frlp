import { ETIQUETA_TIPO } from "@/shared/types/types";
import { useRef, useState } from "react";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { Spinner } from "@/shared/components/Spinner";
import ThemeToggle from "@/shared/components/ThemeToggle";
import {
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  FileText,
  X,
} from "lucide-react";
import { useAdjuntarDocumento, useConsultaEstado } from "../hooks/useEstados";
import type { EstadoLegajo, TipoDocumento } from "@/shared/types/types";
import { useActualizarEstado } from "@/shared/hooks/useEstado";

const TAMANIO_MAX_BYTES = 5 * 1024 * 1024;

const MENSAJE_ESTADO: Record<EstadoLegajo, string> = {
  BORRADOR: "Todavía no enviaste tu inscripción para revisión.",
  PENDIENTE: "Tu inscripción está pendiente de revisión.",
  EN_REVISION: "Estamos revisando tu inscripción.",
  OBSERVADO: "Tu inscripción tiene observaciones. Revisá los documentos abajo.",
  COMPLETADO: "Tu documentación está completa.",
  ACTIVO: "¡Estás activo en la cohorte! Tu trayectoria está al día.",
  VENCIDO: "Tu inscripción venció. Contactá a la coordinación.",
  RECHAZADO:
    "Tu inscripción fue rechazada. Contactá a la coordinación para más información.",
  BAJA: "Tu inscripción fue dada de baja.",
  GRADUADO: "¡Te graduaste! Felicitaciones.",
};

function documentosRequeridos(solicitaBeca: boolean): TipoDocumento[] {
  const base: TipoDocumento[] = [
    "DNI",
    "TITULO_GRADO",
    "PARTIDA",
    "CUIT_CUIL",
    "FORM_INSCRIPCION",
  ];
  return solicitaBeca ? [...base, "FORM_BECA"] : base;
}

export function ConsultarEstado() {
  const [dni, setDni] = useState("");
  const [email, setEmail] = useState("");
  const [consultado, setConsultado] = useState(false);

  // Archivos elegidos pero todavía no enviados al servidor.
  const [archivosStaging, setArchivosStaging] = useState<
    Map<TipoDocumento, File>
  >(new Map());
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [envioExitoso, setEnvioExitoso] = useState(false);

  const {
    data: legajo,
    isLoading,
    isError,
  } = useConsultaEstado({ dni, email }, consultado);
  const adjuntar = useAdjuntarDocumento(legajo?.id);
  const actualizarEstado = useActualizarEstado();

  function handleBuscar(e: React.SubmitEvent) {
    e.preventDefault();
    setConsultado(true);
  }

  function handleNuevaConsulta() {
    setConsultado(false);
    setArchivosStaging(new Map());
    setEnvioExitoso(false);
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

    try {
      // Sube todos los documentos staged, uno por uno.
      for (const [tipo, file] of archivosStaging) {
        await adjuntar.mutateAsync({ file, tipo });
      }
      // Vuelve a poner el legajo en revisión: el coordinador ve que
      // hay novedades para revisar.
      await actualizarEstado.mutateAsync({
        id: legajo.id,
        estado: "PENDIENTE",
      });

      setArchivosStaging(new Map());
      setEnvioExitoso(true);
    } catch (err) {
      setErrorEnvio(
        err instanceof Error
          ? err.message
          : "No pudimos enviar tus documentos. Probá de nuevo.",
      );
    }
  }

  const enviando = adjuntar.isPending || actualizarEstado.isPending;

  if (!consultado || (isError && !isLoading)) {
    return (
      <div className="screen-shell relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="mx-auto max-w-md p-6 screen-card p-6">
          <h1 className="mb-1 text-lg font-semibold text-ink">
            Consultar estado de inscripción
          </h1>
          <p className="mb-6 text-sm text-ink-secondary">
            Ingresá el DNI y el email que usaste al inscribirte.
          </p>

          <form onSubmit={handleBuscar} className="space-y-4">
            <Input
              label="DNI"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              required
              inputMode="numeric"
              placeholder="DNI sin puntos"
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email o correo electrónico"
              error={
                isError
                  ? "No encontramos una inscripción con esos datos. Revisá el DNI y el email."
                  : undefined
              }
            />
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Consultar
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-ink-secondary screen-shell relative">
        <Spinner size="sm" /> Buscando tu inscripción…
      </div>
    );
  }

  if (!legajo) return null;

  const requeridos = documentosRequeridos(legajo.solicita_beca);
  const documentosVigentes = legajo.documentos.filter((d) => d.estado !== "FALTANTE");
  const subidosPorTipo = new Map(documentosVigentes.map((d) => [d.tipo, d]));
  const faltantes = requeridos.filter((tipo) => !subidosPorTipo.has(tipo));
  const observados = documentosVigentes.filter((d) => d.estado === "OBSERVADO");
  const sinPendientes = faltantes.length === 0 && observados.length === 0;

  return (
    <div className="screen-shell relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
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
            onClick={handleNuevaConsulta}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Consultar otro DNI
          </button>
        </div>

        <div className="rounded-xl border border-line bg-paper-surface p-4">
          <p className="text-sm text-ink">{MENSAJE_ESTADO[legajo.estado]}</p>
        </div>

        {envioExitoso && (
          <div className="flex items-center gap-2 rounded-xl bg-semaforo-verde-soft p-4 text-sm text-semaforo-verde dark:bg-semaforo-verde-soft-dark">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            ¡Listo! Enviamos tus documentos y tu inscripción vuelve a estar
            pendiente de revisión.
          </div>
        )}

        {sinPendientes ? (
          <div className="flex items-center gap-2 rounded-xl bg-semaforo-verde-soft p-4 text-sm text-semaforo-verde dark:bg-semaforo-verde-soft-dark">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            Toda tu documentación está al día. No tenés nada pendiente de
            adjuntar.
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-ink">
                Documentos pendientes
              </h2>

              {observados.map((doc) => (
                <DocumentoPendienteItem
                  key={doc.id}
                  legajoId={legajo.id}
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
                  legajoId={legajo.id}
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
              isLoading={enviando}
              onClick={handleEnviar}
            >
              Enviar cambios
              {archivosStaging.size > 0 ? ` (${archivosStaging.size})` : ""}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

interface DocumentoPendienteItemProps {
  tipo: TipoDocumento;
  legajoId: string;
  motivo?: string;
  variante: "faltante" | "observado";
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
