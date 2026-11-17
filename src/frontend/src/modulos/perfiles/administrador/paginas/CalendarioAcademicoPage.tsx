// Permite administrar los eventos del calendario académico público.

export default function CalendarioAcademicoPage() {
  return (
    <section>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Calendario Académico
          </h1>

          <p className="mt-1 text-gray-500">
            Gestioná los eventos publicados en el calendario académico.
          </p>
        </div>

        <button
          type="button"
          className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          + Nuevo evento
        </button>
      </header>

      <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-gray-500">
          Desde esta sección se podrán cargar, modificar y eliminar
          eventos del calendario público.
        </p>
      </article>
    </section>
  );
}