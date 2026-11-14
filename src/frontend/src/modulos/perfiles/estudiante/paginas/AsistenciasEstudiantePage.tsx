// Página responsable de mostrar el registro detallado de asistencias del estudiante.

export default function AsistenciasEstudiantePage() {
  // Datos simulados (Mock) del registro de asistencias clase por clase
  const historialAsistencias = [
    { id: 1, seminario: "Metodología de la Investigación", fecha: "2026-05-17", presente: true, porcentajeAcumulado: 100 },
    { id: 2, seminario: "Metodología de la Investigación", fecha: "2026-05-24", presente: false, porcentajeAcumulado: 50 },
    { id: 3, seminario: "Gestión de Proyectos", fecha: "2026-05-31", presente: true, porcentajeAcumulado: 100 },
    { id: 4, seminario: "Gestión de Proyectos", fecha: "2026-06-07", presente: true, porcentajeAcumulado: 100 },
  ];

  return (
    <section className="perfil-pagina animate-fade-in">
      <header className="perfil-pagina-encabezado">
        <h1>Asistencias</h1>
        <p>Consultá tu registro de presentismo y el porcentaje acumulado por materia.</p>
      </header>

      {/* Tabla semántica para el registro de asistencias */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <header className="bg-slate-50 border-b border-slate-200 p-4">
          <h2 className="text-md font-bold text-slate-800">Registro de Clases</h2>
        </header>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
              <tr>
                <th scope="col" className="p-4 font-bold">Seminario</th>
                <th scope="col" className="p-4 font-bold text-center">Fecha</th>
                <th scope="col" className="p-4 font-bold text-center">Estado</th>
                <th scope="col" className="p-4 font-bold text-center">Asistencia Acumulada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {historialAsistencias.map((registro) => (
                <tr key={registro.id} className="hover:bg-blue-50 transition-colors">
                  
                  <td className="p-4 font-semibold text-slate-700">
                    {registro.seminario}
                  </td>
                  
                  <td className="p-4 text-center font-medium text-slate-600">
                    <time dateTime={registro.fecha}>
                      {new Date(registro.fecha).toLocaleDateString('es-AR')}
                    </time>
                  </td>
                  
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center justify-center w-28 mx-auto ${
                      registro.presente
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {/* Icono decorativo oculto para lectores de pantalla */}
                      <span aria-hidden="true" className="mr-1">
                        {registro.presente ? '✔' : '✖'}
                      </span>
                      {registro.presente ? 'Presente' : 'Ausente'}
                    </span>
                  </td>
                  
                  <td className="p-4 text-center font-bold text-slate-800">
                    {registro.porcentajeAcumulado}%
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