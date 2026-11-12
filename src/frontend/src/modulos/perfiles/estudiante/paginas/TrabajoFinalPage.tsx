// Página responsable de mostrar el estado y los detalles del Trabajo Final o Tesis del estudiante.

export default function TrabajoFinalPage() {
  // Datos simulados (Mock) para el trabajo final
  const tesis = {
    titulo: "Impacto de la Inteligencia Artificial en la Educación Superior",
    tema: "Tecnología Educativa",
    director: "Dra. María González",
    codirector: "Lic. Carlos Rodríguez",
    estado: "En Revisión por CPR",
    fechaAprobacionTema: "2025-10-15",
    observaciones: "Se solicitan correcciones menores en el marco teórico antes de la defensa oral."
  };

  return (
    <section className="perfil-pagina animate-fade-in">
      <header className="perfil-pagina-encabezado">
        <h1>Trabajo Final / Tesis</h1>
        <p>Consultá el estado actual, autoridades y observaciones de tu proyecto final.</p>
      </header>

      {/* Usamos aria-labelledby para vincular el artículo con su título principal */}
      <article 
        className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" 
        aria-labelledby="titulo-tesis"
      >
        <header className="bg-slate-50 border-b border-slate-200 p-6">
          <h2 id="titulo-tesis" className="text-xl font-bold text-slate-800">
            {tesis.titulo}
          </h2>
          <span className="inline-block mt-3 px-4 py-1 bg-yellow-100 text-yellow-800 text-sm font-bold rounded-full">
            Estado: {tesis.estado}
          </span>
        </header>

        <div className="p-6">
          {/* Uso de lista de descripción semántica para pares clave-valor */}
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
            
            <div className="flex flex-col">
              <dt className="text-sm font-bold text-slate-500 uppercase tracking-wide">Tema</dt>
              <dd className="mt-1 text-base font-medium text-slate-900">{tesis.tema}</dd>
            </div>

            <div className="flex flex-col">
              <dt className="text-sm font-bold text-slate-500 uppercase tracking-wide">Fecha de Aprobación</dt>
              <dd className="mt-1 text-base font-medium text-slate-900">
                {/* Etiqueta time para marcar fechas legibles por máquinas */}
                <time dateTime={tesis.fechaAprobacionTema}>
                  {new Date(tesis.fechaAprobacionTema).toLocaleDateString('es-AR')}
                </time>
              </dd>
            </div>

            <div className="flex flex-col">
              <dt className="text-sm font-bold text-slate-500 uppercase tracking-wide">Director/a</dt>
              <dd className="mt-1 text-base font-medium text-slate-900">{tesis.director}</dd>
            </div>

            <div className="flex flex-col">
              <dt className="text-sm font-bold text-slate-500 uppercase tracking-wide">Codirector/a</dt>
              <dd className="mt-1 text-base font-medium text-slate-900">
                {tesis.codirector || "No asignado"}
              </dd>
            </div>

            {/* Este bloque ocupa ambas columnas para dar más espacio al texto */}
            <div className="flex flex-col md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-100 mt-2">
              <dt className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">Últimas Observaciones</dt>
              <dd className="text-base text-slate-800 leading-relaxed">
                {tesis.observaciones}
              </dd>
            </div>

          </dl>
        </div>
      </article>
    </section>
  );
}