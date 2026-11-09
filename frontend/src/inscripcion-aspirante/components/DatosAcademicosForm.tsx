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

  const toggleTipoCarrera = (tipo: TipoCarrera) => {
    setForm((prev) => {
      const yaSeleccionado = prev.tipoCarreras.includes(tipo);
      if (yaSeleccionado) {
        return { ...prev, tipoCarreras: prev.tipoCarreras.filter((t) => t !== tipo) };
      }
      if (prev.tipoCarreras.length >= 2) {
        return prev; // máximo 2, ignora el click
      }
      return { ...prev, tipoCarreras: [...prev.tipoCarreras, tipo] };
    });
    setErrors((prev) => ({ ...prev, tipoCarreras: undefined }));
  };

  const validate = (): boolean => {
    const nextErrors: Errors = {};

    if (form.tipoCarreras.length === 0) {
      nextErrors.tipoCarreras = "Seleccioná al menos un tipo de carrera.";
    }
    if (!form.carreraElegida) {
      nextErrors.carreraElegida = "Seleccioná la carrera a la que aspirás.";
    }
    if (!form.tituloGradoObtenido.trim()) {
      nextErrors.tituloGradoObtenido = "Ingresá tu título de grado.";
    }
    if (!form.canalDifusion) {
      nextErrors.canalDifusion = "Seleccioná una opción.";
    }
    if (!form.motivaciones.trim()) {
      nextErrors.motivaciones = "Contanos brevemente tus motivaciones.";
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

      {/* Carrera elegida */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="carreraElegida">Carrera elegida (Posgrado)</label>
        <p className="text-xs text-ink-muted">
          Seleccioná el plan académico al que aspirás
        </p>
        <select
          id="carreraElegida"
          value={form.carreraElegida}
          onChange={(e) => handleChange("carreraElegida", e.target.value)}
          disabled={isSubmitting}
        >
          <option value="">Seleccioná una opción</option>
          {CARRERAS_POSGRADO.map((carrera) => (
            <option key={carrera.value} value={carrera.value}>
              {carrera.label}
            </option>
          ))}
        </select>
        {errors.carreraElegida && (
          <p className="text-xs font-medium text-semaforo-rojo">
            {errors.carreraElegida}
          </p>
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
          Describí brevemente tus expectativas y metas profesionales (máximo {MOTIVACION_MAX} caracteres)
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