// Muestra indicadores generales del sistema académico.

export default function EstadisticasPage() {
  return (
    <section>
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">
          Estadísticas
        </h1>

        <p className="mt-1 text-gray-500">
          Consultá indicadores generales del sistema académico.
        </p>
      </header>

      <section
        aria-label="Indicadores académicos"
        className="grid grid-cols-1 gap-6 md:grid-cols-3"
      >
        <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-500">
            Estudiantes
          </h2>

          <p className="mt-3 text-3xl font-bold text-gray-800">
            0
          </p>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-500">
            Docentes
          </h2>

          <p className="mt-3 text-3xl font-bold text-gray-800">
            0
          </p>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-500">
            Carreras activas
          </h2>

          <p className="mt-3 text-3xl font-bold text-gray-800">
            0
          </p>
        </article>
      </section>
    </section>
  );
}