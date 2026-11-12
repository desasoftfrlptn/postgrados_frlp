// Página responsable de mostrar la bitácora y seguimiento de tutorías para el Trabajo Final.

export default function TutoriasPage() {
  // Datos simulados (Mock) de los encuentros de tutoría ordenados desde el más reciente
  const tutorias = [
    { 
      id: 1, 
      tutor: "Dra. María González", 
      fecha: "2026-09-05", 
      estado: "Pendiente", 
      observaciones: "Revisión del primer borrador del marco teórico y selección definitiva de la metodología a aplicar." 
    },
    { 
      id: 2, 
      tutor: "Dra. María González", 
      fecha: "2026-08-10", 
      estado: "Realizada", 
      observaciones: "Se definió la pregunta de investigación principal y los objetivos específicos. El alumno debe traer un borrador del marco teórico para la próxima reunión presencial." 
    }
  ];

  return (
    <section className="perfil-pagina animate-fade-in">
      <header className="perfil-pagina-encabezado">
        <h1>Tutorías</h1>
        <p>Consultá el seguimiento de tus encuentros con el director de tesis.</p>
      </header>

      <section className="mt-6">
        {/* Título oculto visualmente pero accesible para lectores de pantalla */}
        <h2 className="sr-only">Historial de encuentros cronológicos</h2>
        
        {/* Lista ordenada semántica porque los eventos tienen un orden temporal (bitácora) */}
        <ol className="space-y-6">
          {tutorias.map((tutoria) => (
            <li key={tutoria.id}>
              
              {/* Cada encuentro es un artículo autocontenido */}
              <article className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-6">
                
                {/* aside: Información secundaria o metadatos de la tutoría */}
                <aside className="md:w-1/4 flex flex-col items-start border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold mb-4 ${
                    tutoria.estado === 'Realizada' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {tutoria.estado}
                  </span>
                  
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Fecha</p>
                  <time dateTime={tutoria.fecha} className="text-lg font-bold text-slate-800 mb-4">
                    {new Date(tutoria.fecha).toLocaleDateString('es-AR')}
                  </time>

                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tutor</p>
                  <p className="text-sm font-medium text-slate-900">{tutoria.tutor}</p>
                </aside>

                {/* Contenido principal de la tutoría */}
                <div className="md:w-3/4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                    Observaciones / Tareas
                  </h3>
                  <p className="text-slate-700 leading-relaxed">
                    {tutoria.observaciones}
                  </p>
                </div>

              </article>
              
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}