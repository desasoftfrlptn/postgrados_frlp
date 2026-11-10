// Permite administrar los ciclos y cohortes de las carreras.

export default function CohortesPage() {
  return (
    <section>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Cohortes
          </h1>

          <p className="mt-1 text-gray-500">
            Administrá los ciclos y cohortes de las carreras.
          </p>
        </div>

        <button
          type="button"
          className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          + Nueva cohorte
        </button>
      </header>

      <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">
          Listado de cohortes
        </h2>

        <p className="mt-2 text-gray-500">
          Se administrarán año, carrera, fechas y estado.
        </p>
      </article>
    </section>
  );
}