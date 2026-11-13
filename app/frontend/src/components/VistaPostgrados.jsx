import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { cohorteService } from '../services/cohorteService';

/**
 * Vista de Gestión de Posgrados y Cohortes (Equipo de Conducción)
 * Conectado con los endpoints oficiales de FastAPI (/api/v1/cohortes).
 */
export default function VistaPostgrados() {
  const [cohortes, setCohortes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [procesandoId, setProcesandoId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Estados para creación rápida de cohortes (usado en Commit 10)
  const [nuevaCohorte, setNuevaCohorte] = useState({
    anio: new Date().getFullYear(),
    nombre: '',
    carrera: '',
    codigo_carrera: '',
    numero_cohorte: 1,
    tipo_carrera: 'Maestria',
    abierta: true,
    fecha_inicio: '',
  });
  const [errorCreacion, setErrorCreacion] = useState('');
  const [creando, setCreando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // Carga inicial de cohortes desde FastAPI
  const cargarCohortes = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      const data = await cohorteService.obtenerCohortes();
      setCohortes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Error al conectar con el servicio de cohortes.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarCohortes();
  }, [cargarCohortes]);

  // Limpiar mensaje de feedback tras 4 segundos
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Agrupación dinámica de cohortes por carrera / programa académico
  const carrerasAgrupadas = useMemo(() => {
    const mapa = new Map();
    cohortes.forEach((cohorte) => {
      const carreraKey = cohorte.carrera || cohorte.nombre || 'Posgrados UTN FRLP';
      if (!mapa.has(carreraKey)) {
        mapa.set(carreraKey, {
          nombre: carreraKey,
          tipo: cohorte.tipo_carrera || 'Posgrado',
          codigo: cohorte.codigo_carrera || '',
          cohortes: [],
        });
      }
      mapa.get(carreraKey).cohortes.push(cohorte);
    });
    return Array.from(mapa.values());
  }, [cohortes]);

  // Alternar apertura / cierre del período de inscripción (PATCH /api/v1/cohortes/{id}/estado)
  const handleToggleEstado = async (cohorte) => {
    const nuevoEstado = !cohorte.abierta;
    const accionTexto = nuevoEstado ? 'ABRIR' : 'CERRAR';

    if (!window.confirm(`¿Está seguro de ${accionTexto} el período de inscripción para "${cohorte.nombre}"?`)) {
      return;
    }

    try {
      setProcesandoId(cohorte.id);
      const cohorteActualizada = await cohorteService.actualizarEstado(cohorte.id, nuevoEstado);
      setCohortes((prev) =>
        prev.map((c) => (c.id === cohorte.id ? { ...c, abierta: cohorteActualizada.abierta } : c))
      );
      setFeedback({
        tipo: 'success',
        mensaje: `Período de inscripción para "${cohorte.nombre}" ahora está ${cohorteActualizada.abierta ? 'ABIERTO' : 'CERRADO'}.`,
      });
    } catch (err) {
      alert(`Error al actualizar estado de la cohorte: ${err.message}`);
    } finally {
      setProcesandoId(null);
    }
  };

  // Crear nueva cohorte oficial en FastAPI (POST /api/v1/cohortes)
  const handleCrearCohorte = async (e) => {
    e.preventDefault();
    setErrorCreacion('');

    const carreraLimpia = nuevaCohorte.carrera.trim();
    if (!carreraLimpia) {
      setErrorCreacion('El nombre de la carrera o posgrado es obligatorio.');
      return;
    }

    const codigoLimpio = nuevaCohorte.codigo_carrera.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(codigoLimpio)) {
      setErrorCreacion('El código de carrera debe tener exactamente 4 caracteres alfanuméricos en mayúsculas (ej: MISI, DISO).');
      return;
    }

    const anioNum = parseInt(nuevaCohorte.anio, 10);
    if (!anioNum || anioNum < 2020 || anioNum > 2100) {
      setErrorCreacion('El año de la cohorte debe ser un año válido (ej: 2026).');
      return;
    }

    const numeroNum = parseInt(nuevaCohorte.numero_cohorte, 10);
    if (!numeroNum || numeroNum < 1 || numeroNum > 99) {
      setErrorCreacion('El número de cohorte debe ser un valor ordinal entre 1 y 99.');
      return;
    }

    const nombreLimpio = nuevaCohorte.nombre.trim() || `Cohorte ${anioNum} - ${carreraLimpia}`;

    const payload = {
      anio: anioNum,
      nombre: nombreLimpio,
      carrera: carreraLimpia,
      codigo_carrera: codigoLimpio,
      numero_cohorte: numeroNum,
      tipo_carrera: nuevaCohorte.tipo_carrera,
      abierta: Boolean(nuevaCohorte.abierta),
      fecha_inicio: nuevaCohorte.fecha_inicio ? nuevaCohorte.fecha_inicio : null,
    };

    try {
      setCreando(true);
      const cohorteCreada = await cohorteService.crearCohorte(payload);
      setCohortes((prev) => [cohorteCreada, ...prev]);
      setFeedback({
        tipo: 'success',
        mensaje: `Cohorte "${cohorteCreada.nombre}" registrada exitosamente con código ${cohorteCreada.codigo_carrera}-${String(cohorteCreada.numero_cohorte).padStart(2, '0')}.`,
      });
      // Reset del formulario
      setNuevaCohorte({
        anio: new Date().getFullYear(),
        nombre: '',
        carrera: '',
        codigo_carrera: '',
        numero_cohorte: 1,
        tipo_carrera: 'Maestria',
        abierta: true,
        fecha_inicio: '',
      });
      setMostrarFormulario(false);
    } catch (err) {
      setErrorCreacion(err.message || 'Error al registrar la nueva cohorte en FastAPI.');
    } finally {
      setCreando(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', color: '#002B49' }}>Gestión de Posgrados y Cohortes</h2>
          <p style={{ margin: '4px 0 0', color: '#6c757d', fontSize: '14px' }}>
            Control de carreras, períodos de preinscripción y cohortes académicas activas.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setMostrarFormulario((prev) => !prev)}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            {mostrarFormulario ? '✕ Cancelar' : '➕ Registrar Nueva Cohorte'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={cargarCohortes}
            disabled={cargando}
            style={{ padding: '8px 14px', fontSize: '13px' }}
          >
            {cargando ? 'Actualizando...' : '🔄 Actualizar'}
          </button>
        </div>
      </header>

      {/* Formulario de Creación de Cohortes Oficiales */}
      {mostrarFormulario && (
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            border: '1px solid #ced4da',
            padding: '24px',
            marginBottom: '30px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', color: '#002B49' }}>
            Registrar Nueva Cohorte Oficial
          </h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#6c757d' }}>
            Los campos marcados con asterisco (*) son obligatorios según el modelo de datos de la UTN.
          </p>

          {errorCreacion && (
            <div
              role="alert"
              style={{
                backgroundColor: '#f8d7da',
                color: '#842029',
                border: '1px solid #f5c2c7',
                borderRadius: '4px',
                padding: '10px 14px',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              ⚠️ {errorCreacion}
            </div>
          )}

          <form onSubmit={handleCrearCohorte}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', marginBottom: '6px' }}>
                  Carrera / Programa <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="Ej: Maestría en Ingeniería en Sistemas"
                  value={nuevaCohorte.carrera}
                  onChange={(e) => {
                    const carrera = e.target.value;
                    setNuevaCohorte((prev) => ({
                      ...prev,
                      carrera,
                      nombre: prev.nombre || (carrera ? `Cohorte ${prev.anio} - ${carrera}` : ''),
                    }));
                    setErrorCreacion('');
                  }}
                  disabled={creando}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', marginBottom: '6px' }}>
                  Tipo de Carrera <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <select
                  className="form-control"
                  style={{ background: '#fff' }}
                  value={nuevaCohorte.tipo_carrera}
                  onChange={(e) => setNuevaCohorte((prev) => ({ ...prev, tipo_carrera: e.target.value }))}
                  disabled={creando}
                >
                  <option value="Maestria">Maestría</option>
                  <option value="Especializacion">Especialización</option>
                  <option value="Doctorado">Doctorado</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', marginBottom: '6px' }}>
                  Código de Carrera (4 letras) <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  className="form-control"
                  placeholder="MISI"
                  style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 'bold' }}
                  value={nuevaCohorte.codigo_carrera}
                  onChange={(e) => {
                    setNuevaCohorte((prev) => ({ ...prev, codigo_carrera: e.target.value.toUpperCase() }));
                    setErrorCreacion('');
                  }}
                  disabled={creando}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', marginBottom: '6px' }}>
                  Año <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="number"
                  required
                  min={2020}
                  max={2100}
                  className="form-control"
                  value={nuevaCohorte.anio}
                  onChange={(e) => setNuevaCohorte((prev) => ({ ...prev, anio: parseInt(e.target.value, 10) || '' }))}
                  disabled={creando}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', marginBottom: '6px' }}>
                  Número de Cohorte (Ordinal) <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={99}
                  className="form-control"
                  value={nuevaCohorte.numero_cohorte}
                  onChange={(e) => setNuevaCohorte((prev) => ({ ...prev, numero_cohorte: parseInt(e.target.value, 10) || 1 }))}
                  disabled={creando}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', marginBottom: '6px' }}>
                  Fecha de Inicio de Cursada
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={nuevaCohorte.fecha_inicio}
                  onChange={(e) => setNuevaCohorte((prev) => ({ ...prev, fecha_inicio: e.target.value }))}
                  disabled={creando}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', marginBottom: '6px' }}>
                  Nombre Descriptivo de la Cohorte <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="Ej: Cohorte 2026 - Maestría en Ingeniería en Sistemas"
                  value={nuevaCohorte.nombre}
                  onChange={(e) => {
                    setNuevaCohorte((prev) => ({ ...prev, nombre: e.target.value }));
                    setErrorCreacion('');
                  }}
                  disabled={creando}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <input
                type="checkbox"
                id="check-abierta"
                checked={nuevaCohorte.abierta}
                onChange={(e) => setNuevaCohorte((prev) => ({ ...prev, abierta: e.target.checked }))}
                disabled={creando}
                style={{ width: '16px', height: '16px' }}
              />
              <label htmlFor="check-abierta" style={{ fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                Abrir período de preinscripción inmediatamente al crear
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setMostrarFormulario(false)}
                disabled={creando}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={creando}
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                {creando ? 'Registrando en FastAPI...' : 'Guardar y Publicar Cohorte'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Banner de Feedback de Éxito */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          style={{
            backgroundColor: feedback.tipo === 'success' ? '#d1e7dd' : '#cff4fc',
            color: feedback.tipo === 'success' ? '#0f5132' : '#055160',
            border: `1px solid ${feedback.tipo === 'success' ? '#badbcc' : '#b6effb'}`,
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          <span>✓ {feedback.mensaje}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Banner de Error con Reintento */}
      {error && (
        <div
          role="alert"
          style={{
            backgroundColor: '#f8d7da',
            color: '#842029',
            border: '1px solid #f5c2c7',
            borderRadius: '6px',
            padding: '14px 18px',
            marginBottom: '25px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <strong>Error al comunicar con FastAPI:</strong>
            <p style={{ margin: '4px 0 0', fontSize: '13px' }}>{error}</p>
          </div>
          <button
            type="button"
            className="btn-primary"
            style={{ padding: '6px 14px', fontSize: '13px' }}
            onClick={cargarCohortes}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Listado dinámico de Posgrados y Cohortes */}
      {cargando ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <p style={{ margin: 0, color: '#6c757d', fontSize: '15px' }}>Cargando carreras y cohortes desde el servidor...</p>
        </div>
      ) : carrerasAgrupadas.length === 0 ? (
        <div style={{ backgroundColor: '#fff', padding: '40px 20px', textAlign: 'center', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h4 style={{ margin: '0 0 10px', color: '#495057' }}>No hay cohortes registradas en la base de datos</h4>
          <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
            Puede registrar una nueva cohorte oficial mediante el formulario a continuación.
          </p>
        </div>
      ) : (
        carrerasAgrupadas.map((carrera) => (
          <div key={carrera.nombre} className="posgrado-card" style={{ marginBottom: '25px' }}>
            <div className="posgrado-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#002B49' }}>{carrera.nombre}</h3>
                <p style={{ color: '#6c757d', fontSize: '13px', margin: '4px 0 0' }}>
                  Tipo de Carrera: <strong>{carrera.tipo}</strong> {carrera.codigo ? `· Código: ${carrera.codigo}` : ''}
                </p>
              </div>
              <span className="badge" style={{ backgroundColor: '#e9ecef', color: '#495057', fontSize: '12px' }}>
                {carrera.cohortes.length} {carrera.cohortes.length === 1 ? 'cohorte' : 'cohortes'}
              </span>
            </div>

            <div className="table-responsive">
              <table style={{ width: '100%', marginBottom: '10px', fontSize: '13px', borderCollapse: 'collapse' }}>
                <thead style={{ color: '#6c757d', borderBottom: '2px solid #dee2e6' }}>
                  <tr>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Nombre de Cohorte</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Identificador</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Año</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Inicio</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Inscripción</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {carrera.cohortes.map((c) => {
                    const ident = c.codigo_carrera && c.numero_cohorte
                      ? `${c.codigo_carrera}-${String(c.numero_cohorte).padStart(2, '0')}`
                      : 'Heredada';
                    const estaProcesando = procesandoId === c.id;

                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px', fontWeight: '500' }}>{c.nombre}</td>
                        <td style={{ padding: '10px', textAlign: 'center', fontFamily: 'monospace', color: '#495057' }}>
                          {ident}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>{c.anio}</td>
                        <td style={{ padding: '10px', textAlign: 'center', color: '#6c757d' }}>
                          {c.fecha_inicio || '-'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          {c.abierta ? (
                            <span style={{
                              backgroundColor: '#d1e7dd',
                              color: '#0f5132',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600',
                            }}>
                              Abierta
                            </span>
                          ) : (
                            <span style={{
                              backgroundColor: '#f8d7da',
                              color: '#842029',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600',
                            }}>
                              Cerrada
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleEstado(c)}
                            disabled={estaProcesando}
                            style={{
                              backgroundColor: c.abierta ? '#dc3545' : '#198754',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '5px 12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: estaProcesando ? 'not-allowed' : 'pointer',
                              opacity: estaProcesando ? 0.6 : 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title={c.abierta ? 'Cerrar período de preinscripción' : 'Abrir período de preinscripción'}
                          >
                            {estaProcesando ? '⏳...' : c.abierta ? '🔒 Cerrar' : '🔓 Abrir'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
