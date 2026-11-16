import { useState } from "react";
import { useInscripcion, InscripcionParcialError } from "@/shared/hooks/useInscripcion";
import { CAMPOS_WIZARD, erroresDeCampo } from "@/shared/api/mappers";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/shared/components/Button";
import { WizardHeader } from "../components/WizardHeader";
import { Stepper, type Step } from "../components/Stepper";
import { DatosPersonalesForm } from "../components/DatosPersonalesForm";
import { DatosAcademicosForm } from "../components/DatosAcademicosForm";
import { DatosDocumentosForm } from "../components/DatosDocumentosForm";
import { ConfirmacionStep } from "../components/ConfirmacionStep";
import {
  DATOS_PERSONALES_INICIAL,
  type DatosPersonales,
  DATOS_ACADEMICOS_INICIAL,
  type DatosAcademicos,
  DATOS_DOCUMENTOS_INICIAL,
  type DatosDocumentos,
} from "../../shared/types/types.ts";
import { useEstadoInscripcionVigente } from "../hooks/useEstados.ts";
import { formatFecha } from "@/shared/hooks/usePeriodos.ts";
import { Spinner } from "@/shared/components/Spinner.tsx";
import ThemeToggle from "@/shared/components/ThemeToggle.tsx";

const STEPS: Step[] = [
  { id: "personales", label: "Personales" },
  { id: "academicos", label: "Académicos" },
  { id: "documentos", label: "Documentos" },
  { id: "confirmar", label: "Confirmar" },
];
const STEP_TITLES: Record<string, string> = {
  personales: "Datos Personales",
  academicos: "Datos Académicos",
  documentos: "Documentación",
  confirmar: "Confirmar Inscripción",
};

