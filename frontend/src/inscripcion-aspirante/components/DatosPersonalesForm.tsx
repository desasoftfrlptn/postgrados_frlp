import { useEffect, useState, type ChangeEvent, type FocusEvent, type FormEvent } from "react";
import { Button } from "@/shared/components/Button";
import type { DatosPersonales, TipoBeca } from "../../shared/types/types.ts";
import type { DraftPayload } from "../pages/InscripcionWizard.tsx";

interface DatosPersonalesFormProps {
  initialData: DatosPersonales;
  isSubmitting?: boolean;
  onNext: (data: DatosPersonales) => void;
  // Busca si hay un borrador guardado para ese email. Devuelve null si no hay.
  onCheckDraft?: (email: string) => DraftPayload | null;
  // Se llama cuando el usuario confirma que quiere recuperar el borrador
  // encontrado, para que el wizard actualice Datos Académicos también.
  onRestoreDraft?: (draft: DraftPayload) => void;
  // Errores que vienen de afuera (ej: DNI duplicado detectado por el backend
  // al confirmar la inscripción), para mostrarlos en el campo que corresponda.
  serverErrors?: Errors;
}

type Errors = Partial<Record<string, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELDS: Array<{
  field: keyof Omit<DatosPersonales, "domicilio" | "solicitaBeca" | "tipoBeca" | "comprobanteBeca">;
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
}> = [
  { field: "apellido", label: "Apellido", placeholder: "Pérez", required: true },
  { field: "nombre", label: "Nombre", placeholder: "María Laura", required: true },
  { field: "nacionalidad", label: "Nacionalidad", placeholder: "Argentina", required: true },
  { field: "documento", label: "DNI o Pasaporte", placeholder: "38451982 (sin puntos)", required: true },
  {
    field: "telefonoMovil",
    label: "Teléfono móvil",
    placeholder: "+54 9 221 555-1234",
    type: "tel",
    required: true,
  },
  { field: "telefonoFijo", label: "Teléfono fijo", placeholder: "0221 452-6789", type: "tel" },
  {
    field: "email",
    label: "Correo electrónico",
    placeholder: "mlperez@gmail.com",
    type: "email",
    required: true,
  },
  {
    field: "emailAlternativo",
    label: "Correo electrónico alternativo",
    placeholder: "maria.perez@trabajo.com",
    type: "email",
  },
];

const DOMICILIO_FIELDS: Array<{
  field: keyof DatosPersonales["domicilio"];
  label: string;
  placeholder: string;
  required?: boolean;
}> = [
  { field: "direccion", label: "Dirección", placeholder: "Calle 48 N° 1250", required: true },
  { field: "ciudad", label: "Ciudad", placeholder: "La Plata", required: true },
  { field: "provincia", label: "Provincia", placeholder: "Buenos Aires", required: true },
  { field: "pais", label: "País", placeholder: "Argentina", required: true },
];

