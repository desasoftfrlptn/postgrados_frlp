import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  Send,
} from "lucide-react";
import { useCohortes } from "@/dashboard-coordinador/hooks/useCohortes";
import { useInscripcion } from "@/shared/hooks/useInscripcion";
import {
  CARRERAS_POSGRADO,
  CANALES_DIFUSION,
} from "@/shared/types/types";
import { SeccionBeca, type BecaState } from "./SeccionBeca";
import { Spinner } from "@/shared/components/Spinner";
import { Button } from "@/shared/components/Button";

interface FormState {
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono_movil: string;
  nacionalidad: string;
  direccion: string;
  pais: string;
  carrera_elegida: string;
  como_conocio: string;
  ciudad: string;
  provincia: string;
  titulo_grado: string;
  tipo_carrera: "Maestria" | "Especializacion" | "Doctorado" | "";
  cohorte_id: string;
  motivacion: string;
  beca: BecaState;
}

type FormErrors = Partial<
  Record<
    keyof Omit<FormState, "beca"> | "tipo_beca" | "archivo_beca",
    string
  >
>;

const INITIAL: FormState = {
  nombre: "",
  apellido: "",
  dni: "",
  email: "",
  telefono_movil: "",
  nacionalidad: "",
  direccion: "",
  pais: "Argentina",
  carrera_elegida: "",
  como_conocio: "",
  ciudad: "",
  provincia: "",
  titulo_grado: "",
  tipo_carrera: "",
  cohorte_id: "",
  motivacion: "",
  beca: {
    solicita_beca: false,
    tipo_beca: null,
    archivo_beca: null,
  },
};

function validar(form: FormState): FormErrors {
  const errores: FormErrors = {};

  if (!form.nombre.trim()) {
    errores.nombre = "El nombre es obligatorio.";
  }

  if (!form.apellido.trim()) {
    errores.apellido = "El apellido es obligatorio.";
  }

  if (!/^\d{7,8}$/.test(form.dni)) {
    errores.dni = "DNI inválido (7 u 8 dígitos).";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errores.email = "Email inválido.";
  }

  if (!form.titulo_grado.trim()) {
    errores.titulo_grado = "Ingresá el título de grado.";
  }

  if (!form.tipo_carrera) {
    errores.tipo_carrera = "Seleccioná un tipo de carrera.";
  }

  if (!form.cohorte_id) {
    errores.cohorte_id = "Seleccioná una cohorte.";
  }

  for (const [campo, mensaje] of [
    ["telefono_movil", "Ingresá el teléfono del aspirante."],
    ["nacionalidad", "Ingresá la nacionalidad del aspirante."],
    ["direccion", "Ingresá la dirección del aspirante."],
    ["ciudad", "Ingresá la ciudad del aspirante."],
    ["provincia", "Ingresá la provincia del aspirante."],
    ["pais", "Ingresá el país del aspirante."],
  ] as const) {
    if (!form[campo].trim()) {
      errores[campo] = mensaje;
    }
  }

  if (
    !CARRERAS_POSGRADO.some(
      (carrera) => carrera.value === form.carrera_elegida,
    )
  ) {
    errores.carrera_elegida = "Seleccioná una carrera disponible.";
  }

  if (
    !CANALES_DIFUSION.some(
      (canal) => canal.value === form.como_conocio,
    )
  ) {
    errores.como_conocio = "Seleccioná cómo conoció el posgrado.";
  }

  const longitudMotivacion = form.motivacion.trim().length;

  if (longitudMotivacion < 50 || longitudMotivacion > 500) {
    errores.motivacion =
      "La motivación debe tener entre 50 y 500 caracteres.";
  }

  if (form.beca.solicita_beca) {
    if (!form.beca.tipo_beca) {
      errores.tipo_beca = "Seleccioná el porcentaje de beca.";
    }

    const archivo = form.beca.archivo_beca;

    if (!archivo) {
      errores.archivo_beca =
        "El formulario de beca en PDF es obligatorio.";
    } else if (
      archivo.type !== "application/pdf" ||
      archivo.size === 0 ||
      archivo.size > 5 * 1024 * 1024
    ) {
      errores.archivo_beca =
        "Adjuntá un PDF no vacío de hasta 5 MB.";
    }
  }

  return errores;
}

