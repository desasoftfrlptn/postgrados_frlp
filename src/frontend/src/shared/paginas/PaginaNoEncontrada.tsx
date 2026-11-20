// Página que se muestra cuando el usuario intenta acceder a una ruta inexistente.

import { Link } from "react-router-dom";

export default function PaginaNoEncontrada() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-bold text-gray-900">
        Página no encontrada
      </h1>

      <p className="mt-4 text-gray-600">
        La página que buscás no existe o todavía no está disponible.
      </p>

      <Link
        to="/"
        className="mt-6 rounded-md bg-blue-700 px-5 py-3 font-medium text-white hover:bg-blue-800"
      >
        Volver al inicio
      </Link>
    </section>
  );
}