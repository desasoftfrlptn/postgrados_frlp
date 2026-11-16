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
      const legajoActualizado = await legajoService.actualizarEstadoLegajo(row.id, 'APROBADO');
      setInscripciones((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, ...legajoActualizado, estado: 'APROBADO' } : item))
      );
    } catch (err) {
      alert(`Error al aprobar legajo: ${err.message}`);
    }
  };

  return (
    <div className="panel-container">
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
                    {row.estado !== 'APROBADO' ? (
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
                    ) : (
                      <span style={{ color: '#198754', fontSize: '12px', fontWeight: 'bold' }}>
                        ✓ Aprobado
                      </span>
                    )}
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
    </div>
  );
};
