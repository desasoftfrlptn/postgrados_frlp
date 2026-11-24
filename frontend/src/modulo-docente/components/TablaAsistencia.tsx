import type { AlumnoPlanilla } from "@/shared/api/endpoints";
import { calcularPorcentaje, type Clase } from "@/shared/types/types";

interface TablaAsistenciaProps {
  alumnos: AlumnoPlanilla[];
  clases: Clase[];
  hoy: string;
  onToggleAsistencia: (claseId: string, legajoId: string, presente: boolean) => void;
  disabled: boolean;
  onConfirmarClase: (claseId: string, dictada: boolean) => void;
}

export function TablaAsistencia({ alumnos, clases, hoy, onToggleAsistencia, disabled, onConfirmarClase }: TablaAsistenciaProps) {
  const dictadas = clases.filter((clase) => clase.dictada === true);
  const asistenciasPorClase = new Map(clases.map((clase) => [
    clase.id, new Map(clase.asistencias.map((marca) => [marca.legajoId, marca.presente])),
  ]));
  const fechas = new Map(clases.map((clase) => [clase.id, clase.fecha.split("-").reverse().join("/")]));

  return (
    <div className="space-y-2">
      {!clases.length && <p className="text-sm text-ink-muted">Todavía no hay clases registradas.</p>}
      {!alumnos.length && <p className="text-sm text-ink-muted">No hay estudiantes inscriptos en este seminario.</p>}
      <div className="scroll-fade overflow-x-auto rounded-xl border border-line bg-paper-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="px-4 py-3">Estudiante</th>
              {clases.map((clase) => (
                <th scope="col" key={clase.id} className="whitespace-nowrap px-4 py-3 text-center">
                  {fechas.get(clase.id)}
                  {clase.fecha > hoy ? (
                    <span className="mt-1 block text-xs font-normal text-ink-muted">Programada</span>
                  ) : (
                    <select
                      aria-label={`Estado de la clase del ${fechas.get(clase.id)}`}
                      className="mt-1 block w-full text-xs"
                      value={clase.dictada === null ? "" : String(clase.dictada)}
                      disabled={disabled}
                      onChange={(event) => onConfirmarClase(clase.id, event.target.value === "true")}
                    >
                      <option value="" disabled>Pendiente</option>
                      <option value="true">Se dictó</option>
                      <option value="false">No se dictó</option>
                    </select>
                  )}
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-center">% de asistencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {alumnos.map((alumno) => {
              const nombre = `${alumno.apellido}, ${alumno.nombre}`;
              const presentes = dictadas.filter((clase) => asistenciasPorClase.get(clase.id)?.get(alumno.legajo_id)).length;
              return (
                <tr key={alumno.legajo_id}>
                  <th scope="row" className="px-4 py-3 font-medium">
                    {nombre}
                    <span className="block text-xs text-ink-muted">{alumno.email}</span>
                    <span className="block text-xs text-ink-muted">{alumno.carrera_grado}</span>
                  </th>
                  {clases.map((clase) => (
                    <td key={clase.id} className="px-4 py-3 text-center">
                      {clase.dictada === true ? <input
                        type="checkbox"
                        aria-label={`Presente: ${nombre}, ${fechas.get(clase.id)}`}
                        checked={asistenciasPorClase.get(clase.id)?.get(alumno.legajo_id) ?? false}
                        onChange={(event) => onToggleAsistencia(clase.id, alumno.legajo_id, event.target.checked)}
                        disabled={disabled}
                        className="h-4 w-4 rounded border-line"
                      /> : <span className="text-ink-muted">—</span>}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center font-semibold">
                    {calcularPorcentaje(presentes, dictadas.length)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}