interface FormularioInscripcionProps {
  onExito?: () => void;
}

export function FormularioInscripcion({
  onExito,
}: FormularioInscripcionProps) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<FormErrors>({});
  const [enviado, setEnviado] = useState(false);

  const {
    data: cohortes,
    isLoading: loadingCohortes,
    isError: errorCohortes,
    error: consultaError,
  } = useCohortes();

  const inscripcion = useInscripcion({ auth: true });
  const isPending = inscripcion.isPending;

  function setField<K extends keyof Omit<FormState, "beca">>(
    key: K,
    value: FormState[K],
  ) {
    setForm((anterior) => ({
      ...anterior,
      [key]: value,
    }));

    setErrors((anteriores) => ({
      ...anteriores,
      [key]: undefined,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (isPending || loadingCohortes || errorCohortes) {
      return;
    }

    const errores = validar(form);

    if (!cohortes?.some((cohorte) => cohorte.id === form.cohorte_id)) {
      errores.cohorte_id = "Seleccioná una cohorte disponible.";
    }

    if (Object.keys(errores).length > 0) {
      setErrors(errores);

      window.setTimeout(() => {
        document
          .querySelector(".border-semaforo-rojo")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
      }, 50);

      return;
    }

    if (!form.tipo_carrera) {
      return;
    }

    try {
      await inscripcion.mutateAsync({
        datosPersonales: {
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          documento: form.dni,
          nacionalidad: form.nacionalidad.trim(),
          email: form.email.trim(),
          emailAlternativo: "",
          telefonoMovil: form.telefono_movil.trim(),
          telefonoFijo: "",
          domicilio: {
            direccion: form.direccion.trim(),
            ciudad: form.ciudad.trim(),
            provincia: form.provincia.trim(),
            pais: form.pais.trim(),
          },
          solicitaBeca: form.beca.solicita_beca,
          tipoBeca: form.beca.solicita_beca
            ? form.beca.tipo_beca === 30
              ? "30"
              : form.beca.tipo_beca === 100
                ? "100"
                : undefined
            : undefined,
          comprobanteBeca: form.beca.solicita_beca
            ? form.beca.archivo_beca ?? undefined
            : undefined,
        },
        datosAcademicos: {
          tituloGradoObtenido: form.titulo_grado.trim(),
          tipoCarreras: [form.tipo_carrera],
          carreraElegida: form.carrera_elegida,
          canalDifusion: form.como_conocio,
          motivaciones: form.motivacion.trim(),
        },
        datosDocumentos: {},
        cohorte_id: form.cohorte_id,
      });

      setEnviado(true);
      onExito?.();
    } catch (error) {
      console.error("Error al crear legajo:", error);
    }
  }

  if (enviado) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-line bg-paper-surface shadow-sm">
          <div className="flex flex-col items-center px-6 py-12 text-center sm:px-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-semaforo-verde-soft dark:bg-semaforo-verde-soft-dark">
              <CheckCircle2
                size={32}
                className="text-semaforo-verde"
              />
            </div>

            <p className="mt-5 text-xl font-bold text-ink">
              Inscripción registrada
            </p>

            <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-secondary">
              El legajo del aspirante fue creado correctamente y
              quedó registrado en estado{" "}
              <strong className="text-ink">Pendiente</strong>.
            </p>

            {form.beca.solicita_beca && (
              <div className="mt-5 flex max-w-md items-start gap-3 rounded-xl border border-brand-500/15 bg-brand-500/5 px-4 py-3 text-left">
                <FileCheck2
                  size={18}
                  className="mt-0.5 shrink-0 text-brand-500"
                />
                <p className="text-xs leading-relaxed text-ink-secondary">
                  La solicitud de beca también quedó registrada y
                  será evaluada por el coordinador.
                </p>
              </div>
            )}

            <Button
              variant="outline"
              className="mt-7"
              onClick={() => {
                setForm(INITIAL);
                setErrors({});
                setEnviado(false);
                inscripcion.reset();
              }}
            >
              Nueva inscripción
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mx-auto w-full max-w-6xl space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            Nueva inscripción
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-secondary">
            Completá los datos personales y académicos del aspirante
            para registrar su inscripción en el programa de posgrado.
          </p>
        </div>

        <div className="shrink-0 rounded-full border border-line bg-paper-surface px-3 py-1.5 text-xs text-ink-muted">
          <span className="text-semaforo-rojo">*</span>{" "}
          Campos obligatorios
        </div>
      </div>

      {errorCohortes && (
        <p role="alert" className="text-sm text-semaforo-rojo">
          No se pudieron cargar las cohortes: {consultaError?.message}
        </p>
      )}

      {inscripcion.isError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-semaforo-rojo/20 bg-semaforo-rojo-soft p-4 text-sm text-semaforo-rojo dark:bg-semaforo-rojo-soft-dark"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">
              No pudimos completar la inscripción
            </p>
            <p className="mt-1 text-xs">
              {inscripcion.error?.message}
            </p>
          </div>
        </div>
      )}

      <fieldset
        disabled={isPending}
        className="rounded-2xl border border-line bg-paper-surface p-5 shadow-sm sm:p-6"
      >
        <legend className="sr-only">Datos personales</legend>

        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500">
            Paso 1
          </p>
          <h3 className="mt-1 text-base font-semibold text-ink">
            Datos personales
          </h3>
          <p className="mt-1 text-xs text-ink-muted">
            Información básica para identificar al aspirante.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre" required error={errors.nombre}>
            <input
              type="text"
              value={form.nombre}
              placeholder="Ej: Martín"
              onChange={(e) => setField("nombre", e.target.value)}
              className={errors.nombre ? "border-semaforo-rojo" : ""}
            />
          </Field>

          <Field label="Apellido" required error={errors.apellido}>
            <input
              type="text"
              value={form.apellido}
              placeholder="Ej: García"
              onChange={(e) => setField("apellido", e.target.value)}
              className={errors.apellido ? "border-semaforo-rojo" : ""}
            />
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="DNI" required error={errors.dni}>
            <input
              type="text"
              value={form.dni}
              placeholder="Sin puntos"
              inputMode="numeric"
              maxLength={8}
              onChange={(e) =>
                setField("dni", e.target.value.replace(/\D/g, ""))
              }
              className={errors.dni ? "border-semaforo-rojo" : ""}
            />
          </Field>

          <Field label="Email" required error={errors.email}>
            <input
              type="email"
              value={form.email}
              placeholder="tu@email.com"
              onChange={(e) => setField("email", e.target.value)}
              className={errors.email ? "border-semaforo-rojo" : ""}
            />
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Ciudad" required error={errors.ciudad}>
            <input
              type="text"
              value={form.ciudad}
              placeholder="La Plata"
              onChange={(e) => setField("ciudad", e.target.value)}
            />
          </Field>

          <Field label="Provincia" required error={errors.provincia}>
            <input
              type="text"
              value={form.provincia}
              placeholder="Buenos Aires"
              onChange={(e) => setField("provincia", e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field
            label="Teléfono"
            required
            error={errors.telefono_movil}
          >
            <input
              type="tel"
              value={form.telefono_movil}
              placeholder="+54 9 221..."
              onChange={(e) =>
                setField("telefono_movil", e.target.value)
              }
            />
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Nacionalidad"
            required
            error={errors.nacionalidad}
          >
            <input
              type="text"
              value={form.nacionalidad}
              onChange={(e) =>
                setField("nacionalidad", e.target.value)
              }
            />
          </Field>

          <Field label="País" required error={errors.pais}>
            <input
              type="text"
              value={form.pais}
              onChange={(e) => setField("pais", e.target.value)}
            />
          </Field>

          <Field label="Dirección" required error={errors.direccion}>
            <input
              type="text"
              value={form.direccion}
              onChange={(e) => setField("direccion", e.target.value)}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset
        disabled={isPending}
        className="rounded-2xl border border-line bg-paper-surface p-5 shadow-sm sm:p-6"
      >
        <legend className="sr-only">Formación y carrera</legend>

        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500">
            Paso 2
          </p>
          <h3 className="mt-1 text-base font-semibold text-ink">
            Formación y carrera
          </h3>
          <p className="mt-1 text-xs text-ink-muted">
            Indicá la carrera y la cohorte a la que se inscribirá
            el aspirante.
          </p>
        </div>

        <Field
          label="Título de grado"
          required
          error={errors.titulo_grado}
        >
          <input
            type="text"
            value={form.titulo_grado}
            placeholder="Ej: Ingeniero en Sistemas"
            onChange={(e) =>
              setField("titulo_grado", e.target.value)
            }
            className={
              errors.titulo_grado ? "border-semaforo-rojo" : ""
            }
          />
        </Field>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Tipo de carrera"
            required
            error={errors.tipo_carrera}
          >
            <select
              value={form.tipo_carrera}
              onChange={(e) =>
                setField(
                  "tipo_carrera",
                  e.target.value as FormState["tipo_carrera"],
                )
              }
              className={
                errors.tipo_carrera ? "border-semaforo-rojo" : ""
              }
            >
              <option value="">Seleccioná…</option>
              <option value="Maestria">Maestría</option>
              <option value="Especializacion">Especialización</option>
              <option value="Doctorado">Doctorado</option>
            </select>
          </Field>

          <Field label="Cohorte" required error={errors.cohorte_id}>
            <select
              value={form.cohorte_id}
              onChange={(e) =>
                setField("cohorte_id", e.target.value)
              }
              disabled={loadingCohortes}
              className={
                errors.cohorte_id ? "border-semaforo-rojo" : ""
              }
            >
              <option value="">
                {loadingCohortes ? "Cargando…" : "Seleccioná…"}
              </option>
              {cohortes?.map((cohorte) => (
                <option key={cohorte.id} value={cohorte.id}>
                  {cohorte.nombre}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Carrera"
            required
            error={errors.carrera_elegida}
          >
            <select
              value={form.carrera_elegida}
              onChange={(e) =>
                setField("carrera_elegida", e.target.value)
              }
            >
              <option value="">Seleccioná…</option>
              {CARRERAS_POSGRADO.map((carrera) => (
                <option key={carrera.value} value={carrera.value}>
                  {carrera.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Cómo conoció el posgrado"
            required
            error={errors.como_conocio}
          >
            <select
              value={form.como_conocio}
              onChange={(e) =>
                setField("como_conocio", e.target.value)
              }
            >
              <option value="">Seleccioná…</option>
              {CANALES_DIFUSION.map((canal) => (
                <option key={canal.value} value={canal.value}>
                  {canal.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4">
          <Field
            label="Motivación"
            required
            error={errors.motivacion}
          >
            <textarea
              value={form.motivacion}
              rows={4}
              maxLength={500}
              placeholder="Indicá la motivación del aspirante para cursar esta carrera…"
              onChange={(e) =>
                setField("motivacion", e.target.value)
              }
              className={`w-full resize-none ${
                errors.motivacion ? "border-semaforo-rojo" : ""
              }`}
            />
          </Field>
        </div>
      </fieldset>

      <div>
        <SeccionBeca
          disabled={isPending}
          value={form.beca}
          onChange={(beca) => {
            setForm((anterior) => ({
              ...anterior,
              beca,
            }));

            setErrors((anteriores) => ({
              ...anteriores,
              tipo_beca: undefined,
              archivo_beca: undefined,
            }));
          }}
          error={{
            tipo_beca: errors.tipo_beca,
            archivo_beca: errors.archivo_beca,
          }}
        />
      </div>

      <div className="flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-xs text-ink-muted">
          <CheckCircle2
            size={15}
            className="mt-0.5 shrink-0 text-brand-500"
          />
          <p>Revisá los datos antes de enviar la inscripción.</p>
        </div>

        <Button
          type="submit"
          variant="primary"
          icon={isPending ? undefined : Send}
          disabled={
            isPending ||
            loadingCohortes ||
            errorCohortes ||
            !cohortes?.length
          }
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" />
              Enviando…
            </span>
          ) : (
            "Enviar inscripción"
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  required = false,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
        {label}
        {required && (
          <span className="ml-1 text-semaforo-rojo">*</span>
        )}
      </label>

      {children}

      {error && (
        <div className="flex items-start gap-1.5 text-xs text-semaforo-rojo">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}