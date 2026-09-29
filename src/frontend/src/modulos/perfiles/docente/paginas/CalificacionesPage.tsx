// Página responsable de permitir al docente registrar las calificaciones finales de sus alumnos (Formulario de carga).

export default function CalificacionesPage() {
  // Simulamos la lista de alumnos inscriptos en el seminario
  const alumnos = [
    { id: "LEG-001", apellido: "Pérez", nombre: "Juan" },
    { id: "LEG-002", apellido: "Gómez", nombre: "Ana" },
    { id: "LEG-003", apellido: "López", nombre: "Carlos" }
  ];

  // Función que maneja el evento de envío del formulario
  const handleSubmit = async (event: React.FormEvent) => {
    // Evitamos que el navegador recargue la página (comportamiento HTML por defecto)
    event.preventDefault();
    
    // Aquí a futuro irá el Fetch/Async Await para enviar los datos al Backend
    alert("Las calificaciones se han guardado exitosamente.");
  };

  return (
    <section className="perfil-pagina animate-fade-in">
      <header className="perfil-pagina-encabezado">
        <h1>Carga de Calificaciones</h1>
        <p>Registrá la nota final y la condición de cada estudiante en el acta de cierre.</p>
      </header>

      <article className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
        <header className="bg-slate-50 border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-800">Metodología de la Investigación</h2>
          <p className="text-sm text-slate-500 mt-1">Cohorte 2026 - Acta de Cierre</p>
        </header>

        {/* Formulario que envuelve toda la tabla de carga de notas */}
        <form onSubmit={handleSubmit} className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                <tr>
                  <th scope="col" className="p-4 font-bold">Legajo</th>
                  <th scope="col" className="p-4 font-bold">Alumno</th>
                  <th scope="col" className="p-4 font-bold text-center">Condición</th>
                  <th scope="col" className="p-4 font-bold text-center">Nota Final (1-10)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {alumnos.map((alumno) => (
                  <tr key={alumno.id} className="hover:bg-blue-50 transition-colors">
                    
                    <td className="p-4 font-semibold text-slate-600">
                      {alumno.id}
                    </td>
                    
                    <td className="p-4 font-bold text-slate-800">
                      {alumno.apellido}, {alumno.nombre}
                    </td>
                    
                    <td className="p-4 text-center">
                      {/* Label accesible, visualmente oculto mediante sr-only */}
                      <label htmlFor={`condicion-${alumno.id}`} className="sr-only">
                        Condición académica de {alumno.nombre}
                      </label>
                      <select 
                        id={`condicion-${alumno.id}`}
                        name={`condicion-${alumno.id}`}
                        defaultValue=""
                        required
                        className="border border-slate-300 rounded-md p-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-[150px]"
                      >
                        <option value="" disabled>Seleccionar...</option>
                        <option value="Aprobado">Aprobado</option>
                        <option value="Regular">Regular</option>
                        <option value="Libre">Libre</option>
                        <option value="Ausente">Ausente</option>
                      </select>
                    </td>
                    
                    <td className="p-4 text-center">
                      {/* Label accesible, vinculado al input por ID */}
                      <label htmlFor={`nota-${alumno.id}`} className="sr-only">
                        Nota final de {alumno.nombre}
                      </label>
                      <input 
                        type="number" 
                        id={`nota-${alumno.id}`}
                        name={`nota-${alumno.id}`}
                        min="1" 
                        max="10"
                        placeholder="Ej: 8"
                        className="border border-slate-300 rounded-md p-2 text-center text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
                      />
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer del formulario con botones de acción nativos */}
          <footer className="bg-slate-50 p-5 border-t border-slate-200 flex justify-end gap-4">
            <button 
              type="reset" 
              className="px-6 py-2 rounded-md font-bold text-slate-600 hover:bg-slate-200 transition-colors focus:ring-2 focus:ring-slate-400 focus:outline-none"
            >
              Limpiar
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 rounded-md font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            >
              Guardar Calificaciones
            </button>
          </footer>
        </form>
      </article>
    </section>
  );
}