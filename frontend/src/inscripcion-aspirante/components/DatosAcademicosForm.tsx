import { useState, type FormEvent } from "react";
import {
  CARRERAS_POSGRADO,
  CANALES_DIFUSION,
  TIPOS_CARRERA,
  type DatosAcademicos,
  type TipoCarrera,
} from "../../shared/types/types.ts";

interface DatosAcademicosFormProps {
  initialData: DatosAcademicos;
  isSubmitting?: boolean;
  onNext: (data: DatosAcademicos) => void;
  onSaveDraft?: (data: DatosAcademicos) => void;
}

type Errors = Partial<Record<string, string>>;

const MOTIVACION_MIN = 50; // el backend rechaza motivaciones más cortas
const MOTIVACION_MAX = 500;

export function DatosAcademicosForm({
  initialData,
  isSubmitting = false,
  onNext,
  onSaveDraft,
}: DatosAcademicosFormProps) {
  const [form, setForm] = useState<DatosAcademicos>(initialData);
  const [errors, setErrors] = useState<Errors>({});

  const handleChange = <K extends keyof DatosAcademicos>(
    field: K,
    value: DatosAcademicos[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // carreras[i] es la carrera del tipo tipoCarreras[i]: se registra un legajo por carrera.
  // Por eso al sacar o agregar un tipo, su carrera sale o entra en la misma posición.
  const toggleTipoCarrera = (tipo: TipoCarrera) => {
    setForm((prev) => {
      const indice = prev.tipoCarreras.indexOf(tipo);
      if (indice !== -1) {
        return {
          ...prev,
          tipoCarreras: prev.tipoCarreras.filter((_, i) => i !== indice),
          carreras: prev.carreras.filter((_, i) => i !== indice),
        };
      }
      if (prev.tipoCarreras.length >= 2) {
        return prev; // máximo 2, ignora el click
      }
      return {
        ...prev,
        tipoCarreras: [...prev.tipoCarreras, tipo],
        carreras: [...prev.carreras, ""],
      };
    });
    setErrors((prev) => ({ ...prev, tipoCarreras: undefined, carreras: undefined }));
  };

  const handleCarreraChange = (indice: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      carreras: prev.tipoCarreras.map((_, i) => (i === indice ? value : (prev.carreras[i] ?? ""))),
    }));
    setErrors((prev) => ({ ...prev, carreras: undefined }));
  };

  const validate = (): boolean => {
    const nextErrors: Errors = {};

    if (form.tipoCarreras.length === 0) {
      nextErrors.tipoCarreras = "Seleccioná al menos un tipo de carrera.";
    }
    const carreras = form.tipoCarreras.map((_, i) => form.carreras[i] ?? "");
    if (carreras.some((carrera) => !carrera)) {
      nextErrors.carreras = "Seleccioná la carrera a la que aspirás en cada tipo elegido.";
    } else if (new Set(carreras).size !== carreras.length) {
      nextErrors.carreras = "No podés elegir la misma carrera dos veces.";
    }
    if (!form.tituloGradoObtenido.trim()) {
      nextErrors.tituloGradoObtenido = "Ingresá tu título de grado.";
    }
    if (!form.canalDifusion) {
      nextErrors.canalDifusion = "Seleccioná una opción.";
    }
    if (!form.motivaciones.trim()) {
      nextErrors.motivaciones = "Contanos brevemente tus motivaciones.";
    } else if (form.motivaciones.trim().length < MOTIVACION_MIN) {
      nextErrors.motivaciones = `Contanos un poco más: escribí al menos ${MOTIVACION_MIN} caracteres (llevás ${form.motivaciones.trim().length}).`;
    } else if (form.motivaciones.trim().length > MOTIVACION_MAX) {
      nextErrors.motivaciones = `No puedes exceder los ${MOTIVACION_MAX} caracteres (llevás ${form.motivaciones.trim().length}).`;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (validate()) {
      onNext(form);
    }
  };

  const handleSaveDraft = () => {
    onSaveDraft?.(form);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-5 pb-8">
      {/* Tipo de carrera */}
      <div className="flex flex-col gap-1.5">
        <label>Tipo de carrera</label>
        <p className="text-xs text-ink-muted">
          Seleccioná hasta 2 tipos de posgrado que te interesen
        </p>
        <div className="flex flex-wrap gap-2">
          {TIPOS_CARRERA.map((tipo) => {
            const seleccionado = form.tipoCarreras.includes(tipo);
            return (
              <button
                key={tipo}
                type="button"
                disabled={isSubmitting}
                onClick={() => toggleTipoCarrera(tipo)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  seleccionado
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-line text-ink-secondary hover:text-ink"
                }`}
              >
                {tipo}
              </button>
            );
          })}
        </div>
        {errors.tipoCarreras && (
          <p className="text-xs font-medium text-semaforo-rojo">{errors.tipoCarreras}</p>
        )}
      </div>

      {/* Carrera elegida: una por cada tipo seleccionado */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label>Carrera elegida (Posgrado)</label>
          <p className="text-xs text-ink-muted">
            Seleccioná el plan académico de cada tipo elegido. Se registra una inscripción por carrera.
          </p>
        </div>
        {form.tipoCarreras.length === 0 && (
          <p className="text-xs text-ink-muted">Elegí primero el tipo de carrera.</p>
        )}
        {form.tipoCarreras.map((tipo, indice) => (
          <div key={tipo} className="flex flex-col gap-1.5">
            <label htmlFor={`carrera-${indice}`} className="text-xs">
              {tipo}
            </label>
            <select
              id={`carrera-${indice}`}
              value={form.carreras[indice] ?? ""}
              onChange={(e) => handleCarreraChange(indice, e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Seleccioná una opción</option>
              {CARRERAS_POSGRADO.map((carrera) => (
                <option key={carrera.value} value={carrera.value}>
                  {carrera.label}
                </option>
              ))}
            </select>
          </div>
        ))}
        {errors.carreras && (
          <p className="text-xs font-medium text-semaforo-rojo">{errors.carreras}</p>
        )}
      </div>

      {/* Título de grado */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tituloGradoObtenido">Título de grado obtenido</label>
        <p className="text-xs text-ink-muted">
          Ingresá la titulación universitaria de grado con la que contás
        </p>
        <input
          id="tituloGradoObtenido"
          type="text"
          value={form.tituloGradoObtenido}
          onChange={(e) => handleChange("tituloGradoObtenido", e.target.value)}
          disabled={isSubmitting}
          placeholder="Ej: Licenciatura en Sistemas de Información"
        />
        {errors.tituloGradoObtenido && (
          <p className="text-xs font-medium text-semaforo-rojo">
            {errors.tituloGradoObtenido}
          </p>
        )}
      </div>

      {/* Título de posgrado (opcional) */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tituloPosgrado">Título de posgrado (opcional)</label>
        <p className="text-xs text-ink-muted">
          Si ya contás con un título de posgrado, indicalo acá
        </p>
        <input
          id="tituloPosgrado"
          type="text"
          value={form.tituloPosgrado ?? ""}
          onChange={(e) => handleChange("tituloPosgrado", e.target.value)}
          disabled={isSubmitting}
          placeholder="Ej: Especialización en Gestión Educativa"
        />
      </div>

      {/* Canal de difusión */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="canalDifusion">
          ¿Cómo conociste la oferta de posgrado?
        </label>
        <p className="text-xs text-ink-muted">Canal de difusión del programa</p>
        <select
          id="canalDifusion"
          value={form.canalDifusion}
          onChange={(e) => handleChange("canalDifusion", e.target.value)}
          disabled={isSubmitting}
        >
          <option value="">Seleccioná una opción</option>
          {CANALES_DIFUSION.map((canal) => (
            <option key={canal.value} value={canal.value}>
              {canal.label}
            </option>
          ))}
        </select>
        {errors.canalDifusion && (
          <p className="text-xs font-medium text-semaforo-rojo">
            {errors.canalDifusion}
          </p>
        )}
      </div>

      {/* Motivaciones */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="motivaciones">
          Motivaciones para realizar la carrera
        </label>
        <p className="text-xs text-ink-muted">
          Describí brevemente tus expectativas y metas profesionales (entre {MOTIVACION_MIN} y {MOTIVACION_MAX} caracteres)
        </p>
        <textarea
          id="motivaciones"
          rows={4}
          value={form.motivaciones}
          onChange={(e) => handleChange("motivaciones", e.target.value)}
          disabled={isSubmitting}
          placeholder="Contanos qué te motiva a realizar este posgrado..."
        />
        <p className="text-xs text-ink-muted">
          {form.motivaciones.trim().length} / {MOTIVACION_MAX} caracteres máximos
        </p>
        {errors.motivaciones && (
          <p className="text-xs font-medium text-semaforo-rojo">
            {errors.motivaciones}
          </p>
        )}
      </div>

      {/* Botones */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isSubmitting}
          className="text-sm font-semibold text-ink-secondary transition-colors hover:text-ink disabled:opacity-50"
        >
          GUARDAR BORRADOR
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
        >
          {isSubmitting ? "GUARDANDO..." : "SIGUIENTE"}
        </button>
      </div>
    </form>
  );
}