import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
  type CrearLegajoRequest,
  type Legajo,
  type TipoDocumento,
} from "../../shared/types/types.ts";

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

const LEGAJO_ENDPOINT = "/api/v1/legajos";

interface InscripcionPayload {
  datosPersonales: DatosPersonales;
  datosAcademicos: DatosAcademicos;
  datosDocumentos: DatosDocumentos;
}

// Traduce los ids internos de DOCUMENTOS_REQUERIDOS al enum TipoDocumento del backend
const DOCUMENTO_ID_A_TIPO: Record<string, TipoDocumento> = {
  "formulario-preinscripcion": "FORM_INSCRIPCION",
  "partida-nacimiento": "PARTIDA",
  "cuit-cuil": "CUIT_CUIL",
  "titulo-grado": "TITULO_GRADO",
  "titulo-posgrado": "TITULO_POSGRADO",
  dni: "DNI",
};

function mapearACrearLegajoRequest(
  payload: InscripcionPayload
): CrearLegajoRequest {
  return {
    apellido: payload.datosPersonales.apellido,
    nombre: payload.datosPersonales.nombre,
    nacionalidad: payload.datosPersonales.nacionalidad,
    dni: payload.datosPersonales.documento,
    telefono_movil: payload.datosPersonales.telefonoMovil,
    telefono_fijo: payload.datosPersonales.telefonoFijo || undefined,
    email: payload.datosPersonales.email,
    email_alternativo: payload.datosPersonales.emailAlternativo || undefined,
    domicilio: payload.datosPersonales.domicilio,

    titulo_grado: payload.datosAcademicos.tituloGradoObtenido,
    titulo_posgrado: payload.datosAcademicos.tituloPosgrado || undefined,
    como_conocio: payload.datosAcademicos.canalDifusion,
    motivacion: payload.datosAcademicos.motivaciones,
    tipo_carreras: payload.datosAcademicos.tipoCarreras,
    carreras: [payload.datosAcademicos.carreraElegida],

    solicita_beca: payload.datosPersonales.solicitaBeca,
    tipo_beca: payload.datosPersonales.tipoBeca,
  };
}

async function subirDocumentoConTipo(legajoId: string, tipo: TipoDocumento, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("tipo", tipo);

  const response = await fetch(`/api/v1/legajos/${legajoId}/documentos`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.message ?? `No se pudo subir el documento (${tipo}).`
    );
  }

  return response.json();
}

async function subirDocumento(legajoId: string, docId: string, file: File) {
  const tipo = DOCUMENTO_ID_A_TIPO[docId];
  if (!tipo) {
    throw new Error(`Tipo de documento desconocido: ${docId}`);
  }
  return subirDocumentoConTipo(legajoId, tipo, file);
}

async function postInscripcion(payload: InscripcionPayload): Promise<Legajo> {
  // 1. Crear el legajo con los datos de texto
  const legajoResponse = await fetch(LEGAJO_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mapearACrearLegajoRequest(payload)),
  });

  if (!legajoResponse.ok) {
    const body = await legajoResponse.json().catch(() => null);
    throw new Error(
      body?.message ?? "No se pudo enviar la inscripción. Intentá nuevamente."
    );
  }

  const legajo: Legajo = await legajoResponse.json();

  // 2. Subir cada documento cargado, uno por uno, contra el id del legajo
  const subidas = Object.entries(payload.datosDocumentos)
    .filter((entry): entry is [string, File] => entry[1] !== null)
    .map(([docId, file]) => subirDocumento(legajo.id, docId, file));

  // 3. Si solicitó beca, subir el comprobante como documento FORM_BECA
  if (payload.datosPersonales.solicitaBeca && payload.datosPersonales.comprobanteBeca) {
    subidas.push(
      subirDocumentoConTipo(
        legajo.id,
        "FORM_BECA",
        payload.datosPersonales.comprobanteBeca
      )
    );
  }

  await Promise.all(subidas);

  return legajo;
}

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

  const mutation = useMutation({
    mutationFn: postInscripcion,
    onSuccess: () => {
      setCurrentStep((step) => Math.min(step + 1, STEPS.length - 1));
    },
  });

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
    mutation.mutate({
      datosPersonales,
      datosAcademicos,
      datosDocumentos,
    });
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