// Página responsable de mostrar al docente los seminarios que tiene asignados en el ciclo lectivo actual.

import { Link } from "react-router-dom";

export default function MisSeminariosPage() {
  // Datos simulados (Mock) de los seminarios asignados al docente
  const seminarios = [
    { 
      id: "SEM-401", 
      nombre: "Metodología de la Investigación", 
      carrera: "Maestría en Ingeniería en Sistemas de Información", 
      cohorte: "2026", 
      fechaInicio: "2026-03-01", 
      fechaFin: "2026-07-15" 
    },
    { 
      id: "SEM-405", 
      nombre: "Gestión de Proyectos IT", 
      carrera: "Especialización en Gestión de TIC", 
      cohorte: "2026", 
      fechaInicio: "2026-08-01", 
      fechaFin: "2026-11-30" 
    }
  ];

  return (
    <section className="perfil-pagina animate-fade-in">
      <header className="perfil-pagina-encabezado">
        <h1>Mis Seminarios</h1>
        <p>Consultá el detalle de los seminarios que tenés asignados para dictar este ciclo.</p>
      </header>

      {/* Uso de CSS Grid para distribuir las tarjetas de forma responsiva */}
      <ul className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {seminarios.map((seminario) => (
          <li key={seminario.id}>
            
            {/* Artículo semántico para cada seminario (tarjeta) */}
            <article className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col hover:shadow-md transition-shadow">
              
              <header className="bg-blue-50 border-b border-slate-200 p-5 rounded-t-xl">
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-1 rounded">
                    {seminario.id}
                  </span>
                  <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded">
                    Cohorte {seminario.cohorte}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-blue-900 leading-tight">
                  {seminario.nombre}
                </h2>
                <p className="text-sm font-medium text-blue-700 mt-1">
                  {seminario.carrera}
                </p>
              </header>
              
              {/* Contenido flexible que empuja el footer hacia abajo */}
              <div className="p-5 flex-grow flex flex-col justify-between">
                
                {/* Lista de definición para las fechas */}
                <dl className="mb-6">
                  <div className="flex flex-col mb-3">
                    <dt className="text-xs font-bold text-slate-500 uppercase">Período de dictado</dt>
                    <dd className="text-sm font-medium text-slate-800 mt-1">
                      Desde <time dateTime={seminario.fechaInicio}>{new Date(seminario.fechaInicio).toLocaleDateString('es-AR')}</time> 
                      {" "}hasta <time dateTime={seminario.fechaFin}>{new Date(seminario.fechaFin).toLocaleDateString('es-AR')}</time>
                    </dd>
                  </div>
                </dl>
                
                {/* Footer semántico con las acciones (Navegación con React Router) */}
                <footer className="grid grid-cols-2 gap-3 mt-auto">
                  <Link 
                    to="/dashboard/docente/asistencia" 
                    className="text-center py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition-colors text-sm"
                  >
                    Pasar Asistencia
                  </Link>
                  <Link 
                    to="/dashboard/docente/calificaciones" 
                    className="text-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-sm"
                  >
                    Cargar Notas
                  </Link>
                </footer>

              </div>
            </article>
            
          </li>
        ))}
      </ul>
    </section>
  );
}