import React, { useState, useEffect, useCallback } from 'react';
import { legajoService } from '../services/legajoService';

/**
 * Mapeo de colores y textos descriptivos para el semáforo y estado del estudiante.
 */
function resolverSemaforo(estudiante) {
  if (estudiante?.semaforo) {
    const sem = estudiante.semaforo.toUpperCase();
    if (sem === 'VERDE') return { color: 'green', texto: 'VERDE (Vigente)', alertColor: '#28a745' };
    if (sem === 'AMARILLO') return { color: 'yellow', texto: 'AMARILLO (En Plazo)', alertColor: '#ffc107' };
    if (sem === 'ROJO') return { color: 'red', texto: 'ROJO (Riesgo Académico)', alertColor: '#dc3545' };
  }

  // Si no está fijado el semáforo, inferir a partir del estado de trámite
  const estado = estudiante?.estado;
  if (['APROBADO', 'ACTIVO', 'COMPLETADO', 'GRADUADO'].includes(estado)) {
    return { color: 'green', texto: 'VIGENTE (Activo)', alertColor: '#28a745' };
  }
  if (['OBSERVADO', 'EN_REVISION', 'PENDIENTE', 'BORRADOR'].includes(estado)) {
    return { color: 'yellow', texto: 'REGULAR (En Trámite)', alertColor: '#e0a800' };
  }
  if (['RECHAZADO', 'BAJA', 'VENCIDO'].includes(estado)) {
    return { color: 'red', texto: 'EXCEDIDO (Baja/Rechazado)', alertColor: '#dc3545' };
  }

  return { color: 'yellow', texto: 'REGULAR', alertColor: '#ffc107' };
}

/**
 * Resuelve el mensaje de alerta académica para el expediente del estudiante.
 */
function resolverAlertaAcademica(estudiante) {
  if (!estudiante) return 'Sin datos de expediente.';

  switch (estudiante.estado) {
    case 'OBSERVADO':
      return `⚠️ Alerta: Legajo observado por el equipo de coordinación. Motivo: "${estudiante.motivo_observacion || 'Documentación incompleta o no legible.'}"`;
    case 'RECHAZADO':
      return `⛔ Alerta: Postulación rechazada por la comisión de posgrado. Motivo: "${estudiante.motivo_observacion || 'No cumple los requisitos mínimos de admisión.'}"`;
    case 'PENDIENTE':
      return 'ℹ️ Trámite en espera: El aspirante completó la preinscripción y aguarda revisión documental.';
    case 'EN_REVISION':
      return '🔍 Trámite en proceso: La documentación del aspirante está siendo auditada.';
    case 'APROBADO':
    case 'ACTIVO':
      return '✅ Sin alertas pendientes: Estudiante regular admitido con legajo oficial vigente.';
    case 'COMPLETADO':
      return '📋 Sin alertas: Requisitos formales completos a la espera del ciclo de cursada.';
    case 'BAJA':
      return '🚫 Legajo dado de baja en el sistema de posgrado.';
    case 'VENCIDO':
      return '⌛ Reserva de vacante vencida por límite reglamentario.';
    default:
      return 'Sin alertas académicas pendientes registradas.';
  }
}

