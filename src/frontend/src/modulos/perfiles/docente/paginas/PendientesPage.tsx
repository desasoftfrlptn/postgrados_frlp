// Página responsable de mostrar al docente sus tareas administrativas pendientes (alertas).

import { Link } from "react-router-dom";

export default function PendientesPage() {
  // Datos simulados (Mock) de cargas pendientes
  const pendientes = [
    { 
      id: 1, 
      tipo: "Asistencia", 
      seminario: "Metodología de la Investigación", 
      fechaLimite: "2026-05-18", 
      estado: "Vencido",
      ruta: "/dashboard/docente/asistencia"
    },
    { 
      id: 2, 
      tipo: "Acta de Cierre", 
      seminario: "Gestión de Proyectos IT", 
      fechaLimite: "2026-06-15", 
      estado: "Pendiente",
      ruta: "/dashboard/docente/calificaciones"
    }
  ];

  return (
    <section className="perfil-pagina animate-fade-in">
      <header className="perfil-pagina-encabezado">
        <h1>Cargas Pendientes</h1>
        <p>Revisá y completá las actas y asistencias que requieren tu atención urgente.</p>
      </header>

      {/* Tabla semántica estructurada para mostrar tareas organizadas por columnas */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
        <header className="bg-slate-50 border-b border-slate-200 p-4">
          <h2 className="text-md font-bold text-slate-800">Tareas Requeridas</h2>
        </header>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
              <tr>
                <th scope="col" className="p-4 font-bold">Tipo de Carga</th>
                <th scope="col" className="p-4 font-bold">Seminario</th>
                <th scope="col" className="p-4 font-bold text-center">Fecha Límite</th>
                <th scope="col" className="p-4 font-bold text-center">Estado</th>
                <th scope="col" className="p-4 font-bold text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {pendientes.map((tarea) => (
                <tr key={tarea.id} className="hover:bg-blue-50 transition-colors">
                  
                  <td className="p-4 font-semibold text-slate-700">
                    {tarea.tipo}
                  </td>
                  
                  <td className="p-4 font-medium text-slate-600">
                    {tarea.seminario}
                  </td>
                  
                  <td className="p-4 text-center font-medium text-slate-600">
                    <time dateTime={tarea.fechaLimite}>
                      {new Date(tarea.fechaLimite).toLocaleDateString('es-AR')}
                    </time>
                  </td>
                  
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      tarea.estado === 'Vencido' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {tarea.estado}
                    </span>
                  </td>
                  
                  <td className="p-4 text-center">
                    {/* Botón semántico de enrutamiento con contexto de accesibilidad */}
                    <Link 
                      to={tarea.ruta}
                      className="inline-block px-4 py-2 font-bold rounded-md transition-colors bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                      aria-label={`Completar ${tarea.tipo} de ${tarea.seminario}`}
                    >
                      Ir a Cargar →
                    </Link>
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