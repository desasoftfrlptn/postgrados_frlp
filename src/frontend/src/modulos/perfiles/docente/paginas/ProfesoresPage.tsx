// Página responsable de mostrar el directorio o listado de profesores de la carrera.

export default function ProfesoresPage() {
  // Datos simulados (Mock) del cuerpo docente
  const profesores = [
    { 
      id: "DOC-101", 
      apellido: "González", 
      nombre: "María", 
      correo: "maria@docente.utn.edu.ar", 
      seminario: "Metodología de la Investigación", 
      cargo: "Titular" 
    },
    { 
      id: "DOC-102", 
      apellido: "Rodríguez", 
      nombre: "Carlos", 
      correo: "carlos@docente.utn.edu.ar", 
      seminario: "Gestión de Proyectos IT", 
      cargo: "Adjunto" 
    },
    { 
      id: "DOC-103", 
      apellido: "Fernández", 
      nombre: "Lucía", 
      correo: "lucia@docente.utn.edu.ar", 
      seminario: "Bases de Datos Avanzadas", 
      cargo: "Titular" 
    }
  ];

  return (
    <section className="perfil-pagina animate-fade-in">
      <header className="perfil-pagina-encabezado">
        <h1>Directorio de Profesores</h1>
        <p>Consultá el cuerpo docente de las carreras y comunícate con tus colegas.</p>
      </header>

      {/* Uso avanzado de CSS Grid para mostrar tarjetas de perfil de forma responsiva */}
      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {profesores.map((profe) => (
          <li key={profe.id}>
            
            <article className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
              
              {/* Cabecera de la tarjeta con iniciales (Avatar simulado usando Flexbox) */}
              <header className="bg-slate-50 border-b border-slate-200 p-5 flex items-center gap-4">
                
                {/* Círculo decorativo con iniciales */}
                <div 
                  className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg" 
                  aria-hidden="true"
                >
                  {profe.nombre.charAt(0)}{profe.apellido.charAt(0)}
                </div>
                
                <div>
                  <h2 className="text-lg font-bold text-slate-800 leading-tight">
                    {profe.apellido}, {profe.nombre}
                  </h2>
                  <p className="text-sm font-medium text-slate-500">
                    {profe.cargo}
                  </p>
                </div>
              </header>

              <div className="p-5 flex-grow flex flex-col justify-between gap-4">
                
                <dl>
                  <dt className="text-xs font-bold text-slate-500 uppercase tracking-wide">Seminario a cargo</dt>
                  <dd className="text-sm font-medium text-slate-800 mt-1">
                    {profe.seminario}
                  </dd>
                </dl>

                {/* mt-auto empuja el pie de la tarjeta siempre hacia abajo, alineando todos los botones */}
                <footer className="mt-auto border-t border-slate-100 pt-4">
                  {/* Enlace semántico accesible para contacto */}
                  <a 
                    href={`mailto:${profe.correo}`}
                    className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 focus:outline-none focus:underline"
                    aria-label={`Enviar correo electrónico a ${profe.nombre} ${profe.apellido}`}
                  >
                    <span aria-hidden="true">✉️</span> Contactar
                  </a>
                </footer>

              </div>
            </article>
            
          </li>
        ))}
      </ul>
    </section>
  );
}