function formatearFecha(fechaIso) {
  if (!fechaIso) return '—';
  try {
    const d = new Date(fechaIso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

export default function PanelConduccionEstudiante({ legajoInicial }) {
  const [tab, setTab] = useState('documentacion');
  const [busqueda, setBusqueda] = useState(legajoInicial || '');
  const [errorBusqueda, setErrorBusqueda] = useState('');

  // Estados de datos reales
  const [estudiantes, setEstudiantes] = useState([]);
  const [estudianteActual, setEstudianteActual] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  // Documentos adjuntos reales del estudiante seleccionado
  const [documentos, setDocumentos] = useState([]);
  const [cargandoDocumentos, setCargandoDocumentos] = useState(false);
  const [descargandoId, setDescargandoId] = useState(null);

  // 1. Cargar estudiantes reales desde la API de legajos
  const cargarEstudiantes = useCallback(async () => {
    try {
      setCargando(true);
      setErrorCarga('');
      const data = await legajoService.obtenerLegajos({ pageSize: 100 });
      const items = data.items || [];
      setEstudiantes(items);

      if (items.length > 0) {
        // Si nos pasaron un legajoInicial, buscar ese
        if (legajoInicial) {
          const match = items.find(
            (e) =>
              e.numero_legajo === legajoInicial ||
              e.id === legajoInicial ||
              e.dni === legajoInicial
          );
          setEstudianteActual(match || items[0]);
        } else {
          setEstudianteActual(items[0]);
        }
      }
    } catch (err) {
      console.error('Error al cargar estudiantes:', err);
      setErrorCarga('No se pudieron recuperar los estudiantes desde el servidor de Posgrados.');
    } finally {
      setCargando(false);
    }
  }, [legajoInicial]);

  useEffect(() => {
    cargarEstudiantes();
  }, [cargarEstudiantes]);

  // 2. Cargar documentos reales cada vez que cambia el estudiante actual
  useEffect(() => {
    if (!estudianteActual?.id) {
      setDocumentos([]);
      return;
    }

    let isMounted = true;
    const cargarDocumentos = async () => {
      try {
        setCargandoDocumentos(true);
        const docs = await legajoService.obtenerDocumentosLegajo(estudianteActual.id);
        if (isMounted) {
          setDocumentos(Array.isArray(docs) ? docs : []);
        }
      } catch (err) {
        console.error('Error al cargar documentos del estudiante:', err);
        if (isMounted) setDocumentos([]);
      } finally {
        if (isMounted) setCargandoDocumentos(false);
      }
    };

    cargarDocumentos();

    return () => {
      isMounted = false;
    };
  }, [estudianteActual]);

  // Manejo de búsqueda por N° Legajo, DNI o Nombre
  const handleSearch = () => {
    const query = busqueda.trim().toLowerCase();
    if (!query) {
      setErrorBusqueda('Ingrese un término de búsqueda (Legajo, DNI o Apellido).');
      return;
    }

    const encontrado = estudiantes.find((e) => {
      const legajo = (e.numero_legajo || '').toLowerCase();
      const dni = (e.dni || '').toLowerCase();
      const nombreCompleto = `${e.nombre || ''} ${e.apellido || ''}`.toLowerCase();
      const email = (e.email || '').toLowerCase();

      return (
        legajo === query ||
        dni === query ||
        nombreCompleto.includes(query) ||
        email.includes(query)
      );
    });

    if (encontrado) {
      setEstudianteActual(encontrado);
      setErrorBusqueda('');
    } else {
      setErrorBusqueda(`No se encontró ningún estudiante con "${busqueda}".`);
    }
  };

  // Descarga de archivo PDF real
  const handleDescargarDocumento = async (doc) => {
    try {
      setDescargandoId(doc.id);
      await legajoService.descargarDocumento(doc.id, doc.nombre_original || `${doc.tipo}.pdf`);
    } catch (err) {
      alert(`No se pudo descargar el documento: ${err.message}`);
    } finally {
      setDescargandoId(null);
    }
  };

  // Porcentaje de completitud de legajo (sobre base de 4 docs obligatorios estándar)
  const totalRequeridos = 4;
  const docsSubidosCount = documentos.length;
  const legajoPorcentaje = Math.min(100, Math.round((docsSubidosCount / totalRequeridos) * 100));

  const semaforoInfo = resolverSemaforo(estudianteActual);
  const alertaTexto = resolverAlertaAcademica(estudianteActual);

  if (cargando) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '8px' }}>
        <p style={{ color: '#00539C', fontWeight: 'bold' }}>⏳ Cargando expediente de estudiantes desde el sistema...</p>
      </div>
    );
  }

  if (errorCarga) {
    return (
      <div style={{ padding: '30px', background: '#f8d7da', color: '#842029', borderRadius: '8px' }}>
        <h3>Error de conexión</h3>
        <p>{errorCarga}</p>
        <button className="btn-secondary" onClick={cargarEstudiantes} style={{ marginTop: '10px' }}>
          🔄 Reintentar
        </button>
      </div>
    );
  }

  if (estudiantes.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '8px', border: '1px solid #ccc' }}>
        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📭</div>
        <h3 style={{ color: '#002B49' }}>No hay expedientes registrados aún</h3>
        <p style={{ color: '#666', maxWidth: '500px', margin: '10px auto' }}>
          Los legajos de los aspirantes y estudiantes aparecerán aquí a medida que se completen las preinscripciones o se admitan nuevas cohortes.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Barra de Búsqueda y Selector Rápido */}
      <div
        style={{
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          background: '#e9ecef',
          padding: '15px 20px',
          borderRadius: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 300px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap' }}>
            Buscar Estudiante:
          </label>
          <input
            type="text"
            placeholder="N° Legajo, DNI o Nombre..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setErrorBusqueda('');
            }}
            className={`form-control ${errorBusqueda ? 'error' : ''}`}
            style={{ background: 'white', flex: 1 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
          />
          <button className="btn-primary" style={{ width: 'auto', whiteSpace: 'nowrap' }} onClick={handleSearch}>
            🔍 Buscar
          </button>
        </div>

        {/* Selector directo de lista de estudiantes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 300px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap' }}>
            O seleccionar:
          </label>
          <select
            className="form-control"
            style={{ background: 'white', flex: 1 }}
            value={estudianteActual?.id || ''}
            onChange={(e) => {
              const sel = estudiantes.find((it) => it.id === e.target.value);
              if (sel) {
                setEstudianteActual(sel);
                setErrorBusqueda('');
              }
            }}
          >
            {estudiantes.map((est) => (
              <option key={est.id} value={est.id}>
                {est.apellido}, {est.nombre} — {est.numero_legajo || 'Sin Legajo'} ({est.cohorte?.carrera || 'Carrera'})
              </option>
            ))}
          </select>
        </div>

        {errorBusqueda && (
          <div style={{ width: '100%', color: '#dc3545', fontSize: '13px', fontWeight: 'bold', marginTop: '4px' }}>
            {errorBusqueda}
          </div>
        )}
      </div>

      {estudianteActual && (
        <>
          {/* Cabecera del Perfil con Datos Reales */}
          <div className="profile-header">
            <div className="profile-info">
              <div className="avatar">👤</div>
              <div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '5px', color: '#002B49' }}>
                  {estudianteActual.apellido}, {estudianteActual.nombre}
                </h3>
                <p style={{ color: '#495057', margin: '4px 0', fontSize: '14px' }}>
                  <strong>Legajo:</strong>{' '}
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                    {estudianteActual.numero_legajo || 'Pendiente de asignación'}
                  </span>
                  &nbsp;&nbsp;|&nbsp;&nbsp;
                  <strong>DNI:</strong> {estudianteActual.dni || 'Sin registrar'}
                  &nbsp;&nbsp;|&nbsp;&nbsp;
                  <strong>Cohorte:</strong> {estudianteActual.cohorte?.nombre || `Cohorte ${estudianteActual.cohorte?.anio || '—'}`}
                </p>
                <p style={{ color: '#666', margin: '2px 0', fontSize: '13px' }}>
                  <strong>Carrera:</strong> {estudianteActual.cohorte?.carrera || 'Programa no especificado'}
                  {estudianteActual.cohorte?.codigo_carrera && ` (${estudianteActual.cohorte.codigo_carrera})`}
                </p>
                <p style={{ color: '#666', margin: '2px 0', fontSize: '13px' }}>
                  <strong>Email:</strong> {estudianteActual.email}
                </p>
              </div>
            </div>

            <div className="status-indicators">
              <div>
                <p><strong>INDICADORES</strong></p>
                <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px' }}>Estado Académico</p>
                <div style={{ display: 'flex', gap: '15px', marginTop: '5px', justifyContent: 'center' }}>
                  <div><div className="circle-status green"></div><span style={{ fontSize: '11px', fontWeight: 'bold' }}>Vigente</span></div>
                  <div><div className="circle-status yellow"></div><span style={{ fontSize: '11px', fontWeight: 'bold' }}>Alerta</span></div>
                  <div><div className="circle-status red"></div><span style={{ fontSize: '11px', fontWeight: 'bold' }}>Riesgo</span></div>
                </div>
              </div>
              <div style={{ background: '#f8f9fa', padding: '15px 24px', borderRadius: '8px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                <p style={{ margin: 0, fontSize: '12px' }}><strong>ESTADO DEL TRÁMITE</strong></p>
                <div className={`circle-status ${semaforoInfo.color}`} style={{ margin: '8px auto', width: '34px', height: '34px' }}></div>
                <strong style={{ color: semaforoInfo.alertColor, fontSize: '1.1rem' }}>
                  {estudianteActual.estado}
                </strong>
                <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '2px' }}>
                  {semaforoInfo.texto}
                </div>
              </div>
            </div>
          </div>

          {/* Alertas Académicas y Barra de Completitud de Documentos */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: '2 1 400px', background: 'white', padding: '18px 20px', borderRadius: '8px', border: '1px solid #ccc' }}>
              <h3 style={{ marginBottom: '10px', fontSize: '1.1rem', color: '#002B49' }}>
                Alertas Académicas y Notificaciones
              </h3>
              <div
                className="alerta-box"
                style={{
                  background: semaforoInfo.color === 'green' ? '#198754' : (semaforoInfo.color === 'yellow' ? '#fd7e14' : '#dc3545'),
                  lineHeight: '1.4',
                  fontSize: '14px',
                  fontWeight: '600',
                  margin: 0,
                }}
              >
                {alertaTexto}
              </div>
            </div>

            <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'white', padding: '18px 20px', borderRadius: '8px', border: '1px solid #ccc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>
                <span>Auditoría de Legajo</span>
                <strong style={{ color: legajoPorcentaje === 100 ? '#198754' : '#fd7e14' }}>
                  {legajoPorcentaje === 100 ? 'COMPLETO (100%)' : `${legajoPorcentaje}% (${docsSubidosCount}/${totalRequeridos} docs)`}
                </strong>
              </div>
              <div style={{ height: '14px', background: '#e9ecef', borderRadius: '10px', width: '100%', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '14px',
                    background: legajoPorcentaje === 100 ? '#198754' : '#fd7e14',
                    borderRadius: '10px',
                    width: `${legajoPorcentaje}%`,
                    transition: 'width 0.4s ease',
                  }}
                ></div>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#6c757d' }}>
                {docsSubidosCount} de {totalRequeridos} documentos obligatorios verificados en el repositorio digital.
              </p>
            </div>
          </div>

          {/* Solapas de Contenido: Documentación y Ficha Académica */}
          <div style={{ marginTop: '20px' }}>
            <div className="tabs">
              <div
                className={`tab ${tab === 'documentacion' ? 'active' : ''}`}
                onClick={() => setTab('documentacion')}
              >
                📁 Documentación Digital ({documentos.length})
              </div>
              <div
                className={`tab ${tab === 'academico' ? 'active' : ''}`}
                onClick={() => setTab('academico')}
              >
                🎓 Ficha Académica y Posgrado
              </div>
            </div>

            {tab === 'documentacion' ? (
              <div style={{ background: '#f9f9f9', border: '1px solid #ccc', borderTop: 'none', padding: '20px', borderRadius: '0 0 8px 8px' }}>
                <h4 style={{ margin: '0 0 14px 0', color: '#002B49' }}>Documentos PDF Adjuntados al Legajo</h4>

                {cargandoDocumentos ? (
                  <p style={{ color: '#00539C', fontStyle: 'italic' }}>⏳ Cargando archivos adjuntos...</p>
                ) : documentos.length === 0 ? (
                  <div style={{ padding: '25px', textAlign: 'center', background: 'white', borderRadius: '6px', border: '1px dashed #ced4da' }}>
                    <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                      El aspirante aún no ha cargado documentos PDF en este expediente.
                    </p>
                  </div>
                ) : (
                  <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse', border: '1px solid #dee2e6' }}>
                    <thead style={{ background: '#e9ecef', textAlign: 'left' }}>
                      <tr>
                        <th style={{ padding: '10px 14px', fontSize: '13px' }}>Tipo de Documento</th>
                        <th style={{ padding: '10px 14px', fontSize: '13px' }}>Nombre del Archivo</th>
                        <th style={{ padding: '10px 14px', fontSize: '13px' }}>Tamaño</th>
                        <th style={{ padding: '10px 14px', fontSize: '13px' }}>Fecha Subida</th>
                        <th style={{ padding: '10px 14px', fontSize: '13px', textAlign: 'right' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documentos.map((doc) => (
                        <tr key={doc.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                          <td style={{ padding: '10px 14px', fontWeight: '600', fontSize: '13px' }}>
                            📄 {doc.tipo || 'DOCUMENTO'}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: '13px', color: '#495057' }}>
                            {doc.nombre_original || 'documento.pdf'}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: '12px', color: '#6c757d' }}>
                            {doc.tamanio_bytes ? `${Math.round(doc.tamanio_bytes / 1024)} KB` : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: '12px', color: '#6c757d' }}>
                            {formatearFecha(doc.fecha_subida)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                              onClick={() => handleDescargarDocumento(doc)}
                              disabled={descargandoId === doc.id}
                            >
                              {descargandoId === doc.id ? 'Descargando...' : '📥 Descargar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <div style={{ background: 'white', padding: '24px', border: '1px solid #ccc', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                <h4 style={{ margin: '0 0 16px 0', color: '#00539C' }}>
                  Datos del Programa Académico y Trámite
                </h4>

                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>Carrera de Posgrado</label>
                    <input type="text" className="form-control" value={estudianteActual.cohorte?.carrera || 'No especificada'} readOnly />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>Código Oficial</label>
                    <input type="text" className="form-control" value={estudianteActual.cohorte?.codigo_carrera || '—'} readOnly />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>Cohorte Académica</label>
                    <input type="text" className="form-control" value={estudianteActual.cohorte?.nombre || `Año ${estudianteActual.cohorte?.anio || '—'}`} readOnly />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>Solicitud de Beca</label>
                    <input
                      type="text"
                      className="form-control"
                      value={estudianteActual.solicita_beca ? `Sí (${estudianteActual.tipo_beca || 'General'})` : 'No solicita beca'}
                      readOnly
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>Fecha de Preinscripción</label>
                    <input type="text" className="form-control" value={formatearFecha(estudianteActual.fecha_inscripcion)} readOnly />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>Fecha de Dictamen / Aprobación</label>
                    <input type="text" className="form-control" value={formatearFecha(estudianteActual.fecha_aprobacion)} readOnly />
                  </div>
                </div>

                {estudianteActual.motivo_observacion && (
                  <div style={{ background: '#fff3cd', padding: '14px 18px', borderRadius: '6px', borderLeft: '4px solid #ffc107', marginTop: '20px' }}>
                    <strong style={{ color: '#664d03' }}>Motivo de Observación Registrado:</strong>
                    <p style={{ margin: '6px 0 0', color: '#664d03', fontSize: '14px' }}>
                      {estudianteActual.motivo_observacion}
                    </p>
                  </div>
                )}

                <div style={{ marginTop: '20px', padding: '12px 16px', background: '#e7f1ff', border: '1px solid #b6d4fe', borderRadius: '6px', fontSize: '13px', color: '#084298' }}>
                  ℹ️ <strong>Nota Académica:</strong> La asignación a comisiones de seminarios, planillas de asistencia y actas de calificación se gestionan desde el <strong>Panel Docente</strong> por parte de cada cátedra.
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
