import type { DatosPersonales, DatosAcademicos, DatosDocumentos } from "../../shared/types/types.ts";
import { DOCUMENTOS_REQUERIDOS } from "../../shared/types/types.ts";

interface ConfirmacionStepProps {
  datosPersonales: DatosPersonales;
  datosAcademicos: DatosAcademicos;
  datosDocumentos: DatosDocumentos;
  isSubmitting?: boolean;
  onEditStep: (stepIndex: number) => void;
  onVolverBorrador: () => void;
  onConfirmar: () => void;
}

function SeccionResumen({
  titulo,
  descripcion,
  estado,
  onEditar,
}: {
  titulo: string;
  descripcion: string;
  estado?: "completo" | "parcial";
  onEditar: () => void;
}) {
  const esParcial = estado === "parcial";

  return (
    <div
      className={`rounded-xl border bg-paper px-5 py-4 ${
        esParcial ? "border-semaforo-amarillo" : "border-line"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {estado && (
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                esParcial ? "bg-semaforo-amarillo" : "bg-semaforo-verde"
              }`}
              aria-hidden="true"
            />
          )}
          <h2 className="text-sm font-bold text-ink">{titulo}</h2>
        </div>
        <button
          type="button"
          onClick={onEditar}
          className="text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700"
        >
          Editar sección
        </button>
      </div>
      <p className="mt-1.5 text-sm text-ink-secondary">{descripcion}</p>
    </div>
  );
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
  const obligatorios = DOCUMENTOS_REQUERIDOS.filter((d) => !d.opcional);
  const cargados = obligatorios.filter((d) => datosDocumentos[d.id]);
  const faltantes = obligatorios.filter((d) => !datosDocumentos[d.id]);
  const documentacionCompleta = faltantes.length === 0;

  const nombreCompleto = [datosPersonales.apellido, datosPersonales.nombre]
    .filter(Boolean)
    .join(", ");

  const descPersonales = [
    nombreCompleto,
    datosPersonales.documento && `DNI ${datosPersonales.documento}`,
    datosPersonales.nacionalidad && `Nacionalidad ${datosPersonales.nacionalidad}`,
    [
      datosPersonales.domicilio.direccion,
      datosPersonales.domicilio.ciudad,
      datosPersonales.domicilio.provincia,
    ]
      .filter(Boolean)
      .join(", "),
    datosPersonales.email,
    datosPersonales.telefonoMovil,
    datosPersonales.solicitaBeca &&
      `Solicita beca${datosPersonales.tipoBeca ? ` (${datosPersonales.tipoBeca}%)` : ""}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const descAcademicos = [
    datosAcademicos.tipoCarreras.length > 0 &&
      datosAcademicos.tipoCarreras.join(" / "),
    datosAcademicos.carreraElegida,
    datosAcademicos.tituloGradoObtenido &&
      `Título previo: ${datosAcademicos.tituloGradoObtenido}`,
    datosAcademicos.tituloPosgrado &&
      `Posgrado previo: ${datosAcademicos.tituloPosgrado}`,
    datosAcademicos.motivaciones && `Motivación declarada`,
  ]
    .filter(Boolean)
    .join(" · ");

  const descDocumentos = documentacionCompleta
    ? `Cargados: ${cargados.length} de ${obligatorios.length} documentos requeridos de forma obligatoria. Documentación completa.`
    : `Cargados: ${cargados.length} de ${obligatorios.length} documentos requeridos de forma obligatoria. Pendientes de completar: ${faltantes
        .map((d) => d.label)
        .join(", ")}. Podés enviar la postulación y completar luego la documentación pendiente.`;

  return (
    <div className="flex flex-col gap-4 px-5 pb-8">
      <SeccionResumen
        titulo="Datos Personales"
        descripcion={descPersonales || "Sin datos cargados."}
        onEditar={() => onEditStep(0)}
      />

      <SeccionResumen
        titulo="Datos Académicos"
        descripcion={descAcademicos || "Sin datos cargados."}
        onEditar={() => onEditStep(1)}
      />

      <SeccionResumen
        titulo={documentacionCompleta ? "Documentación" : "Documentación (Parcial)"}
        descripcion={descDocumentos}
        estado={documentacionCompleta ? "completo" : "parcial"}
        onEditar={() => onEditStep(2)}
      />

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onVolverBorrador}
          disabled={isSubmitting}
          className="rounded-lg border border-line bg-paper-surface px-5 py-2.5 text-sm font-semibold text-ink-secondary transition-colors hover:text-ink disabled:opacity-50"
        >
          Volver al borrador
        </button>

        <button
          type="button"
          onClick={onConfirmar}
          disabled={isSubmitting}
          className="rounded-lg bg-ink px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-ink/90 disabled:opacity-50"
        >
          {isSubmitting ? "Enviando..." : "Confirmar inscripción"}
        </button>
      </div>
    </div>
  );
}