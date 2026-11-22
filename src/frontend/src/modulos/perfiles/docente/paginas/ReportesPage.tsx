// Página responsable de permitir al docente generar y descargar reportes de sus seminarios.

import { useEffect, useState } from "react";
import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";

interface SeminarioDocente {
  id: string;
  nombre: string;
  carrera_nombre: string;
}

interface AlumnoSeminario {
  dni_pasaporte: string;
  apellido: string;
  nombre: string;
  correo_electronico: string;
  carrera_elegida: string;
  asistencias: number;
  total_clases: number;
  porcentaje_asistencia: number | null;
  nota_final: number | null;
  estado: string;
}

export default function ReportesPage() {
  const { user } = useAuth();
  const [seminarios, setSeminarios] = useState<SeminarioDocente[]>([]);
  const [seminarioId, setSeminarioId] = useState("");
  const [tipoReporte, setTipoReporte] = useState("acta");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargarSeminarios() {
      if (!user?.token) return;
      try {
        const lista = await api.get<SeminarioDocente[]>(
          "/seminarios/mis-seminarios",
          user.token
        );
        setSeminarios(lista);
        if (lista.length > 0) {
          setSeminarioId(lista[0].id);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al cargar seminarios."
        );
      }
    }
    cargarSeminarios();
  }, [user?.token]);

  const handleDescargar = async (event: React.FormEvent) => {
    event.preventDefault();
    setMensaje(null);
    setError(null);

    if (!user?.token || !seminarioId) {
      setError("Seleccioná un seminario antes de descargar.");
      return;
    }

    try {
      const alumnos = await api.get<AlumnoSeminario[]>(
        `/seminarios/${seminarioId}/estudiantes`,
        user.token
      );
      const sem = seminarios.find((s) => s.id === seminarioId);
      const Encabezado =
        "DNI;Apellido y Nombre;Correo;Carrera;Asistencias;Total Clases;% Asistencia;Nota Final;Estado";
      const filas = alumnos.map(
        (a) =>
          `${a.dni_pasaporte};"${a.apellido}, ${a.nombre}";${a.correo_electronico};"${a.carrera_elegida}";${a.asistencias};${a.total_clases};${a.porcentaje_asistencia === null ? "" : `${a.porcentaje_asistencia}%`};${a.nota_final ?? "-"};${a.estado}`
      );
      const contenidoCsv = "\uFEFF" + [Encabezado, ...filas].join("\n");
      const blob = new Blob([contenidoCsv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${tipoReporte}_${(sem?.nombre ?? "seminario").replace(/\s+/g, "_")}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      setMensaje(
        `Planilla descargada con éxito (${alumnos.length} estudiante/s).`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo generar el reporte."
      );
    }
  };

  return (
    <section className="perfil-pagina animate-fade-in">
      <header className="perfil-pagina-encabezado">
        <h1>Reportes y Planillas</h1>
        <p>Generá y descargá listados y actas de los seminarios que dictás.</p>
      </header>

      {mensaje && (
        <p
          role="status"
          className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-sm"
        >
          {mensaje}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm"
        >
          {error}
        </p>
      )}

      <article className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6 p-6">
        <form onSubmit={handleDescargar} className="space-y-6">
          <fieldset className="border border-slate-200 p-5 rounded-md bg-slate-50">
            <legend className="text-sm font-bold text-slate-700 px-3 bg-slate-50 border border-slate-200 rounded-md">
              Configuración de Descarga
            </legend>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              <div className="flex flex-col">
                <label
                  htmlFor="seminario"
                  className="text-sm font-bold text-slate-700 mb-2"
                >
                  Seleccionar Seminario{" "}
                  <span className="text-red-500" aria-hidden="true">
                    *
                  </span>
                </label>
                <select
                  id="seminario"
                  name="seminario"
                  required
                  value={seminarioId}
                  onChange={(e) => setSeminarioId(e.target.value)}
                  className="border border-slate-300 rounded-md p-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {seminarios.length === 0 && (
                    <option value="">Sin seminarios asignados</option>
                  )}
                  {seminarios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} ({s.carrera_nombre})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label
                  htmlFor="tipoReporte"
                  className="text-sm font-bold text-slate-700 mb-2"
                >
                  Tipo de Planilla{" "}
                  <span className="text-red-500" aria-hidden="true">
                    *
                  </span>
                </label>
                <select
                  id="tipoReporte"
                  name="tipoReporte"
                  required
                  value={tipoReporte}
                  onChange={(e) => setTipoReporte(e.target.value)}
                  className="border border-slate-300 rounded-md p-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="estudiantes">
                    Listado de Estudiantes (CSV / Excel)
                  </option>
                  <option value="asistencia">
                    Planilla de Asistencias (CSV / Excel)
                  </option>
                  <option value="acta">
                    Acta de Calificaciones (CSV / Excel)
                  </option>
                </select>
              </div>
            </div>
          </fieldset>

          <footer className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={!seminarioId}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              ↓ Descargar Documento
            </button>
          </footer>
        </form>
      </article>
    </section>
  );
}