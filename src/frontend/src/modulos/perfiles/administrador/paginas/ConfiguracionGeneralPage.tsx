// Permite administrar los parámetros generales del sistema.

export default function ConfiguracionGeneralPage() {
  return (
    <section>
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">
          Configuración General
        </h1>

        <p className="mt-1 text-gray-500">
          Administrá los parámetros generales del sistema.
        </p>
      </header>

      <form className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <fieldset className="space-y-6">
          <legend className="text-lg font-bold text-gray-900">
            Parámetros generales
          </legend>

          <div>
            <label
              htmlFor="fecha-inicio"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Fecha de inicio
            </label>

            <input
              id="fecha-inicio"
              type="date"
              className="w-full rounded-md border border-gray-300 p-2 md:w-80"
            />
          </div>

          <div>
            <label
              htmlFor="fecha-fin"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Fecha de finalización
            </label>

            <input
              id="fecha-fin"
              type="date"
              className="w-full rounded-md border border-gray-300 p-2 md:w-80"
            />
          </div>
        </fieldset>

        <footer className="mt-6 flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Guardar configuración
          </button>
        </footer>
      </form>
    </section>
  );
}