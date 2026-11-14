// Página responsable de listar y permitir la descarga de los certificados académicos del estudiante.

export default function CertificadosPage() {
  // Datos simulados (Mock) de los certificados
  const certificados = [
    { id: 1, tipo: "Certificado de Alumno Regular", fechaEmision: "2026-03-15", estado: "Disponible" },
    { id: 2, tipo: "Certificado Analítico Parcial", fechaEmision: "2026-08-20", estado: "Disponible" },
    { id: 3, tipo: "Constancia de Examen", fechaEmision: "2026-09-02", estado: "Disponible" },
    { id: 4, tipo: "Constancia de Título en Trámite", fechaEmision: "-", estado: "No Habilitado" }
  ];

  return (
    <section className="perfil-pagina animate-fade-in">
      <header className="perfil-pagina-encabezado">
        <h1>Certificados</h1>
        <p>Consultá y descargá tus certificados académicos en formato PDF.</p>
      </header>

      {/* Usamos una tabla semántica porque los requerimientos piden columnas estrictas de datos */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <header className="bg-slate-50 border-b border-slate-200 p-4">
          <h2 className="text-md font-bold text-slate-800">Mis Documentos</h2>
        </header>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
              <tr>
                <th scope="col" className="p-4 font-bold">Tipo de Certificado</th>
                <th scope="col" className="p-4 font-bold text-center">Fecha de Emisión</th>
                <th scope="col" className="p-4 font-bold text-center">Estado</th>
                <th scope="col" className="p-4 font-bold text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {certificados.map((cert) => (
                <tr key={cert.id} className="hover:bg-blue-50 transition-colors">
                  
                  <td className="p-4 font-semibold text-slate-700">
                    {cert.tipo}
                  </td>
                  
                  <td className="p-4 text-center font-medium text-slate-600">
                    {cert.fechaEmision !== "-" ? (
                      <time dateTime={cert.fechaEmision}>
                        {new Date(cert.fechaEmision).toLocaleDateString('es-AR')}
                      </time>
                    ) : (
                      <span aria-label="Sin fecha">-</span>
                    )}
                  </td>
                  
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      cert.estado === 'Disponible' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {cert.estado}
                    </span>
                  </td>
                  
                  <td className="p-4 text-center">
                    {/* Botón semántico con estados de habilitación */}
                    <button 
                      type="button"
                      disabled={cert.estado !== 'Disponible'}
                      className={`px-4 py-2 font-bold rounded-md transition-colors ${
                        cert.estado === 'Disponible'
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                      aria-label={
                        cert.estado === 'Disponible' 
                          ? `Descargar PDF de ${cert.tipo}` 
                          : `Descarga no disponible para ${cert.tipo}`
                      }
                    >
                      ↓ Descargar PDF
                    </button>
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