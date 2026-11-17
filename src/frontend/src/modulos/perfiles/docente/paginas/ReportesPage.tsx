// Página responsable de permitir al docente generar y descargar reportes en formato PDF/Excel.

export default function ReportesPage() {
  // Función para manejar el evento de descarga simulada
  const handleDescargar = (event: React.FormEvent) => {
    event.preventDefault();
    alert("Generando y descargando el reporte seleccionado...");
  };

  return (
    <section className="perfil-pagina animate-fade-in">
      <header className="perfil-pagina-encabezado">
        <h1>Reportes y Planillas</h1>
        <p>Generá y descargá listados y actas de los seminarios que dictás.</p>
      </header>

      <article className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6 p-6">
        {/* Formulario accesible para la configuración del reporte */}
        <form onSubmit={handleDescargar} className="space-y-6">
          
          {/* Agrupación semántica de campos relacionados */}
          <fieldset className="border border-slate-200 p-5 rounded-md bg-slate-50">
            <legend className="text-sm font-bold text-slate-700 px-3 bg-slate-50 border border-slate-200 rounded-md">
              Configuración de Descarga
            </legend>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              
              <div className="flex flex-col">
                <label htmlFor="seminario" className="text-sm font-bold text-slate-700 mb-2">
                  Seleccionar Seminario <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <select 
                  id="seminario" 
                  name="seminario"
                  required
                  defaultValue=""
                  className="border border-slate-300 rounded-md p-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>Elegir seminario...</option>
                  <option value="metodologia">Metodología de la Investigación</option>
                  <option value="gestion">Gestión de Proyectos IT</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label htmlFor="tipoReporte" className="text-sm font-bold text-slate-700 mb-2">
                  Tipo de Planilla <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <select 
                  id="tipoReporte" 
                  name="tipoReporte"
                  required
                  defaultValue=""
                  className="border border-slate-300 rounded-md p-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>Elegir reporte...</option>
                  <option value="estudiantes">Listado de Estudiantes (PDF)</option>
                  <option value="asistencia">Planilla de Asistencia Vacía (PDF)</option>
                  <option value="acta">Acta de Calificaciones (Excel)</option>
                </select>
              </div>

            </div>
          </fieldset>

          <footer className="flex justify-end pt-2">
            <button 
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              ↓ Descargar Documento
            </button>
          </footer>

        </form>
      </article>
    </section>
  );
}