export function DatosPersonalesForm({
  initialData,
  isSubmitting,
  onNext,
  onCheckDraft,
  onRestoreDraft,
  serverErrors,
}: DatosPersonalesFormProps) {
  const [data, setData] = useState<DatosPersonales>(initialData);
  const [errors, setErrors] = useState<Errors>({});
  const [draftFound, setDraftFound] = useState<DraftPayload | null>(null);

  // Si el wizard detecta un error del backend (ej: DNI duplicado) después
  // de confirmar, lo mezclamos con los errores locales para mostrarlo.
  useEffect(() => {
    if (serverErrors) {
      setErrors((prev) => ({ ...prev, ...serverErrors }));
    }
  }, [serverErrors]);

  // --- Validación en tiempo real, campo por campo ---
  // Cada función revisa un único campo y devuelve el mensaje de error
  // (o undefined si está OK). Se usan tanto en onBlur como en validate().
  const validarApellido = (value: string) =>
    !value.trim() ? "Ingresá el apellido." : undefined;

  const validarNombre = (value: string) =>
    !value.trim() ? "Ingresá el nombre." : undefined;

  const validarNacionalidad = (value: string) =>
    !value.trim() ? "Ingresá la nacionalidad." : undefined;

  const validarDocumento = (value: string) =>
    !value.trim() ? "Ingresá el DNI o pasaporte." : undefined;

  const validarTelefonoMovil = (value: string) =>
    !value.trim() ? "Ingresá un teléfono de contacto." : undefined;

  const validarEmail = (value: string) => {
    if (!value.trim()) return "Ingresá un correo electrónico.";
    if (!EMAIL_RE.test(value)) return "El correo no tiene un formato válido.";
    return undefined;
  };

  const validarEmailAlternativo = (value: string) =>
    value && !EMAIL_RE.test(value) ? "El correo alternativo no tiene un formato válido." : undefined;

  const validarDomicilioCampo = (
    field: keyof DatosPersonales["domicilio"],
    value: string
  ) => {
    const labels: Record<keyof DatosPersonales["domicilio"], string> = {
      direccion: "la dirección",
      ciudad: "la ciudad",
      provincia: "la provincia",
      pais: "el país",
    };
    return !value.trim() ? `Ingresá ${labels[field]}.` : undefined;
  };

  // Mapa de validador por campo, para poder llamarlo genéricamente en onBlur.
  const VALIDADORES_POR_CAMPO: Partial<
    Record<
      keyof Omit<DatosPersonales, "domicilio" | "solicitaBeca" | "tipoBeca" | "comprobanteBeca">,
      (value: string) => string | undefined
    >
  > = {
    apellido: validarApellido,
    nombre: validarNombre,
    nacionalidad: validarNacionalidad,
    documento: validarDocumento,
    telefonoMovil: validarTelefonoMovil,
    email: validarEmail,
    emailAlternativo: validarEmailAlternativo,
  };

  const handleChange =
    (field: keyof Omit<DatosPersonales, "domicilio" | "solicitaBeca" | "tipoBeca" | "comprobanteBeca">) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setData((prev) => ({ ...prev, [field]: e.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const handleFieldBlur =
    (field: keyof Omit<DatosPersonales, "domicilio" | "solicitaBeca" | "tipoBeca" | "comprobanteBeca">) =>
    (e: FocusEvent<HTMLInputElement>) => {
      const validador = VALIDADORES_POR_CAMPO[field];
      if (validador) {
        const mensaje = validador(e.target.value);
        setErrors((prev) => ({ ...prev, [field]: mensaje }));
      }
      if (field === "email") {
        handleEmailBlurDraft(e.target.value);
      }
    };

  const handleDomicilioBlur =
    (field: keyof DatosPersonales["domicilio"]) => (e: FocusEvent<HTMLInputElement>) => {
      const mensaje = validarDomicilioCampo(field, e.target.value);
      setErrors((prev) => ({ ...prev, [field]: mensaje }));
    };

  const handleEmailBlurDraft = (email: string) => {
    if (!EMAIL_RE.test(email) || !onCheckDraft) {
      setDraftFound(null);
      return;
    }
    const draft = onCheckDraft(email);
    setDraftFound(draft);
  };

  const handleRecuperarBorrador = () => {
    if (!draftFound) return;
    setData((prev) => ({
      ...prev,
      ...draftFound.datosPersonales,
      email: prev.email, // conservamos el email tal como lo escribió el usuario
    }));
    onRestoreDraft?.(draftFound);
    setDraftFound(null);
  };

  const handleDescartarBorrador = () => {
    setDraftFound(null);
  };

  const handleComprobanteChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? undefined;
    setData((prev) => ({ ...prev, comprobanteBeca: file }));
    setErrors((prev) => ({ ...prev, comprobanteBeca: undefined }));
  };

  const handleDomicilioChange =
    (field: keyof DatosPersonales["domicilio"]) => (e: ChangeEvent<HTMLInputElement>) => {
      setData((prev) => ({
        ...prev,
        domicilio: { ...prev.domicilio, [field]: e.target.value },
      }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const handleBecaToggle = (e: ChangeEvent<HTMLInputElement>) => {
    setData((prev) => ({
      ...prev,
      solicitaBeca: e.target.checked,
      tipoBeca: e.target.checked ? prev.tipoBeca : undefined,
      comprobanteBeca: e.target.checked ? prev.comprobanteBeca : undefined,
    }));
    setErrors((prev) => ({ ...prev, tipoBeca: undefined, comprobanteBeca: undefined }));
  };

  const handleTipoBecaChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setData((prev) => ({ ...prev, tipoBeca: e.target.value as TipoBeca }));
    setErrors((prev) => ({ ...prev, tipoBeca: undefined }));
  };

  const validate = (): Errors => {
    const next: Errors = {};

    const apellidoErr = validarApellido(data.apellido);
    if (apellidoErr) next.apellido = apellidoErr;

    const nombreErr = validarNombre(data.nombre);
    if (nombreErr) next.nombre = nombreErr;

    const nacionalidadErr = validarNacionalidad(data.nacionalidad);
    if (nacionalidadErr) next.nacionalidad = nacionalidadErr;

    const documentoErr = validarDocumento(data.documento);
    if (documentoErr) next.documento = documentoErr;

    const telefonoErr = validarTelefonoMovil(data.telefonoMovil);
    if (telefonoErr) next.telefonoMovil = telefonoErr;

    const emailErr = validarEmail(data.email);
    if (emailErr) next.email = emailErr;

    const emailAltErr = validarEmailAlternativo(data.emailAlternativo);
    if (emailAltErr) next.emailAlternativo = emailAltErr;

    (Object.keys(data.domicilio) as Array<keyof DatosPersonales["domicilio"]>).forEach((field) => {
      const err = validarDomicilioCampo(field, data.domicilio[field]);
      if (err) next[field] = err;
    });

    if (data.solicitaBeca && !data.tipoBeca) {
      next.tipoBeca = "Seleccioná el tipo de beca.";
    }
    if (data.solicitaBeca && !data.comprobanteBeca) {
      next.comprobanteBeca = "Adjuntá el formulario en PDF para formalizar la solicitud.";
    } else if (
      data.solicitaBeca &&
      data.comprobanteBeca &&
      data.comprobanteBeca.type !== "application/pdf"
    ) {
      next.comprobanteBeca = "El archivo debe estar en formato PDF.";
    }

    return next;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      onNext(data);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 px-5 pb-8">
      {FIELDS.map(({ field, label, placeholder, type = "text", required }) => (
        <div key={field} className="flex flex-col gap-1.5">
          <label htmlFor={field}>
            {label}
            {required && <span className="ml-0.5 text-semaforo-rojo">*</span>}
          </label>
          <input
            id={field}
            name={field}
            type={type}
            value={data[field]}
            onChange={handleChange(field)}
            onBlur={handleFieldBlur(field)}
            placeholder={placeholder}
            aria-invalid={Boolean(errors[field])}
            aria-describedby={errors[field] ? `${field}-error` : undefined}
            className={errors[field] ? "border-semaforo-rojo focus:ring-semaforo-rojo" : ""}
          />
          {field === "email" && draftFound && (
            <div className="mt-1 flex flex-col gap-2 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm">
              <p className="text-ink-secondary">
                Encontramos un borrador guardado con este email (
                {new Date(draftFound.savedAt).toLocaleString("es-AR")}
                ). ¿Querés recuperarlo?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleRecuperarBorrador}
                  className="font-semibold text-brand-700 hover:underline"
                >
                  Recuperar
                </button>
                <button
                  type="button"
                  onClick={handleDescartarBorrador}
                  className="font-semibold text-ink-secondary hover:underline"
                >
                  Descartar
                </button>
              </div>
              <p className="text-xs text-ink-muted">
                Los documentos y el PDF de beca (si corresponde) hay que volver a adjuntarlos.
              </p>
            </div>
          )}
          {errors[field] && (
            <p id={`${field}-error`} className="text-xs font-medium text-semaforo-rojo">
              {errors[field]}
            </p>
          )}
        </div>
      ))}

      <div className="mt-2 flex flex-col gap-4 border-t border-line pt-5">
        <h2 className="text-sm font-semibold text-ink">Domicilio</h2>

        {DOMICILIO_FIELDS.map(({ field, label, placeholder, required }) => (
          <div key={field} className="flex flex-col gap-1.5">
            <label htmlFor={`domicilio-${field}`}>
              {label}
              {required && <span className="ml-0.5 text-semaforo-rojo">*</span>}
            </label>
            <input
              id={`domicilio-${field}`}
              name={field}
              type="text"
              value={data.domicilio[field]}
              onChange={handleDomicilioChange(field)}
              onBlur={handleDomicilioBlur(field)}
              placeholder={placeholder}
              aria-invalid={Boolean(errors[field])}
              aria-describedby={errors[field] ? `${field}-error` : undefined}
              className={errors[field] ? "border-semaforo-rojo focus:ring-semaforo-rojo" : ""}
            />
            {errors[field] && (
              <p id={`${field}-error`} className="text-xs font-medium text-semaforo-rojo">
                {errors[field]}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-col gap-3 border-t border-line pt-5">
        <label className="flex items-center gap-2 text-sm font-medium text-ink-secondary">
          <input
            type="checkbox"
            checked={data.solicitaBeca}
            onChange={handleBecaToggle}
            className="h-4 w-4 rounded border-line"
          />
          Solicito beca
        </label>

        {data.solicitaBeca && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tipoBeca">Tipo de beca</label>
            <select id="tipoBeca" value={data.tipoBeca ?? ""} onChange={handleTipoBecaChange}>
              <option value="">Seleccioná una opción</option>
              <option value="30">30%</option>
              <option value="100">100%</option>
            </select>
            {errors.tipoBeca && (
              <p className="text-xs font-medium text-semaforo-rojo">{errors.tipoBeca}</p>
            )}

            <label htmlFor="comprobanteBeca" className="mt-3">
              Formulario de solicitud de beca (PDF)
              <span className="ml-0.5 text-semaforo-rojo">*</span>
            </label>
            <input
              id="comprobanteBeca"
              name="comprobanteBeca"
              type="file"
              accept="application/pdf"
              onChange={handleComprobanteChange}
              aria-invalid={Boolean(errors.comprobanteBeca)}
              aria-describedby={errors.comprobanteBeca ? "comprobanteBeca-error" : undefined}
              className={errors.comprobanteBeca ? "border-semaforo-rojo focus:ring-semaforo-rojo" : ""}
            />
            {data.comprobanteBeca && (
              <p className="text-xs text-ink-muted">
                Archivo seleccionado: {data.comprobanteBeca.name}
              </p>
            )}
            {errors.comprobanteBeca && (
              <p id="comprobanteBeca-error" className="text-xs font-medium text-semaforo-rojo">
                {errors.comprobanteBeca}
              </p>
            )}
          </div>
        )}
      </div>

      <Button type="submit" variant="primary" isLoading={isSubmitting} className="mt-2 w-full">
        Continuar
      </Button>
    </form>
  );
}
