import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/shared/components/Button";
import type { DatosPersonales, TipoBeca } from "../../shared/types/types.ts";

interface DatosPersonalesFormProps {
  initialData: DatosPersonales;
  isSubmitting?: boolean;
  onNext: (data: DatosPersonales) => void;
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
}: DatosPersonalesFormProps) {
  const [data, setData] = useState<DatosPersonales>(initialData);
  const [errors, setErrors] = useState<Errors>({});

  const handleChange =
    (field: keyof Omit<DatosPersonales, "domicilio" | "solicitaBeca" | "tipoBeca" | "comprobanteBeca">) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setData((prev) => ({ ...prev, [field]: e.target.value }));
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
    };

  const handleBecaToggle = (e: ChangeEvent<HTMLInputElement>) => {
    setData((prev) => ({
      ...prev,
      solicitaBeca: e.target.checked,
      tipoBeca: e.target.checked ? prev.tipoBeca : undefined,
      comprobanteBeca: e.target.checked ? prev.comprobanteBeca : undefined,
    }));
  };

  const handleTipoBecaChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setData((prev) => ({ ...prev, tipoBeca: e.target.value as TipoBeca }));
  };

  const validate = (): Errors => {
    const next: Errors = {};
    if (!data.apellido.trim()) next.apellido = "Ingresá el apellido.";
    if (!data.nombre.trim()) next.nombre = "Ingresá el nombre.";
    if (!data.nacionalidad.trim()) next.nacionalidad = "Ingresá la nacionalidad.";
    if (!data.documento.trim()) next.documento = "Ingresá el DNI o pasaporte.";
    if (!data.telefonoMovil.trim())
      next.telefonoMovil = "Ingresá un teléfono de contacto.";
    if (!data.email.trim()) next.email = "Ingresá un correo electrónico.";
    else if (!EMAIL_RE.test(data.email))
      next.email = "El correo no tiene un formato válido.";
    if (data.emailAlternativo && !EMAIL_RE.test(data.emailAlternativo)) {
      next.emailAlternativo = "El correo alternativo no tiene un formato válido.";
    }

    if (!data.domicilio.direccion.trim()) next.direccion = "Ingresá la dirección.";
    if (!data.domicilio.ciudad.trim()) next.ciudad = "Ingresá la ciudad.";
    if (!data.domicilio.provincia.trim()) next.provincia = "Ingresá la provincia.";
    if (!data.domicilio.pais.trim()) next.pais = "Ingresá el país.";

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