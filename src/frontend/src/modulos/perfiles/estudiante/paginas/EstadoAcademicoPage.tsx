// Página responsable de mostrar el historial académico y avance del estudiante.

export default function EstadoAcademicoPage() {
  // Base de datos simulada (Mock) con estructura en español
  const seminarios = [
    { id: 1, nombre: "Metodología de la Investigación", condicion: "Aprobado", asistencia: 100, nota: 9 },
    { id: 2, nombre: "Gestión de Proyectos", condicion: "En Curso", asistencia: 85, nota: "-" },
    { id: 3, nombre: "Arquitectura de Software", condicion: "Aprobado", asistencia: 90, nota: 8 },
    { id: 4, nombre: "Seguridad Informática", condicion: "Libre", asistencia: 30, nota: 2 },
  ];

  return (
    <section className="perfil-pagina animate-fade-in">
      <header className="perfil-pagina-encabezado">
        <h1>Estado Académico</h1>
        <p>Consultá el estado académico y el avance del posgrado.</p>
      </header>

      {/* Tarjeta de resumen de avance */}
      <article className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <header className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">Avance de la Carrera</h2>
          <span className="text-3xl font-extrabold text-blue-600">40%</span>
        </header>
        
        {/* Barra de progreso con accesibilidad */}
        <div 
          className="w-full bg-slate-100 rounded-full h-4 shadow-inner overflow-hidden" 
          role="progressbar" 
          aria-valuenow={40} 
          aria-valuemin={0} 
          aria-valuemax={100}
          aria-label="Progreso de graduación"
        >
          <div 
            className="bg-blue-600 h-4 rounded-full transition-all duration-1000" 
            style={{ width: '40%' }}
          ></div>
        </div>
        <p className="text-sm text-slate-500 mt-4 font-medium">
          Te faltan 6 seminarios y la tesis para graduarte.
        </p>
      </article>

      {/* Tabla del historial de seminarios */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <header className="bg-slate-50 border-b border-slate-200 p-4">
          <h2 className="text-md font-bold text-slate-800">Historial de Seminarios</h2>
        </header>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
              <tr>
                <th scope="col" className="p-4 font-bold">Seminario</th>
                <th scope="col" className="p-4 font-bold text-center w-32">Asistencia</th>
                <th scope="col" className="p-4 font-bold text-center w-32">Condición</th>
                <th scope="col" className="p-4 font-bold text-center w-32">Nota Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {seminarios.map((seminario) => (
                <tr key={seminario.id} className="hover:bg-blue-50 transition-colors">
                  <td className="p-4 font-semibold text-slate-700">
                    {seminario.nombre}
                  </td>
                  
                  <td className="p-4 text-center font-medium text-slate-600">
                    {seminario.asistencia}%
                  </td>
                  
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      seminario.condicion === 'Aprobado' ? 'bg-emerald-100 text-emerald-700' :
                      seminario.condicion === 'En Curso' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {seminario.condicion}
                    </span>
                  </td>
                  
                  <td className={`p-4 text-center font-extrabold text-base ${
                    seminario.nota === "-" ? 'text-slate-400' : 
                    (typeof seminario.nota === 'number' && seminario.nota >= 7) ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {seminario.nota}
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
