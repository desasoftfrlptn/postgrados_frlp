
import { Link } from "react-router-dom";

import { useAuth } from "../../../manejo-sesion/useAuth";

interface TarjetaConduccionProps {
  titulo: string;
  descripcion: string;
  colorBorde: string;
  textoAccion: string;
  ruta: string;
}

function TarjetaConduccion({
  titulo,
  descripcion,
  colorBorde,
  textoAccion,
  ruta,
}: TarjetaConduccionProps) {
  return (
    <article
      className={`bg-white rounded-xl p-6 shadow-sm border-l-4 ${colorBorde} flex flex-col justify-between hover:shadow-md transition-shadow`}
    >
      <div>
        <h2 className="text-sm font-bold text-gray-500 mb-3">
          {titulo}
        </h2>

        <p className="text-base font-semibold text-gray-800">
          {descripcion}
        </p>
      </div>

      <Link
        to={ruta}
        className="text-blue-600 text-sm font-semibold hover:underline mt-5 inline-block"
      >
        {textoAccion} →
      </Link>
    </article>
  );
}

export default function PanelConduccionPage() {
  const { user } = useAuth();

  return (
    <section
      className="perfil-pagina"
      aria-labelledby="titulo-conduccion"
    >
      <header className="perfil-pagina-encabezado">
        <h1 id="titulo-conduccion">
          Hola, {user?.nombre ?? "Coordinador"}!
        </h1>

        <p>
          Bienvenido/a al panel del Equipo de Conducción.
        </p>
      </header>

      {/* ACCESOS PRINCIPALES */}
      <section
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        aria-label="Accesos principales de conducción"
      >
        <TarjetaConduccion
          titulo="Inscripciones"
          descripcion="Consultar y buscar aspirantes"
          colorBorde="border-blue-500"
          textoAccion="Ver aspirantes"
          ruta="/dashboard/conduccion/aspirantes"
        />

        <TarjetaConduccion
          titulo="Revisión de legajos"
          descripcion="Consultar solicitudes pendientes"
          colorBorde="border-yellow-400"
          textoAccion="Ir a inscripciones"
          ruta="/dashboard/conduccion/aspirantes"
        />

        <TarjetaConduccion
          titulo="Estados de inscripción"
          descripcion="Consultar el estado de cada legajo"
          colorBorde="border-green-500"
          textoAccion="Consultar estados"
          ruta="/dashboard/conduccion/aspirantes"
        />
      </section>

      {/* SECCIONES OPERATIVAS */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <article className="bg-white rounded-xl shadow-sm border border-gray-100">
          <header className="p-6 border-b border-gray-100 bg-slate-50 rounded-t-xl">
            <h2 className="text-lg font-bold text-gray-900">
              Gestión de aspirantes
            </h2>
          </header>

          <div className="p-6">
            <p className="text-sm text-slate-600 mb-5">
              Consultá las inscripciones registradas,
              buscá aspirantes por DNI o apellido y
              filtrá los resultados por carrera o estado.
            </p>

            <Link
              to="/dashboard/conduccion/aspirantes"
              className="inline-block rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Consultar aspirantes
            </Link>
          </div>
        </article>

        <article className="bg-white rounded-xl shadow-sm border border-gray-100">
          <header className="p-6 border-b border-gray-100 bg-slate-50 rounded-t-xl">
            <h2 className="text-lg font-bold text-gray-900">
              Revisión de inscripciones
            </h2>
          </header>

          <div className="p-6">
            <p className="text-sm text-slate-600 mb-5">
              Accedé a los legajos para revisar los
              datos de cada aspirante, consultar su
              documentación y comenzar la revisión
              de solicitudes pendientes.
            </p>

            <Link
              to="/dashboard/conduccion/aspirantes"
              className="inline-block rounded-lg border border-blue-600 px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
            >
              Revisar inscripciones
            </Link>
          </div>
        </article>
      </section>

      {/* INFORMACIÓN SOBRE EL ALCANCE ACTUAL */}
      <section
        className="mt-6 rounded-xl bg-white border border-gray-100 shadow-sm p-6"
        aria-labelledby="titulo-informacion-conduccion"
      >
        <h2
          id="titulo-informacion-conduccion"
          className="text-lg font-bold text-gray-900 mb-3"
        >
          Información del módulo
        </h2>

        <p className="text-sm text-slate-600">
          Desde el Equipo de Conducción podés
          consultar aspirantes e inscripciones,
          acceder al detalle de los legajos y
          comenzar su revisión cuando corresponda.
        </p>

        <p className="text-sm text-slate-500 mt-3">
          La aprobación, el rechazo, las observaciones
          y la exportación de legajos se incorporarán
          a medida que se completen esas funcionalidades.
        </p>
      </section>
    </section>
  );
}
