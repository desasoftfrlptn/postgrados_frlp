// Página principal de inicio (Dashboard) para el perfil Docente.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";

interface SeminarioDocente {
  id: string;
  nombre: string;
  carrera_nombre: string;
  fecha_inicio: string;
}
interface AlumnoResumen {
  total_clases: number;
  nota_final: number | null;
}

interface TarjetaDocenteProps {
  titulo: string;
  valor: string;
  accionTexto: string;
  ruta?: string;
}

// Subcomponente semántico para las tarjetas de resumen
function TarjetaDocente({
  titulo,
  valor,
  accionTexto,
  ruta,
}: TarjetaDocenteProps) {
  return (
    <article className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between hover:border-blue-300 transition-colors">
      <h2 className="text-slate-600 font-bold mb-4">
        {titulo}
      </h2>

      <div className="flex items-end justify-between gap-4 mt-4">
        <strong className="text-5xl font-light text-slate-400">
          {valor}
        </strong>

        {/* Si pasamos una ruta, usamos el enrutador. Si no, es solo texto decorativo */}
        {ruta ? (
          <Link
            to={ruta}
            className="text-blue-600 text-sm font-semibold hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            {accionTexto}
          </Link>
        ) : (
          <span className="text-slate-500 text-sm font-semibold">
            {accionTexto}
          </span>
        )}
      </div>
    </article>
  );
}

export default function DashboardDocentePage() {
  const { user } = useAuth();
  const [seminarios, setSeminarios] = useState<SeminarioDocente[]>([]);
  const [notasPendientes, setNotasPendientes] = useState<number>(0);
  const [seminariosSinClases, setSeminariosSinClases] = useState<number>(0);
  const [totalEstudiantes, setTotalEstudiantes] = useState<number>(0);

    useEffect(() => {
    async function cargarResumen() {
      if (!user?.token) return;
      try {
        const lista = await api.get<SeminarioDocente[]>(
          "/seminarios/mis-seminarios",
          user.token
        );
        setSeminarios(lista);

        let acumulado = 0;
        let sinNota = 0;
        let sinClases = 0;
        for (const sem of lista) {
          const alumnos = await api.get<AlumnoResumen[]>(
            `/seminarios/${sem.id}/estudiantes`,
            user.token
          );
          acumulado += alumnos.length;
          sinNota += alumnos.filter((a) => a.nota_final === null).length;
          if (alumnos.length > 0 && alumnos.every((a) => a.total_clases === 0)) {
            sinClases += 1;
          }
        }
        setTotalEstudiantes(acumulado);
        setNotasPendientes(sinNota);
        setSeminariosSinClases(sinClases);
      } catch {
        // Si aún no tiene seminarios asignados, mantiene 0
      }
    }
    cargarResumen();
  }, [user?.token]);

  return (
    <section className="perfil-pagina animate-fade-in">
      <header className="perfil-pagina-encabezado">
        <h1>Hola, {user?.nombre ?? "Docente"}!</h1>

        <p>
          Bienvenido/a a tu panel docente.
        </p>
      </header>

      {/* Tarjetas de métricas principales */}
      <section
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        aria-label="Resumen docente"
      >
        <TarjetaDocente
          titulo="Seminarios Asignados"
          valor={String(seminarios.length)}
          accionTexto="Ver detalle →"
          ruta="/dashboard/docente/seminarios"
        />

        <TarjetaDocente
          titulo="Estudiantes a Cargo"
          valor={String(totalEstudiantes)}
          accionTexto="Sin acciones"
        />

        <TarjetaDocente
          titulo="Carga de Asistencias"
          valor={String(seminarios.length)}
          accionTexto="Completar →"
          ruta="/dashboard/docente/asistencia"
        />
      </section>

      {/* Listados de clases y alertas */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <article className="bg-white rounded-xl shadow-sm border border-gray-100">
          <header className="p-6 border-b border-gray-100 bg-slate-50 rounded-t-xl">
            <h2 className="text-lg font-bold text-gray-900">
              Próximas Clases
            </h2>
          </header>

          <ul className="divide-y divide-gray-100 p-2">
            {seminarios.length === 0 && (
              <li className="p-4 text-sm text-slate-500">
                No tenés seminarios asignados actualmente.
              </li>
            )}
            {seminarios.map((sem) => (
              <li
                 key={sem.id}
                 className="p-4 flex justify-between items-center gap-4 text-sm"
              >
                <span className="font-semibold text-slate-700">
                  {sem.nombre} ({sem.carrera_nombre})
                </span>
                <time
                  dateTime={sem.fecha_inicio}
                  className="text-slate-500 font-medium"
                 >
                   {new Date(sem.fecha_inicio).toLocaleDateString("es-AR")}
                 </time>
              </li>
             ))}
           </ul>
        </article>

        <article className="bg-white rounded-xl shadow-sm border border-gray-100">
          <header className="p-6 border-b border-gray-100 bg-slate-50 rounded-t-xl">
            <h2 className="text-lg font-bold text-gray-900">
              Últimas Alertas
            </h2>
          </header>

                       <ul className="p-4 space-y-4">
            <li className="flex items-start gap-4 bg-red-50 p-4 rounded-lg border border-red-100">
              <span className="text-2xl" aria-hidden="true">
                🔔
              </span>
              <div>
                <h3 className="text-sm font-bold text-red-900">
                  Actas de cierre: {notasPendientes} calificación/es pendiente/s
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  {notasPendientes > 0
                    ? `Tenés ${notasPendientes} estudiante/s inscripto/s sin nota final cargada.`
                    : "Todas las calificaciones de tus estudiantes están al día."}
                </p>
              </div>
            </li>

            <li className="flex items-start gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <span className="text-2xl" aria-hidden="true">
                🔔
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Asistencias: {seminariosSinClases} seminario/s sin clases registradas
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {seminariosSinClases > 0
                    ? `Tenés ${seminariosSinClases} seminario/s con alumnos inscriptos donde aún no registraste ninguna clase.`
                    : "Todos tus seminarios con alumnos tienen clases registradas."}
                </p>
              </div>
            </li>
          </ul>
        </article>

      </section>
    </section>
  );
}