export function InscripcionWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [datosPersonales, setDatosPersonales] = useState<DatosPersonales>(
    DATOS_PERSONALES_INICIAL
  );
  const [datosAcademicos, setDatosAcademicos] = useState<DatosAcademicos>(
    DATOS_ACADEMICOS_INICIAL
  );
  const [datosDocumentos, setDatosDocumentos] = useState<DatosDocumentos>(
    DATOS_DOCUMENTOS_INICIAL
  );
  // Errores de campo que devuelve el backend (409/422), con los nombres de DatosPersonales
  const [serverErrors, setServerErrors] = useState<Record<string, string> | undefined>();
  // Resultado de la inscripción: qué se registró y qué hay que resolver con la coordinación
  const [resultado, setResultado] = useState<{ registradas: string[]; avisos: string[] } | null>(null);
  const mutation = useInscripcion();
  const {
    data: estado,
    isLoading,
    isError: errorPeriodo,
    error: errorPeriodoDetalle,
    refetch: reintentarPeriodo,
  } = useEstadoInscripcionVigente();
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-ink-secondary">
        <Spinner size="sm" /> Verificando período de inscripción…
      </div>
    );
  }
  // Un error de red o del servidor no significa que las inscripciones estén cerradas
  if (errorPeriodo) {
    return (
      <div className="screen-shell relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="screen-card mx-auto max-w-md space-y-4 p-6">
          <p role="alert" className="text-sm text-ink">
            No pudimos verificar el período de inscripción: {errorPeriodoDetalle?.message}
          </p>
          <Button className="w-full" onClick={() => void reintentarPeriodo()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }
  if (!estado?.abierto) {
    const hoy = new Date().toISOString().slice(0, 10);
    return (
      <div className="screen-shell relative">
      <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
      <div className="mx-auto max-w-md rounded-xl border border-line bg-paper-surface p-6 text-center relative">
        <p className="text-sm font-medium text-ink">Las inscripciones están cerradas.</p>
        {estado?.periodo?.fecha_cierra && estado?.periodo?.fecha_cierra < hoy && (
          <p className="mt-1 text-xs text-ink-muted">
            El último período cerró el {formatFecha(estado.periodo.fecha_cierra)}.
          </p>
        )}
        {estado?.periodo?.fecha_abre && estado?.periodo?.fecha_abre > hoy && (
          <p className="mt-1 text-xs text-ink-muted">
            El próximo período abre: {formatFecha(estado.periodo.fecha_abre)}.
          </p>
        )}
      </div>
      </div>
    );
  }
  if (resultado) {
    return (
      <div className="screen-shell relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="screen-card mx-auto max-w-md space-y-4 p-6">
          <div className="flex items-start gap-2 rounded-xl bg-semaforo-verde-soft p-4 text-sm text-semaforo-verde dark:bg-semaforo-verde-soft-dark">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-medium">¡Recibimos tu inscripción!</p>
              <p className="mt-1">Registramos: {resultado.registradas.join(", ")}.</p>
            </div>
          </div>
          {resultado.avisos.map((aviso) => (
            <div
              key={aviso}
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-semaforo-amarillo/30 bg-semaforo-amarillo-soft p-4 text-sm text-semaforo-amarillo dark:bg-semaforo-amarillo-soft-dark"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              {aviso}
            </div>
          ))}
          <p className="text-sm text-ink-secondary">
            La coordinación va a revisar tu solicitud y tu documentación.
          </p>
        </div>
      </div>
    );
  }
  const goToNextStep = () => {
    setCurrentStep((step) => Math.min(step + 1, STEPS.length - 1));
  };
  const goToPreviousStep = () => {
    if (currentStep === 0) {
      window.history.back();
    } else {
      setCurrentStep((step) => Math.max(step - 1, 0));
    }
  };
  // Paso 1: solo guarda y avanza. El POST se dispara recién en "Confirmar",
  // con el payload acumulado de todos los pasos.
  const handleNextPersonales = (data: DatosPersonales) => {
    setDatosPersonales(data);
    goToNextStep();
  };
  // Paso 2: idem, solo guarda y avanza.
  const handleNextAcademicos = (data: DatosAcademicos) => {
    setDatosAcademicos(data);
    goToNextStep();
  };
  // Paso 3: idem, solo guarda y avanza. Documentos opcionales: se puede
  // avanzar aunque falten algunos.
  const handleNextDocumentos = (data: DatosDocumentos) => {
    setDatosDocumentos(data);
    goToNextStep();
  };
  // Paso 4: dispara el POST real con el payload acumulado de los 3 pasos.
  const handleConfirmar = () => {
    if (!estado?.cohorte_id) return; // con el período abierto siempre hay cohorte
    setServerErrors(undefined);
    mutation.mutate(
      { datosPersonales, datosAcademicos, datosDocumentos, cohorte_id: estado.cohorte_id },
      {
        onSuccess: ({ legajos, documentosFallidos }) => {
          setResultado({
            registradas: legajos.map((l) => l.carrera_elegida),
            avisos:
              documentosFallidos.length > 0
                ? [
                    `No pudimos subir ${documentosFallidos.length} documento(s). La coordinación te va a indicar cómo completarlos.`,
                  ]
                : [],
          });
        },
        onError: (error) => {
          // Se registró una carrera pero otra falló: no se puede reintentar (duplicaría la primera)
          if (error instanceof InscripcionParcialError) {
            setResultado({
              registradas: error.creados.map((l) => l.carrera_elegida),
              avisos: [
                `No pudimos registrar ${error.carrerasPendientes.join(", ")}, y tampoco se subieron los documentos. Comunicate con la coordinación para completarlo.`,
              ],
            });
            return;
          }
          // 409/422 con campo: se vuelve al paso 1 y se marca el campo
          const errores = erroresDeCampo(error, CAMPOS_WIZARD);
          if (Object.keys(errores).length > 0) {
            setServerErrors(errores);
            setCurrentStep(0);
          }
        },
      },
    );
  };
  // "Volver al borrador": manda de nuevo al Paso 1 sin enviar nada.
  const handleVolverBorrador = () => {
    setCurrentStep(0);
  };
  const activeStep = STEPS[currentStep];
  return (
    <div className="flex min-h-screen w-full flex-col bg-paper text-ink">
      <WizardHeader onBack={goToPreviousStep} />
      <Stepper steps={STEPS} currentStep={currentStep} />
      <main className="flex-1">
        <h1 className="px-5 pb-4 text-lg font-bold text-ink">
          Paso {currentStep + 1}: {STEP_TITLES[activeStep.id]}
        </h1>
        {currentStep === 0 && (
          <DatosPersonalesForm
            initialData={datosPersonales}
            isSubmitting={mutation.isPending}
            onNext={handleNextPersonales}
            serverErrors={serverErrors}
          />
        )}
        {currentStep === 1 && (
          <DatosAcademicosForm
            initialData={datosAcademicos}
            isSubmitting={mutation.isPending}
            onNext={handleNextAcademicos}
          />
        )}
        {currentStep === 2 && (
          <DatosDocumentosForm
            initialData={datosDocumentos}
            isSubmitting={mutation.isPending}
            onNext={handleNextDocumentos}
          />
        )}
        {currentStep === 3 && (
          <ConfirmacionStep
            datosPersonales={datosPersonales}
            datosAcademicos={datosAcademicos}
            datosDocumentos={datosDocumentos}
            isSubmitting={mutation.isPending}
            onEditStep={setCurrentStep}
            onVolverBorrador={handleVolverBorrador}
            onConfirmar={handleConfirmar}
          />
        )}
        {mutation.isError && (
          <p className="px-5 pb-4 text-sm font-medium text-semaforo-rojo">
            {(mutation.error as Error).message}
          </p>
        )}
      </main>
    </div>
  );
}
export default InscripcionWizard;
