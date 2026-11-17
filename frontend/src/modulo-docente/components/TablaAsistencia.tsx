import type { Legajo, Clase, PorcentajeAsistencia } from "../../shared/types/types.ts";

interface TablaAsistenciaProps {
  alumnos: Legajo[];
  clases: Clase[];
  porcentajes: PorcentajeAsistencia[];
  onToggleAsistencia: (claseId: string, legajoId: string, presenteActual: boolean) => void;
  disabled?: boolean;
}

export function TablaAsistencia({
  alumnos,
  clases,
  porcentajes,
  onToggleAsistencia,
  disabled = false,
}: TablaAsistenciaProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-paper">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line">
            <th className="px-4 py-3 font-semibold text-ink">Alumno</th>
            {clases.map((clase) => (
              <th key={clase.id} className="px-4 py-3 text-center font-semibold text-ink">
                {new Date(clase.fecha).toLocaleDateString("es-AR")}
              </th>
            ))}
            <th className="px-4 py-3 text-center font-semibold text-ink">%</th>
          </tr>
        </thead>
        <tbody>
          {alumnos.map((alumno) => {
            const porcentaje = porcentajes.find((p) => p.legajoId === alumno.id);
            return (
              <tr key={alumno.id} className="border-b border-line last:border-b-0">
                <td className="px-4 py-3 text-ink">
                  {alumno.apellido}, {alumno.nombre}
                </td>
                {clases.map((clase) => {
                  const asistencia = clase.asistencias.find(
                    (a) => a.legajoId === alumno.id
                  );
                  const presente = asistencia?.presente ?? false;
                  return (
                    <td key={clase.id} className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={presente}
                        onChange={() => onToggleAsistencia(clase.id, alumno.id, presente)}
                        disabled={disabled}
                        className="h-4 w-4 rounded border-line"
                      />
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-center font-semibold text-ink">
                  {porcentaje ? `${porcentaje.porcentaje}%` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {clases.length === 0 && (
        <p className="px-4 py-10 text-center text-sm text-ink-muted">
          Todavía no hay clases registradas. Usá "Nueva clase" para empezar.
        </p>
      )}
    </div>
  );
}