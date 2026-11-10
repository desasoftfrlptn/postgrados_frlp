// Permite buscar y filtrar las noticias públicas.

interface BarraLateralProps {
  busqueda: string;
  categoria: string;
  categorias: string[];

  alCambiarBusqueda: (
    valor: string
  ) => void;

  alCambiarCategoria: (
    valor: string
  ) => void;
}


export default function BarraLateral({
  busqueda,
  categoria,
  categorias,
  alCambiarBusqueda,
  alCambiarCategoria,
}: BarraLateralProps) {
  return (
    <section className="flex flex-col gap-6">
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <label
          htmlFor="buscador-noticias"
          className="font-bold text-gray-900 mb-2 block"
        >
          Buscar Noticias
        </label>

        <input
          type="search"
          id="buscador-noticias"
          placeholder="Buscar..."
          value={busqueda}
          onChange={(event) =>
            alCambiarBusqueda(
              event.target.value
            )
          }
          className="w-full border border-gray-300 rounded-md p-2 bg-gray-100 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </section>


      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="font-bold text-gray-900 mb-4">
          Categorías
        </h2>

        <nav aria-label="Filtro de categorías">
          <ul className="space-y-3 font-medium text-sm">
            <li>
              <button
                type="button"
                onClick={() =>
                  alCambiarCategoria(
                    "Todas"
                  )
                }
                className={
                  categoria === "Todas"
                    ? "w-full text-left bg-blue-200 text-blue-800 px-4 py-2 rounded-md border border-blue-300"
                    : "w-full text-left bg-gray-200 text-gray-700 hover:bg-gray-300 px-4 py-2 rounded-md border border-gray-300"
                }
              >
                Todas las noticias
              </button>
            </li>

            {categorias.map(
              (nombre) => (
                <li key={nombre}>
                  <button
                    type="button"
                    onClick={() =>
                      alCambiarCategoria(
                        nombre
                      )
                    }
                    className={
                      categoria === nombre
                        ? "w-full text-left bg-blue-200 text-blue-800 px-4 py-2 rounded-md border border-blue-300"
                        : "w-full text-left bg-gray-200 text-gray-700 hover:bg-gray-300 px-4 py-2 rounded-md border border-gray-300"
                    }
                  >
                    {nombre}
                  </button>
                </li>
              )
            )}
          </ul>
        </nav>
      </section>
    </section>
  );
}