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
      <h2 className="text-gray-500 text-sm font-bold mb-3">
        {titulo}
      </h2>

      <div className="flex items-end justify-between gap-4">
        <strong className="text-3xl text-gray-800">
          {valor}
        </strong>

        {children}
      </div>
    </article>
  );
}

export default function DashboardEstudiantePage() {
  const { user } = useAuth();
  return (
    <section className="perfil-pagina">
      <header className="perfil-pagina-encabezado">
        <h1>Hola, {user?.nombre ?? "Estudiante"}!</h1>

        <p>
          Bienvenido/a a tu panel de estudiante.
        </p>
      </header>

      <section
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
        aria-label="Resumen académico"
      >
        <TarjetaMetrica
          titulo="Estado del legajo"
          valor="Completo"
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
          valor="En Curso"
          colorBorde="border-yellow-400"
        >
          <span
            className="flex items-end gap-1 h-8"
            aria-label="Estado académico en curso"
          >
            <span
              className="w-3 h-4 bg-yellow-400 rounded-sm"
              aria-hidden="true"
            />

            <span
              className="w-3 h-6 bg-yellow-400 rounded-sm"
              aria-hidden="true"
            />

            <span
              className="w-3 h-8 bg-yellow-400 rounded-sm"
              aria-hidden="true"
            />
          </span>
        </TarjetaMetrica>

        <TarjetaMetrica
          titulo="Avance del posgrado"
          valor="40%"
          colorBorde="border-blue-500"
        >
          <span className="text-blue-600 text-sm font-semibold">
            Ver Progreso →
          </span>
        </TarjetaMetrica>

        <TarjetaMetrica
          titulo="Seminarios aprobados"
          valor="13"
          colorBorde="border-slate-800"
        >
          <span className="text-slate-600 text-sm font-semibold">
            Ver todos →
          </span>
        </TarjetaMetrica>

        <TarjetaMetrica
          titulo="Inasistencias"
          valor="6"
          colorBorde="border-red-500"
        >
          <span className="text-slate-600 text-sm font-semibold">
            Ver detalle →
          </span>
        </TarjetaMetrica>

        <TarjetaMetrica
          titulo="Nota Promedio"
          valor="7.4"
          colorBorde="border-teal-500"
        >
          <span className="text-slate-600 text-sm font-semibold">
            Ver notas →
          </span>
        </TarjetaMetrica>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <article className="bg-white rounded-xl shadow-sm border border-gray-100">
          <header className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">
              Próximas Clases
            </h2>
          </header>

          <ul className="divide-y divide-gray-100 p-2">
            <li className="p-4 flex justify-between items-center gap-4 text-sm">
              <span className="font-semibold text-slate-700">
                Metodología de la Investigación
              </span>

              <time className="text-slate-500 font-medium">
                Jueves 17/05
              </time>
            </li>

            <li className="p-4 flex justify-between items-center gap-4 text-sm">
              <span className="font-semibold text-slate-700">
                Gestión de Proyectos
              </span>

              <time className="text-slate-500 font-medium">
                Martes 31/05
              </time>
            </li>

            <li className="p-4 flex justify-between items-center gap-4 text-sm">
              <span className="font-semibold text-slate-700">
                Maestría de Sistemas
              </span>

              <time className="text-slate-500 font-medium">
                Lunes 08/06
              </time>
            </li>
          </ul>
        </article>

        <article className="bg-white rounded-xl shadow-sm border border-gray-100">
          <header className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">
              Últimas Notificaciones
            </h2>
          </header>

          <div className="p-6">
            <div className="flex items-start gap-4 bg-red-50 p-5 rounded-lg border border-red-100">
              <span
                className="text-2xl"
                aria-hidden="true"
              >
                🔔
              </span>

              <div>
                <h3 className="text-sm font-bold text-red-900">
                  Recordatorio: Carga de encuesta
                </h3>

                <p className="text-sm text-red-700 mt-1 leading-relaxed">
                  Falta completar información de la encuesta de la materia
                  Metodología de la Investigación.
                </p>
              </div>
            </div>
          </div>
        </article>
      </section>
    </section>
  );
}