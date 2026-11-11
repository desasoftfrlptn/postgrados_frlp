// ─────────────────────────────────────────────
//  SeccionDocumentos.tsx
//  US-CORE-004: muestra el estado de cada
//  documento requerido (Cargado ✓ / Pendiente ✗)
//  y resalta en rojo los faltantes.
// ─────────────────────────────────────────────

import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { Documento, TipoDocumento } from "@/shared/types/types";

// ── Documentos obligatorios del sistema ───────
// Mapeamos TipoDocumento → label legible
// FORM_BECA y TITULO_POSGRADO son opcionales

const DOCS_OBLIGATORIOS: { tipo: TipoDocumento; label: string }[] = [
  { tipo: "DNI",              label: "Copia del DNI"                              },
  { tipo: "TITULO_GRADO",     label: "Copia del título de grado"                  },
  { tipo: "PARTIDA",          label: "Copia de la partida de nacimiento"           },
  { tipo: "CUIT_CUIL",        label: "Constancia de CUIT/CUIL"                    },
  { tipo: "FORM_INSCRIPCION", label: "Formulario de preinscripción firmado"        },
];

const DOCS_OPCIONALES: { tipo: TipoDocumento; label: string }[] = [
  { tipo: "FORM_BECA",        label: "Formulario de beca"                         },
  { tipo: "TITULO_POSGRADO",  label: "Copia del título de posgrado (si aplica)"   },
];

// ── Props ─────────────────────────────────────

interface SeccionDocumentosProps {
  documentos:     Documento[];          // los que ya subió el aspirante
  solicita_beca?: boolean;              // si pide beca, FORM_BECA pasa a obligatorio
}

// ── Helper ────────────────────────────────────

function estaSubido(tipo: TipoDocumento, documentos: Documento[]): boolean {
  return documentos.some(d => d.tipo === tipo);
}

// ── Hook exportable para otros componentes ────
// Workflow lo usa para saber si puede avanzar

export function useFaltanDocs(
  documentos: Documento[],
  solicita_beca = false,
): boolean {
  const obligatorios = [...DOCS_OBLIGATORIOS];
  if (solicita_beca) {
    obligatorios.push({ tipo: "FORM_BECA", label: "Formulario de beca" });
  }
  return obligatorios.some(d => !estaSubido(d.tipo, documentos));
}

// ── Componente ────────────────────────────────

export function SeccionDocumentos({
  documentos,
  solicita_beca = false,
}: SeccionDocumentosProps) {
  // Si pide beca, FORM_BECA se vuelve obligatorio
  const obligatorios = solicita_beca
    ? [...DOCS_OBLIGATORIOS, { tipo: "FORM_BECA" as TipoDocumento, label: "Formulario de beca" }]
    : DOCS_OBLIGATORIOS;

  const opcionales = solicita_beca
    ? DOCS_OPCIONALES.filter(d => d.tipo !== "FORM_BECA")
    : DOCS_OPCIONALES;

  const faltanObligatorios = obligatorios.filter(
    d => !estaSubido(d.tipo, documentos),
  );
  const todoCompleto = faltanObligatorios.length === 0;

  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Documentación obligatoria
        </h3>
        {todoCompleto ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-semaforo-verde">
            <CheckCircle2 size={13} /> Completa
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium text-semaforo-rojo">
            <AlertCircle size={13} /> Faltan {faltanObligatorios.length}
          </span>
        )}
      </div>

      {/* Lista obligatorios */}
      <div className="overflow-hidden rounded-xl border border-line">
        {obligatorios.map((doc, i) => {
          const subido = estaSubido(doc.tipo, documentos);
          const docSubido = documentos.find(d => d.tipo === doc.tipo);
          const esUltimo = i === obligatorios.length - 1;

          return (
            <div
              key={doc.tipo}
              className={[
                "flex items-center gap-3 px-4 py-3 text-sm transition-colors",
                !esUltimo ? "border-b border-line" : "",
                !subido ? "bg-semaforo-rojo-soft/30 dark:bg-semaforo-rojo-soft-dark/20" : "",
              ].join(" ")}
            >
              {subido ? (
                <CheckCircle2
                  size={16}
                  className="shrink-0 text-semaforo-verde"
                />
              ) : (
                <XCircle
                  size={16}
                  className="shrink-0 text-semaforo-rojo"
                />
              )}

              <div className="flex-1 min-w-0">
                <p className={`font-medium ${!subido ? "text-semaforo-rojo" : "text-ink"}`}>
                  {doc.label}
                </p>
                {subido && docSubido && (
                  <p className="text-xs text-ink-muted truncate">
                    {docSubido.nombre_original}
                  </p>
                )}
              </div>

              <span className={[
                "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                subido
                  ? "bg-semaforo-verde-soft text-semaforo-verde dark:bg-semaforo-verde-soft-dark"
                  : "bg-semaforo-rojo-soft text-semaforo-rojo dark:bg-semaforo-rojo-soft-dark",
              ].join(" ")}>
                {subido ? "Cargado ✓" : "Pendiente ✗"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Opcionales */}
      {opcionales.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Documentación opcional
          </p>
          <div className="overflow-hidden rounded-xl border border-line">
            {opcionales.map((doc, i) => {
              const subido = estaSubido(doc.tipo, documentos);
              const docSubido = documentos.find(d => d.tipo === doc.tipo);
              const esUltimo = i === opcionales.length - 1;

              return (
                <div
                  key={doc.tipo}
                  className={[
                    "flex items-center gap-3 px-4 py-3 text-sm",
                    !esUltimo ? "border-b border-line" : "",
                  ].join(" ")}
                >
                  {subido ? (
                    <CheckCircle2 size={16} className="shrink-0 text-semaforo-verde" />
                  ) : (
                    <XCircle size={16} className="shrink-0 text-ink-muted" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink-secondary">{doc.label}</p>
                    {subido && docSubido && (
                      <p className="text-xs text-ink-muted truncate">
                        {docSubido.nombre_original}
                      </p>
                    )}
                  </div>
                  <span className={[
                    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    subido
                      ? "bg-semaforo-verde-soft text-semaforo-verde dark:bg-semaforo-verde-soft-dark"
                      : "bg-paper-elevated text-ink-muted",
                  ].join(" ")}>
                    {subido ? "Cargado ✓" : "No cargado"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}