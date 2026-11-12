import { Link } from "react-router-dom";
import { useAuth } from "../../../manejo-sesion/useAuth";

interface TarjetaDocenteProps {
  titulo: string;
  valor: string;
  accionTexto: string;
  ruta?: string;
}

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

        {ruta ? (
          <Link
            to={ruta}
            className="text-blue-600 text-sm font-semibold hover:underline"
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
  return (
    <section className="perfil-pagina">
      <header className="perfil-pagina-encabezado">
        <h1>Hola, {user?.nombre ?? "Docente"}!</h1>

        <p>
          Bienvenido/a a tu panel docente.
        </p>
      </header>

      <section
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        aria-label="Resumen docente"
      >
        <TarjetaDocente
          titulo="Seminarios Asignados"
          valor="4"
          accionTexto="Ver detalle"
        />

        <TarjetaDocente
          titulo="Estudiantes a Cargo"
          valor="183"
          accionTexto="Ver estudiantes"
        />

        <TarjetaDocente
          titulo="Carga de Asistencias"
          valor="2"
          accionTexto="Completar →"
          ruta="/dashboard/docente/asistencia"
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <article className="bg-white rounded-xl shadow-sm border border-gray-100">
          <header className="p-6 border-b border-gray-100 bg-slate-50 rounded-t-xl">
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
          <header className="p-6 border-b border-gray-100 bg-slate-50 rounded-t-xl">
            <h2 className="text-lg font-bold text-gray-900">
              Últimos Mensajes
            </h2>
          </header>

          <ul className="p-4 space-y-4">
            <li className="flex items-start gap-4 bg-red-50 p-4 rounded-lg border border-red-100">
              <span
                className="text-2xl"
                aria-hidden="true"
              >
                🔔
              </span>

              <div>
                <h3 className="text-sm font-bold text-red-900">
                  Recordatorio: Carga de notas
                </h3>

                <p className="text-sm text-red-700 mt-1">
                  Falta completar información de notas de algunos estudiantes.
                </p>
              </div>
            </li>

            <li className="flex items-start gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <span
                className="text-2xl"
                aria-hidden="true"
              >
                🔔
              </span>

              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Recordatorio: Asistencias
                </h3>

                <p className="text-sm text-slate-600 mt-1">
                  Hay asistencias pendientes de guardar.
                </p>
              </div>
            </li>
          </ul>
        </article>
      </section>
    </section>
  );
}