// Administra las preguntas frecuentes visibles en el sitio público.

export default function FaqAdmin() {
  return (
    <article className="admin-home-panel">
      <header>
        <h2>
          Preguntas frecuentes
        </h2>

        <p>
          Administrá las categorías, preguntas
          y respuestas del sitio público.
        </p>
      </header>

      <section className="admin-home-cargando">
        <p>
          Desde esta sección se podrán crear,
          modificar, ordenar, activar y desactivar
          preguntas frecuentes.
        </p>
      </section>
    </article>
  );
}