import { useEffect, useState } from "react";
import { api } from "../../../../shared/api/client";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../../../manejo-sesion/useAuth";

interface TarjetaMetricaProps {
  titulo: string;
  valor: string;
  colorBorde: string;
  children?: ReactNode;
}

function TarjetaMetrica({
  titulo,
  valor,
  colorBorde,
  children,
}: TarjetaMetricaProps) {
  return (
    <article
      className={`bg-white rounded-xl p-6 shadow-sm border-l-4 ${colorBorde} flex flex-col justify-between hover:shadow-md transition-shadow`}
    >
      <h2 className="text-gray-500 text-sm font-bold mb-3">{titulo}</h2>

      <div className="flex items-end justify-between gap-4">
        <strong className="text-3xl text-gray-800">{valor}</strong>
        {children}
      </div>
    </article>
  );
}

interface MiLegajo {
  id: string;
  carrera_elegida: string;
  estado: string;
  dni_pasaporte: string;
}

interface CursadaSeminario {
  inscripcion_id: string;
  seminario_nombre: string;
  fecha_inicio: string;
  asistencias: number;
  total_clases: number;
  porcentaje_asistencia: number;
  nota_final: number | null;
  estado: string;
}

export default function DashboardEstudiantePage() {
  const { user } = useAuth();
  const [legajo, setLegajo] = useState<MiLegajo | null>(null);
  const [cursada, setCursada] = useState<CursadaSeminario[]>([]);
  const [cargandoLegajo, setCargandoLegajo] = useState(true);
  const [errorLegajo, setErrorLegajo] = useState<string | null>(null);

  useEffect(() => {
    async function cargarDatosEstudiante() {
      if (!user?.token) {
        setCargandoLegajo(false);
        return;
      }

      try {
        const respuestaLegajo = await api.get<MiLegajo>(
          "/inscripcion/mi-legajo",
          user.token
        );
        setLegajo(respuestaLegajo);
        setErrorLegajo(null);
      } catch (err) {
        setErrorLegajo(
          err instanceof Error ? err.message : "Sin legajo registrado"
        );
      }

      try {
        const respuestaCursada = await api.get<CursadaSeminario[]>(
          "/seminarios/mi-cursada",
          user.token
        );
        setCursada(respuestaCursada);
      } catch {
        setCursada([]);
      } finally {
        setCargandoLegajo(false);
      }
    }
    cargarDatosEstudiante();
  }, [user?.token]);

  let textoEstadoLegajo = "Sin registrar";
  if (cargandoLegajo) {
    textoEstadoLegajo = "Cargando...";
  } else if (legajo) {
    textoEstadoLegajo = legajo.estado;
  }

  // Métricas derivadas de la cursada real
  const totalSeminarios = cursada.length;
  const aprobados = cursada.filter((s) => s.estado === "APROBADO").length;
  const porcentajeAvance =
    totalSeminarios > 0 ? Math.round((aprobados / totalSeminarios) * 100) : 0;
  const totalInasistencias = cursada.reduce(
    (acc, s) => acc + Math.max(0, s.total_clases - s.asistencias),
    0
  );
  const notasCargadas = cursada
    .map((s) => s.nota_final)
    .filter((n): n is number => n !== null);
  const promedioTexto =
    notasCargadas.length > 0
      ? (
          notasCargadas.reduce((acc, n) => acc + n, 0) / notasCargadas.length
        ).toFixed(1)
      : "-";
  const estadoAcademicoTexto =
    totalSeminarios === 0
      ? "Sin cursada"
      : aprobados === totalSeminarios
      ? "Al día"
      : "En Curso";

  return (
    <section className="perfil-pagina">
      <header className="perfil-pagina-encabezado">
        <h1>Hola, {user?.nombre ?? "Estudiante"}!</h1>

        <p>
          {legajo
            ? `Carrera: ${legajo.carrera_elegida}`
            : "Bienvenido/a a tu panel de estudiante."}
        </p>
      </header>

      {errorLegajo && (
        <p
          role="status"
          className="mb-6 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-sm"
        >
          {errorLegajo}
        </p>
      )}

      <section
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
        aria-label="Resumen académico"
      >
        <TarjetaMetrica
          titulo="Estado del legajo"
          valor={textoEstadoLegajo}
          colorBorde="border-green-500"
        >
          <Link
            to="/dashboard/perfil"
            className="text-green-700 text-sm font-semibold hover:underline"
          >
            Ver legajo →
          </Link>
        </TarjetaMetrica>

        <TarjetaMetrica
          titulo="Estado Académico"
          valor={estadoAcademicoTexto}
          colorBorde="border-yellow-400"
        >
          <Link
            to="/dashboard/estado-academico"
            className="text-yellow-700 text-sm font-semibold hover:underline"
          >
            Ver detalle →
          </Link>
        </TarjetaMetrica>

        <TarjetaMetrica
          titulo="Avance de seminarios"
          valor={`${porcentajeAvance}%`}
          colorBorde="border-blue-500"
        >
          <Link
            to="/dashboard/estado-academico"
            className="text-blue-600 text-sm font-semibold hover:underline"
          >
            Ver progreso →
          </Link>
        </TarjetaMetrica>

        <TarjetaMetrica
          titulo="Seminarios aprobados"
          valor={`${aprobados} / ${totalSeminarios}`}
          colorBorde="border-slate-800"
        >
          <Link
            to="/dashboard/estado-academico"
            className="text-slate-600 text-sm font-semibold hover:underline"
          >
            Ver todos →
          </Link>
        </TarjetaMetrica>

        <TarjetaMetrica
          titulo="Inasistencias"
          valor={String(totalInasistencias)}
          colorBorde="border-red-500"
        >
          <Link
            to="/dashboard/asistencias"
            className="text-red-700 text-sm font-semibold hover:underline"
          >
            Ver detalle →
          </Link>
        </TarjetaMetrica>

        <TarjetaMetrica
          titulo="Nota Promedio"
          valor={promedioTexto}
          colorBorde="border-teal-500"
        >
          <Link
            to="/dashboard/estado-academico"
            className="text-teal-700 text-sm font-semibold hover:underline"
          >
            Ver notas →
          </Link>
        </TarjetaMetrica>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <article className="bg-white rounded-xl shadow-sm border border-gray-100">
          <header className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">
              Mis Seminarios Inscriptos
            </h2>
          </header>

          <ul className="divide-y divide-gray-100 p-2">
            {cursada.length === 0 && (
              <li className="p-4 text-sm text-slate-500">
                Aún no estás inscripto en ningún seminario.
              </li>
            )}
            {cursada.map((sem) => (
              <li
                key={sem.inscripcion_id}
                className="p-4 flex justify-between items-center gap-4 text-sm"
              >
                <span className="font-semibold text-slate-700">
                  {sem.seminario_nombre}
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
          <header className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">
              Últimas Notificaciones
            </h2>
          </header>

          <div className="p-6">
            <div className="flex items-start gap-4 bg-blue-50 p-5 rounded-lg border border-blue-100">
              <span className="text-2xl" aria-hidden="true">
                🔔
              </span>
              <div>
                <h3 className="text-sm font-bold text-blue-900">
                  Seguimiento de cursada
                </h3>
                <p className="text-sm text-blue-700 mt-1 leading-relaxed">
                  Recordá mantener al menos 75% de asistencia (BR-002) y nota
                  final mayor o igual a 4 (BR-003) para aprobar tus seminarios.
                </p>
              </div>
            </div>
          </div>
        </article>
      </section>
    </section>
  );
}