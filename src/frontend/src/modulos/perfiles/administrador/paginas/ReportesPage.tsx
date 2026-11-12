// Permite seleccionar filtros para la generación de reportes.

export default function ReportesPage() {
  return (
    <section>
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">
          Reportes
        </h1>

        <p className="mt-1 text-gray-500">
          Generá y descargá información del sistema.
        </p>
      </header>

      <form className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <fieldset className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <legend className="mb-4 text-lg font-bold text-gray-900">
            Configuración del reporte
          </legend>

          <div>
            <label
              htmlFor="tipo-reporte"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Tipo
            </label>

            <select
              id="tipo-reporte"
              className="w-full rounded-md border border-gray-300 p-2"
            >
              <option value="">Seleccionar</option>
              <option value="usuarios">Usuarios</option>
              <option value="carreras">Carreras</option>
              <option value="seminarios">Seminarios</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="estado-reporte"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Estado
            </label>

            <select
              id="estado-reporte"
              className="w-full rounded-md border border-gray-300 p-2"
            >
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="formato-reporte"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Formato
            </label>

            <select
              id="formato-reporte"
              className="w-full rounded-md border border-gray-300 p-2"
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
            </select>
          </div>
        </fieldset>

        <footer className="mt-6 flex justify-end">
          <button
            type="button"
            className="rounded-md bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Generar reporte
          </button>
        </footer>
      </form>
    </section>
  );
}