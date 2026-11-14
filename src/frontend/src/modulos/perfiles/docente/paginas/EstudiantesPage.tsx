// Página responsable de mostrar al docente la información detallada de sus estudiantes inscriptos.

export default function EstudiantesPage() {
  // Datos simulados (Mock) de los estudiantes a cargo del docente
  const estudiantes = [
    { 
      id: "LEG-001", 
      apellido: "Pérez", 
      nombre: "Juan", 
      correo: "juan@estudiante.utn.edu.ar", 
      carreraPosgrado: "Maestría en Ingeniería en Sistemas de Información",
      seminario: "Metodología de la Investigación"
    },
    { 
      id: "LEG-002", 
      apellido: "Gómez", 
      nombre: "Ana", 
      correo: "ana@estudiante.utn.edu.ar", 
      carreraPosgrado: "Especialización en Gestión de TIC",
      seminario: "Metodología de la Investigación"
    },
    { 
      id: "LEG-003", 
      apellido: "López", 
      nombre: "Carlos", 
      correo: "carlos@estudiante.utn.edu.ar", 
      carreraPosgrado: "Maestría en Ingeniería en Sistemas de Información",
      seminario: "Gestión de Proyectos IT"
    }
  ];

  return (
    <section className="perfil-pagina animate-fade-in">
      <header className="perfil-pagina-encabezado">
        <h1>Información de Estudiantes</h1>
        <p>Consultá el listado y los datos de contacto de los alumnos inscriptos en tus materias.</p>
      </header>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
        <header className="bg-slate-50 border-b border-slate-200 p-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h2 className="text-lg font-bold text-slate-800">Directorio de Alumnos</h2>
          
          {/* Pequeño buscador visual, sin lógica compleja para no sobre-ingeniar */}
          <div className="relative">
            <label htmlFor="buscar-alumno" className="sr-only">Buscar estudiante por nombre</label>
            <input 
              type="search" 
              id="buscar-alumno" 
              placeholder="Buscar estudiante..." 
              className="border border-slate-300 rounded-md py-2 px-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
            />
          </div>
        </header>

        <div className="overflow-x-auto">
          {/* Tabla de datos tabulares (HTML Semántico) */}
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
              <tr>
                <th scope="col" className="p-4 font-bold">Legajo</th>
                <th scope="col" className="p-4 font-bold">Estudiante</th>
                <th scope="col" className="p-4 font-bold">Seminario</th>
                <th scope="col" className="p-4 font-bold">Carrera de Posgrado</th>
                <th scope="col" className="p-4 font-bold text-center">Contacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {estudiantes.map((estudiante) => (
                <tr key={estudiante.id} className="hover:bg-blue-50 transition-colors">
                  
                  <td className="p-4 font-semibold text-slate-600 whitespace-nowrap">
                    {estudiante.id}
                  </td>
                  
                  <td className="p-4 font-bold text-slate-800 whitespace-nowrap">
                    {estudiante.apellido}, {estudiante.nombre}
                  </td>
                  
                  <td className="p-4 font-medium text-slate-700">
                    {estudiante.seminario}
                  </td>
                  
                  <td className="p-4 text-slate-600">
                    {estudiante.carreraPosgrado}
                  </td>
                  
                  <td className="p-4 text-center">
                    {/* Enlace de correo semántico y accesible */}
                    <a 
                      href={`mailto:${estudiante.correo}`}
                      className="inline-flex items-center justify-center p-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                      aria-label={`Enviar correo a ${estudiante.nombre} ${estudiante.apellido}`}
                    >
                      <span aria-hidden="true">✉️</span>
                    </a>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}