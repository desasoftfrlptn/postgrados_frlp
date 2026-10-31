import { Button } from "@/shared/components/Button";
import type {
  DatosAcademicos,
  DatosDocumentos,
  DatosPersonales,
} from "../../shared/types/types.ts";

interface ConfirmacionStepProps {
  datosPersonales: DatosPersonales;
  datosAcademicos: DatosAcademicos;
  datosDocumentos: DatosDocumentos;
  isSubmitting?: boolean;
  onEditStep: (step: number) => void;
  onVolverBorrador: () => void;
  onConfirmar: () => void;
}

export function ConfirmacionStep({
  datosPersonales,
  datosAcademicos,
  datosDocumentos,
  isSubmitting = false,
  onEditStep,
  onVolverBorrador,
  onConfirmar,
}: ConfirmacionStepProps) {
  const documentosCargados = Object.entries(datosDocumentos).filter(
    ([, file]) => file instanceof File,
  );

  return (
    <section className="space-y-5 px-5 pb-6">
      <div className="rounded-xl border border-line bg-paper-surface p-4">
        <h2 className="mb-3 text-base font-bold text-ink">Revisión final</h2>

        <div className="space-y-4 text-sm text-ink-secondary">
          <div>
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="font-semibold text-ink">Datos personales</p>
              <button
                type="button"
                className="text-xs font-medium text-brand-600 underline-offset-2 hover:underline"
                onClick={() => onEditStep(0)}
              >
                Editar
              </button>
            </div>
            <p>
              {datosPersonales.nombre} {datosPersonales.apellido}
            </p>
            <p>{datosPersonales.email}</p>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="font-semibold text-ink">Datos académicos</p>
              <button
                type="button"
                className="text-xs font-medium text-brand-600 underline-offset-2 hover:underline"
                onClick={() => onEditStep(1)}
              >
                Editar
              </button>
            </div>
            <p>{datosAcademicos.carreraElegida}</p>
            <p>{datosAcademicos.canalDifusion}</p>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="font-semibold text-ink">Documentos</p>
              <button
                type="button"
                className="text-xs font-medium text-brand-600 underline-offset-2 hover:underline"
                onClick={() => onEditStep(2)}
              >
                Editar
              </button>
            </div>
            <p>
              {documentosCargados.length > 0
                ? `${documentosCargados.length} documento(s) cargado(s)`
                : "Sin documentos cargados"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button variant="ghost" type="button" onClick={onVolverBorrador}>
          Volver al borrador
        </Button>

        <Button
          type="button"
          onClick={onConfirmar}
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          Confirmar inscripción
        </Button>
      </div>
    </section>
  );
}
