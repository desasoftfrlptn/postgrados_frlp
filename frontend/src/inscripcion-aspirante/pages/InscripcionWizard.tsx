import { useState } from "react";
import { useInscripcion } from "@/shared/hooks/useInscripcion";
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
  const mutation = useInscripcion();
  const { data: estado, isLoading } = useEstadoInscripcionVigente();
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-ink-secondary">
        <Spinner size="sm" /> Verificando período de inscripción…
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
    mutation.mutate(
      { datosPersonales, datosAcademicos, datosDocumentos },
      {
        onSuccess: () => {
          setCurrentStep((step) => Math.min(step + 1, STEPS.length - 1));
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
