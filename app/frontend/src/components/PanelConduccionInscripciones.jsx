import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { legajoService } from '../services/legajoService';

/**
 * Estados oficiales del modelo RBAC de FastAPI (LegajoEstado)
 */
const ESTADOS_RBAC = [
  { value: 'BORRADOR', label: 'Borrador' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'ENVIADO', label: 'Enviado' },
  { value: 'EN_REVISION', label: 'En Revisión' },
  { value: 'OBSERVADO', label: 'Observado' },
  { value: 'APROBADO', label: 'Aprobado' },
  { value: 'RECHAZADO', label: 'Rechazado' },
];

/**
 * Remueve tildes y normaliza a minúsculas para búsquedas flexibles en español.
 */
function normalizarTexto(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Helpers de formateo según directivas de INTEGRACION_FRONTEND_LEGAJO_DESCRIPTIVO.md.
 * Renderiza el número de legajo como texto plano sin redirección a vistas mock pendientes.
 */
function renderNumeroLegajo(numeroLegajo) {
  if (!numeroLegajo) {
    return <span style={{ color: '#6c757d', fontStyle: 'italic', fontSize: '13px' }}>Se asigna al aprobar</span>;
  }
  return <span className="font-mono" style={{ fontWeight: '600' }}>{numeroLegajo}</span>;
}

function formatearNombreAlumno(item) {
  const nombreCompleto = `${item.nombre || ''} ${item.apellido || ''}`.trim();
  return nombreCompleto || (item.dni ? `DNI ${item.dni}` : 'Sin registrar');
}

function formatearPosgrado(cohorte) {
  return cohorte?.carrera || cohorte?.nombre || 'Posgrado no especificado';
}

function formatearCohorte(cohorte) {
  if (cohorte?.nombre) return cohorte.nombre;
  if (cohorte?.anio) return `Cohorte ${cohorte.anio}`;
  return '-';
}

function formatearFecha(fechaIso) {
  if (!fechaIso) return '-';
  try {
    const fecha = new Date(fechaIso);
    if (isNaN(fecha.getTime())) return '-';
    return fecha.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

function formatearTamanio(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatearTipoDoc(tipo) {
  const tipos = {
    DNI: 'Documento de Identidad (DNI)',
    TITULO_GRADO: 'Título Universitario de Grado',
    CV: 'Currículum Vitae',
    SOLICITUD_BECA: 'Formulario de Beca',
  };
  return tipos[tipo] || tipo;
}

function renderBadgeEstado(estado) {
  const estadoStr = String(estado || 'BORRADOR').toUpperCase();

  const clasesPorEstado = {
    APROBADO: 'badge-aprobada',
    ENVIADO: 'badge-pendiente',
    EN_REVISION: 'badge-pendiente',
    PENDIENTE: 'badge-pendiente',
    OBSERVADO: 'badge-rechazada',
    RECHAZADO: 'badge-rechazada',
    BORRADOR: 'badge-pendiente',
  };

  const labelsPorEstado = {
    BORRADOR: 'Borrador',
    PENDIENTE: 'Pendiente',
    ENVIADO: 'Enviado',
    EN_REVISION: 'En Revisión',
    OBSERVADO: 'Observado',
    APROBADO: 'Aprobado',
    RECHAZADO: 'Rechazado',
  };

  const claseCss = clasesPorEstado[estadoStr] || 'badge-pendiente';
  const label = labelsPorEstado[estadoStr] || estadoStr;

  return (
    <span className={`badge ${claseCss}`}>
      {label}
    </span>
  );
}

export const PanelConduccionInscripciones = () => {
  // ---------------------------------------------------------------------------
  // ESTADOS (State Management)
  // ---------------------------------------------------------------------------
  const [inscripciones, setInscripciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroPosgrado, setFiltroPosgrado] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');

  // Estado del modal de observación de legajo
  const [modalObservar, setModalObservar] = useState({
    open: false,
    legajo: null,
    motivo: '',
    submitting: false,
    error: null,
  });

  // Estado del modal de documentos del legajo (Auditoría PDF)
  const [modalDocs, setModalDocs] = useState({
    open: false,
    legajo: null,
    docs: [],
    cargando: false,
    error: null,
    descargandoId: null,
  });

  // Estado para prevenir doble clic y mostrar feedback de procesamiento en filas
  const [procesandoId, setProcesandoId] = useState(null);

  // Notificación tipo toast temporal para confirmar acciones realizadas
  const [toast, setToast] = useState(null);

  const mostrarToast = useCallback((mensaje, tipo = 'success') => {
    setToast({ mensaje, tipo });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  // ---------------------------------------------------------------------------
  // FUNCIÓN DE CARGA ASÍNCRONA (Reutilizable para reintentos)
  // ---------------------------------------------------------------------------
  const cargarLegajos = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      const data = await legajoService.obtenerLegajos({ pageSize: 100 });
      setInscripciones(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setError(err.message || 'Error al conectar con el servicio de legajos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarLegajos();
  }, [cargarLegajos]);

  // Extrae la lista única de posgrados devueltos por el backend para el filtro
  const opcionesPosgrados = useMemo(() => {
    const conjunto = new Set();
    inscripciones.forEach((item) => {
      const pos = formatearPosgrado(item.cohorte);
      if (pos && pos !== 'Posgrado no especificado') {
        conjunto.add(pos);
      }
    });
    return Array.from(conjunto);
  }, [inscripciones]);

  // ---------------------------------------------------------------------------
  // FILTRADO INTELIGENTE Y ACCESIBLE (Insensible a tildes)
  // ---------------------------------------------------------------------------
  const inscripcionesFiltradas = useMemo(() => {
    const query = normalizarTexto(busqueda);

    return inscripciones.filter((item) => {
      const nombreCompleto = normalizarTexto(formatearNombreAlumno(item));
      const legajoTexto = normalizarTexto(item.numero_legajo);
      const dniTexto = normalizarTexto(item.dni);

      const coincideTexto =
        query === '' ||
        nombreCompleto.includes(query) ||
        legajoTexto.includes(query) ||
        dniTexto.includes(query);

      const posgradoNombre = formatearPosgrado(item.cohorte);
      const coincidePosgrado = filtroPosgrado === 'Todos' || posgradoNombre === filtroPosgrado;

      const coincideEstado = filtroEstado === 'Todos' || String(item.estado).toUpperCase() === filtroEstado;

      return coincideTexto && coincidePosgrado && coincideEstado;
    });
  }, [inscripciones, busqueda, filtroPosgrado, filtroEstado]);

  // Handler para limpiar los filtros con un solo click
  const handleLimpiarFiltros = () => {
    setBusqueda('');
    setFiltroPosgrado('Todos');
    setFiltroEstado('Todos');
  };

  // ---------------------------------------------------------------------------
  // ACCIONES DE COORDINACIÓN (Módulo Core)
  // ---------------------------------------------------------------------------
  const handleAprobar = async (row) => {
    const nombre = formatearNombreAlumno(row);
    if (!window.confirm(`¿Está seguro de APROBAR el legajo de ${nombre}? Se emitirá el número de legajo definitivo.`)) {
      return;
    }

    try {
      setProcesandoId(row.id);
      const legajoActualizado = await legajoService.actualizarEstadoLegajo(row.id, 'APROBADO');
      setInscripciones((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, ...legajoActualizado, estado: 'APROBADO' } : item))
      );
      mostrarToast(`✓ Legajo de ${nombre} aprobado exitosamente. N° de legajo: ${legajoActualizado.numero_legajo || 'Asignado'}`, 'success');
    } catch (err) {
      alert(`Error al aprobar legajo: ${err.message}`);
    } finally {
      setProcesandoId(null);
    }
  };

  const handleRechazar = async (row) => {
    const nombre = formatearNombreAlumno(row);
    if (!window.confirm(`¿Está seguro de RECHAZAR la preinscripción de ${nombre}? Esta acción cerrará el trámite.`)) {
      return;
    }

    try {
      setProcesandoId(row.id);
      const legajoActualizado = await legajoService.actualizarEstadoLegajo(row.id, 'RECHAZADO');
      setInscripciones((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, ...legajoActualizado, estado: 'RECHAZADO' } : item))
      );
      mostrarToast(`✕ Se rechazó la preinscripción de ${nombre}.`, 'info');
    } catch (err) {
      alert(`Error al rechazar legajo: ${err.message}`);
    } finally {
      setProcesandoId(null);
    }
  };

  const handleAbrirModalObservar = (row) => {
    setModalObservar({
      open: true,
      legajo: row,
      motivo: row.motivo_observacion || '',
      submitting: false,
      error: null,
    });
  };

  const handleCerrarModalObservar = () => {
    if (modalObservar.submitting) return;
    setModalObservar({
      open: false,
      legajo: null,
      motivo: '',
      submitting: false,
      error: null,
    });
  };

  const handleGuardarObservacion = async (e) => {
    if (e) e.preventDefault();
    const motivoLimpio = modalObservar.motivo.trim();
    if (!motivoLimpio) {
      setModalObservar((prev) => ({
        ...prev,
        error: 'El motivo de la observación es obligatorio.',
      }));
      return;
    }

    try {
      setModalObservar((prev) => ({ ...prev, submitting: true, error: null }));
      const legajoActualizado = await legajoService.actualizarEstadoLegajo(
        modalObservar.legajo.id,
        'OBSERVADO',
        motivoLimpio
      );
      setInscripciones((prev) =>
        prev.map((item) =>
          item.id === modalObservar.legajo.id
            ? { ...item, ...legajoActualizado, estado: 'OBSERVADO', motivo_observacion: motivoLimpio }
            : item
        )
      );
      const nombreObs = formatearNombreAlumno(modalObservar.legajo);
      handleCerrarModalObservar();
      mostrarToast(`⚠ Preinscripción de ${nombreObs} observada correctamente.`, 'warning');
    } catch (err) {
      setModalObservar((prev) => ({
        ...prev,
        submitting: false,
        error: err.message || 'Error al registrar la observación del legajo.',
      }));
    }
  };

  const handleAbrirModalDocs = async (row) => {
    setModalDocs({
      open: true,
      legajo: row,
      docs: [],
      cargando: true,
      error: null,
      descargandoId: null,
    });

    try {
      const docs = await legajoService.obtenerDocumentosLegajo(row.id);
      setModalDocs((prev) => ({
        ...prev,
        docs: Array.isArray(docs) ? docs : [],
        cargando: false,
      }));
    } catch (err) {
      setModalDocs((prev) => ({
        ...prev,
        cargando: false,
        error: err.message || 'Error al obtener los documentos del legajo.',
      }));
    }
  };

  const handleCerrarModalDocs = () => {
    setModalDocs({
      open: false,
      legajo: null,
      docs: [],
      cargando: false,
      error: null,
      descargandoId: null,
    });
  };

  const handleDescargarDoc = async (doc) => {
    try {
      setModalDocs((prev) => ({ ...prev, descargandoId: doc.id }));
      await legajoService.descargarDocumento(doc.id, doc.nombre_original);
    } catch (err) {
      alert(`Error al descargar el archivo: ${err.message}`);
    } finally {
      setModalDocs((prev) => ({ ...prev, descargandoId: null }));
    }
  };

  const handleVerDoc = async (doc) => {
    try {
      setModalDocs((prev) => ({ ...prev, descargandoId: doc.id }));
      const url = await legajoService.obtenerUrlVisorDocumento(doc.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      alert(`Error al visualizar el archivo: ${err.message}`);
    } finally {
      setModalDocs((prev) => ({ ...prev, descargandoId: null }));
    }
  };

  return (
    <div className="panel-container">
      {/* Toast flotante de notificación de éxito/acción */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 2000,
            backgroundColor:
              toast.tipo === 'success'
                ? '#d1e7dd'
                : toast.tipo === 'warning'
                ? '#fff3cd'
                : toast.tipo === 'info'
                ? '#cff4fc'
                : '#f8d7da',
            color:
              toast.tipo === 'success'
                ? '#0f5132'
                : toast.tipo === 'warning'
                ? '#664d03'
                : toast.tipo === 'info'
                ? '#055160'
                : '#842029',
            border: `1px solid ${
              toast.tipo === 'success'
                ? '#badbcc'
                : toast.tipo === 'warning'
                ? '#ffecb5'
                : toast.tipo === 'info'
                ? '#b6effb'
                : '#f5c2c7'
            }`,
            borderRadius: '6px',
            padding: '12px 18px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '450px',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          <span>{toast.mensaje}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              color: 'inherit',
              padding: '0 4px',
              lineHeight: 1,
            }}
            aria-label="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      )}

      <header className="panel-header">
        <h2>Gestión de Inscripciones - Conducción</h2>
        <span className="badge-count" aria-live="polite">
          {cargando ? 'Cargando...' : `${inscripcionesFiltradas.length} resultados`}
        </span>
      </header>

      {/* Banner de error con botón de reintento */}
      {error && (
        <div 
          role="alert" 
          style={{
            backgroundColor: '#f8d7da',
            color: '#842029',
            border: '1px solid #f5c2c7',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '15px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span><strong>Aviso:</strong> {error}</span>
          <button 
            type="button" 
            className="btn-primary" 
            style={{ padding: '6px 14px', fontSize: '13px' }}
            onClick={cargarLegajos}
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="filtros-bar" role="search" aria-label="Filtros de inscripciones">
        <input
          type="text"
          className="input-search"
          placeholder="Buscar por alumno, DNI o legajo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar por alumno, DNI o legajo"
          disabled={cargando}
        />
        
        {/* Filtro dinámico de Posgrados */}
        <select 
          className="select-filter"
          value={filtroPosgrado} 
          onChange={(e) => setFiltroPosgrado(e.target.value)}
          aria-label="Filtrar por posgrado"
          disabled={cargando}
        >
          <option value="Todos">Todos los Posgrados</option>
          {opcionesPosgrados.map((posgrado) => (
            <option key={posgrado} value={posgrado}>{posgrado}</option>
          ))}
        </select>

        {/* Filtro con estados oficiales RBAC */}
        <select 
          className="select-filter"
          value={filtroEstado} 
          onChange={(e) => setFiltroEstado(e.target.value)}
          aria-label="Filtrar por estado"
          disabled={cargando}
        >
          <option value="Todos">Todos los Estados</option>
          {ESTADOS_RBAC.map((est) => (
            <option key={est.value} value={est.value}>{est.label}</option>
          ))}
        </select>

        <button 
          type="button" 
          className="btn-reset" 
          onClick={handleLimpiarFiltros}
          disabled={cargando || (!busqueda && filtroPosgrado === 'Todos' && filtroEstado === 'Todos')}
        >
          Resetear
        </button>
      </div>

      <div className="table-responsive" aria-busy={cargando}>
        <table className="tabla-custom">
          <thead>
            <tr>
              <th scope="col">Legajo</th>
              <th scope="col">Alumno</th>
              <th scope="col">Posgrado</th>
              <th scope="col">Cohorte</th>
              <th scope="col">Fecha</th>
              <th scope="col">Estado</th>
              <th scope="col" style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan="7" className="text-center" style={{ padding: '30px', color: '#6c757d' }}>
                  <p style={{ margin: 0, fontSize: '14px' }}>Cargando inscripciones desde el servidor...</p>
                </td>
              </tr>
            ) : inscripcionesFiltradas.length > 0 ? (
              inscripcionesFiltradas.map((row) => (
                <tr key={row.id}>
                  <td>{renderNumeroLegajo(row.numero_legajo)}</td>
                  <td className="font-semibold">{formatearNombreAlumno(row)}</td>
                  <td>{formatearPosgrado(row.cohorte)}</td>
                  <td>{formatearCohorte(row.cohorte)}</td>
                  <td>{formatearFecha(row.fecha_inscripcion || row.created_at)}</td>
                  <td>{renderBadgeEstado(row.estado)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        style={{
                          backgroundColor: '#0d6efd',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '5px 9px',
                          fontSize: '12px',
                          cursor: procesandoId === row.id ? 'not-allowed' : 'pointer',
                          fontWeight: '500',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          opacity: procesandoId === row.id ? 0.6 : 1,
                        }}
                        disabled={procesandoId === row.id}
                        onClick={() => handleAbrirModalDocs(row)}
                        title="Ver y auditar documentos PDF adjuntos"
                      >
                        📄 Docs
                      </button>

                      {procesandoId === row.id ? (
                        <span style={{ color: '#0d6efd', fontSize: '12px', fontWeight: '600', padding: '5px 8px' }}>
                          ⏳ Procesando...
                        </span>
                      ) : row.estado === 'APROBADO' ? (
                        <span style={{ color: '#198754', fontSize: '12px', fontWeight: 'bold' }}>
                          ✓ Aprobado
                        </span>
                      ) : row.estado === 'RECHAZADO' ? (
                        <span style={{ color: '#dc3545', fontSize: '12px', fontWeight: 'bold' }}>
                          ✕ Rechazado
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            style={{
                              backgroundColor: '#198754',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '5px 10px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: '500',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            onClick={() => handleAprobar(row)}
                            title="Aprobar legajo y emitir número oficial"
                          >
                            ✓ Aprobar
                          </button>
                          <button
                            type="button"
                            style={{
                              backgroundColor: '#ffc107',
                              color: '#212529',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '5px 10px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: '500',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            onClick={() => handleAbrirModalObservar(row)}
                            title="Observar legajo requiriendo corrección de documentación"
                          >
                            ⚠ Observar
                          </button>
                          <button
                            type="button"
                            style={{
                              backgroundColor: '#dc3545',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '5px 10px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: '500',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            onClick={() => handleRechazar(row)}
                            title="Rechazar trámite de legajo"
                          >
                            ✕ Rechazar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center empty-state">
                  {busqueda || filtroPosgrado !== 'Todos' || filtroEstado !== 'Todos'
                    ? 'No se encontraron inscripciones que coincidan con los filtros aplicados.'
                    : 'No hay inscripciones registradas en el sistema.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal accesible de Observación de Legajo */}
      {modalObservar.open && modalObservar.legajo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-observar-titulo"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '16px',
            backdropFilter: 'blur(2px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCerrarModalObservar();
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e9ecef',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 id="modal-observar-titulo" style={{ margin: 0, fontSize: '18px', color: '#856404', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠</span> Observar Preinscripción
              </h3>
              <button
                type="button"
                onClick={handleCerrarModalObservar}
                disabled={modalObservar.submitting}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '22px',
                  cursor: modalObservar.submitting ? 'not-allowed' : 'pointer',
                  color: '#6c757d',
                  lineHeight: 1,
                  padding: 0,
                }}
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarObservacion}>
              <div style={{ padding: '20px' }}>
                <p style={{ margin: '0 0 14px 0', fontSize: '14px', color: '#495057', lineHeight: '1.4' }}>
                  Indique los motivos por los cuales se observa el legajo de{' '}
                  <strong>{formatearNombreAlumno(modalObservar.legajo)}</strong> ({formatearPosgrado(modalObservar.legajo.cohorte)}).
                  El alumno deberá subsanar las observaciones indicadas.
                </p>

                {modalObservar.error && (
                  <div
                    role="alert"
                    style={{
                      backgroundColor: '#f8d7da',
                      color: '#842029',
                      border: '1px solid #f5c2c7',
                      borderRadius: '4px',
                      padding: '10px 14px',
                      marginBottom: '14px',
                      fontSize: '13px',
                    }}
                  >
                    {modalObservar.error}
                  </div>
                )}

                <label
                  htmlFor="motivo-observacion"
                  style={{ display: 'block', fontWeight: '600', fontSize: '13px', marginBottom: '6px', color: '#212529' }}
                >
                  Motivo de la observación <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <textarea
                  id="motivo-observacion"
                  rows={4}
                  maxLength={2000}
                  required
                  value={modalObservar.motivo}
                  onChange={(e) =>
                    setModalObservar((prev) => ({ ...prev, motivo: e.target.value, error: null }))
                  }
                  placeholder="Ej: El archivo del título no es legible / Falta adjuntar frente y dorso del DNI..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                  disabled={modalObservar.submitting}
                  autoFocus
                />
                <div style={{ textAlign: 'right', fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                  {modalObservar.motivo.length} / 2000 caracteres
                </div>
              </div>

              <div
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#f8f9fa',
                  borderTop: '1px solid #e9ecef',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={handleCerrarModalObservar}
                  disabled={modalObservar.submitting}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ced4da',
                    backgroundColor: '#fff',
                    borderRadius: '4px',
                    cursor: modalObservar.submitting ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    color: '#495057',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalObservar.submitting || !modalObservar.motivo.trim()}
                  style={{
                    padding: '8px 18px',
                    border: 'none',
                    backgroundColor: modalObservar.submitting || !modalObservar.motivo.trim() ? '#ffd868' : '#ffc107',
                    color: '#212529',
                    fontWeight: '600',
                    borderRadius: '4px',
                    cursor: modalObservar.submitting || !modalObservar.motivo.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {modalObservar.submitting ? 'Guardando...' : 'Guardar Observación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Auditoría Documental de PDFs */}
      {modalDocs.open && modalDocs.legajo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-docs-titulo"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '16px',
            backdropFilter: 'blur(2px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCerrarModalDocs();
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              maxWidth: '700px',
              width: '100%',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e9ecef',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8f9fa',
              }}
            >
              <h3 id="modal-docs-titulo" style={{ margin: 0, fontSize: '18px', color: '#0d6efd', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📄</span> Documentación Adjunta del Legajo
              </h3>
              <button
                type="button"
                onClick={handleCerrarModalDocs}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '22px',
                  cursor: 'pointer',
                  color: '#6c757d',
                  lineHeight: 1,
                  padding: 0,
                }}
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto' }}>
              <div style={{ marginBottom: '16px', fontSize: '14px', color: '#495057', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div><strong>Aspirante:</strong> {formatearNombreAlumno(modalDocs.legajo)}</div>
                <div><strong>DNI:</strong> {modalDocs.legajo.dni || 'Sin registrar'}</div>
                <div><strong>Carrera:</strong> {formatearPosgrado(modalDocs.legajo.cohorte)}</div>
                <div><strong>Cohorte:</strong> {formatearCohorte(modalDocs.legajo.cohorte)}</div>
              </div>

              {modalDocs.cargando ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#6c757d' }}>
                  <p style={{ margin: 0 }}>Cargando documentos desde el repositorio seguro...</p>
                </div>
              ) : modalDocs.error ? (
                <div
                  role="alert"
                  style={{
                    backgroundColor: '#f8d7da',
                    color: '#842029',
                    border: '1px solid #f5c2c7',
                    borderRadius: '4px',
                    padding: '12px 16px',
                    fontSize: '14px',
                  }}
                >
                  {modalDocs.error}
                </div>
              ) : modalDocs.docs.length === 0 ? (
                <div
                  style={{
                    backgroundColor: '#fff3cd',
                    color: '#856404',
                    border: '1px solid #ffeeba',
                    borderRadius: '4px',
                    padding: '16px',
                    textAlign: 'center',
                    fontSize: '14px',
                  }}
                >
                  Este aspirante aún no tiene archivos PDF adjuntos subidos al legajo digital.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f3f5', borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px' }}>Tipo</th>
                      <th style={{ padding: '8px 10px' }}>Archivo Original</th>
                      <th style={{ padding: '8px 10px' }}>Tamaño</th>
                      <th style={{ padding: '8px 10px' }}>Fecha</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalDocs.docs.map((doc) => (
                      <tr key={doc.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <td style={{ padding: '8px 10px', fontWeight: '600' }}>
                          {formatearTipoDoc(doc.tipo)}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#495057' }}>
                          {doc.nombre_original || 'documento.pdf'}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#6c757d' }}>
                          {formatearTamanio(doc.tamanio_bytes)}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#6c757d' }}>
                          {formatearFecha(doc.fecha_subida)}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleVerDoc(doc)}
                              disabled={modalDocs.descargandoId === doc.id}
                              style={{
                                backgroundColor: '#0d6efd',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                cursor: modalDocs.descargandoId === doc.id ? 'wait' : 'pointer',
                                fontWeight: '500',
                              }}
                              title="Abrir visor de PDF en pestaña nueva"
                            >
                              👁 Ver
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDescargarDoc(doc)}
                              disabled={modalDocs.descargandoId === doc.id}
                              style={{
                                backgroundColor: '#198754',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                cursor: modalDocs.descargandoId === doc.id ? 'wait' : 'pointer',
                                fontWeight: '500',
                              }}
                              title="Descargar archivo PDF binario"
                            >
                              ⬇ Bajar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div
              style={{
                padding: '12px 20px',
                backgroundColor: '#f8f9fa',
                borderTop: '1px solid #e9ecef',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={handleCerrarModalDocs}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ced4da',
                  backgroundColor: '#fff',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#495057',
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
