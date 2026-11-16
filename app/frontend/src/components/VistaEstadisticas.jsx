import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { legajoService } from '../services/legajoService';
import { cohorteService } from '../services/cohorteService';

const PALETA_COLORES = [
  '#00539C', // Azul UTN
  '#28a745', // Verde
  '#17a2b8', // Cian
  '#6f42c1', // Violeta
  '#fd7e14', // Naranja
  '#20c997', // Teal
  '#e83e8c', // Rosa
];

export const VistaEstadisticas = () => {
  const [legajos, setLegajos] = useState([]);
  const [cohortes, setCohortes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Cargar datos reales de legajos y cohortes en paralelo
  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);

      const [resLegajos, resCohortes] = await Promise.all([
        legajoService.obtenerLegajos({ pageSize: 100 }),
        cohorteService.obtenerCohortes(),
      ]);

      setLegajos(resLegajos.items || []);
      setCohortes(Array.isArray(resCohortes) ? resCohortes : []);
    } catch (err) {
      console.error('Error al cargar datos estadísticos:', err);
      setError('No se pudieron obtener las métricas desde el servidor de Posgrados.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Cálculo dinámico de indicadores clave (KPIs)
  const metricas = useMemo(() => {
    const totalInscriptos = legajos.length;
    const cohortesActivas = cohortes.filter((c) => Boolean(c.abierta)).length;

    const aprobados = legajos.filter((l) =>
      ['APROBADO', 'COMPLETADO', 'ACTIVO', 'GRADUADO'].includes(l.estado)
    ).length;

    const enRevision = legajos.filter((l) =>
      ['EN_REVISION', 'PENDIENTE', 'BORRADOR'].includes(l.estado)
    ).length;

    const observados = legajos.filter((l) => l.estado === 'OBSERVADO').length;

    const rechazados = legajos.filter((l) =>
      ['RECHAZADO', 'BAJA', 'VENCIDO'].includes(l.estado)
    ).length;

    const tasaAprobacion = totalInscriptos > 0 ? Math.round((aprobados / totalInscriptos) * 100) : 0;
    const conBeca = legajos.filter((l) => Boolean(l.solicita_beca)).length;

    return {
      totalInscriptos,
      cohortesActivas,
      totalCohortes: cohortes.length,
      aprobados,
      enRevision,
      observados,
      rechazados,
      tasaAprobacion,
      conBeca,
    };
  }, [legajos, cohortes]);

  // Agrupamiento y cálculo para el Gráfico de Barras por Programa Académico
  const datosBarras = useMemo(() => {
    const conteoPorCarrera = {};

    // 1. Inicializar con los posgrados existentes en las cohortes
    cohortes.forEach((c) => {
      const nombreCarrera = c.carrera || c.nombre || 'Posgrado';
      if (!conteoPorCarrera[nombreCarrera]) {
        conteoPorCarrera[nombreCarrera] = 0;
      }
    });

    // 2. Sumar las inscripciones reales registradas
    legajos.forEach((l) => {
      const nombreCarrera = l.cohorte?.carrera || l.cohorte?.nombre || 'General / Otros';
      conteoPorCarrera[nombreCarrera] = (conteoPorCarrera[nombreCarrera] || 0) + 1;
    });

    const items = Object.entries(conteoPorCarrera).map(([carrera, inscriptos], idx) => ({
      id: idx + 1,
      posgrado: carrera,
      inscriptos,
      color: PALETA_COLORES[idx % PALETA_COLORES.length],
    }));

    // Ordenar de mayor a menor demanda
    items.sort((a, b) => b.inscriptos - a.inscriptos);

    const maximoInscriptos = Math.max(...items.map((it) => it.inscriptos), 1);

    return {
      items,
      maximo: maximoInscriptos,
    };
  }, [legajos, cohortes]);

  if (cargando) {
    return (
      <div className="panel-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ color: '#00539C', fontWeight: 'bold', fontSize: '1.1rem' }}>
          ⏳ Calculando métricas en tiempo real con datos de FastAPI...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel-container" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h3 style={{ color: '#dc3545', marginBottom: '10px' }}>Error de Conexión</h3>
        <p style={{ color: '#6c757d' }}>{error}</p>
        <button type="button" className="btn-secondary" onClick={cargarDatos} style={{ marginTop: '15px' }}>
          🔄 Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="panel-container">
      <header className="panel-header" style={{ marginBottom: '25px' }}>
        <div>
          <h2>Métricas y Estadísticas Generales</h2>
          <p style={{ margin: '4px 0 0', color: '#6c757d', fontSize: '13px' }}>
            Indicadores académicos y demográficos calculados dinámicamente desde el backend.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={cargarDatos}
          style={{ padding: '8px 14px', fontSize: '13px' }}
        >
          🔄 Actualizar
        </button>
      </header>

      {/* Tarjetas de Indicadores Clave (KPIs) con Datos Reales */}
      <section className="metrics-grid" aria-label="Indicadores clave de rendimiento">
        <article className="metric-card">
          <span className="metric-title">Total de Postulantes</span>
          <span className="metric-value">{metricas.totalInscriptos}</span>
          <span style={{ fontSize: '11px', color: '#6c757d', display: 'block', marginTop: '4px' }}>
            Expedientes registrados
          </span>
        </article>

        <article className="metric-card">
          <span className="metric-title">Tasa de Aprobación</span>
          <span className="metric-value">{metricas.tasaAprobacion}%</span>
          <span style={{ fontSize: '11px', color: '#6c757d', display: 'block', marginTop: '4px' }}>
            {metricas.aprobados} de {metricas.totalInscriptos} admitidos
          </span>
        </article>

        <article className="metric-card">
          <span className="metric-title">Cohortes Activas</span>
          <span className="metric-value">{metricas.cohortesActivas}</span>
          <span style={{ fontSize: '11px', color: '#6c757d', display: 'block', marginTop: '4px' }}>
            de {metricas.totalCohortes} cohortes totales
          </span>
        </article>

        <article className="metric-card">
          <span className="metric-title">Solicitudes de Beca</span>
          <span className="metric-value">{metricas.conBeca}</span>
          <span style={{ fontSize: '11px', color: '#6c757d', display: 'block', marginTop: '4px' }}>
            {metricas.totalInscriptos > 0 ? Math.round((metricas.conBeca / metricas.totalInscriptos) * 100) : 0}% de los aspirantes
          </span>
        </article>
      </section>

      {/* Gráfico de Barras Dinámico en CSS Puro */}
      <section className="chart-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Demanda por Programa Académico</h3>
          <span style={{ fontSize: '12px', color: '#6c757d' }}>
            Total de carreras monitoreadas: {datosBarras.items.length}
          </span>
        </div>

        {datosBarras.items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#6c757d' }}>
            No hay programas de posgrado registrados en el sistema.
          </div>
        ) : (
          <div className="bar-chart-container" role="region" aria-label="Gráfico de barras de inscriptos">
            {datosBarras.items.map((item) => {
              const porcentaje = Math.min(
                100,
                Math.max(0, Math.round((item.inscriptos / datosBarras.maximo) * 100))
              );

              return (
                <div key={item.id} className="bar-row">
                  <div className="bar-label" title={item.posgrado}>
                    {item.posgrado}
                  </div>

                  <div
                    className="bar-track"
                    role="progressbar"
                    aria-valuenow={item.inscriptos}
                    aria-valuemin={0}
                    aria-valuemax={datosBarras.maximo}
                    aria-label={`Inscriptos en ${item.posgrado}`}
                  >
                    <div
                      className="bar-fill"
                      style={{
                        width: `${Math.max(porcentaje, item.inscriptos > 0 ? 8 : 0)}%`,
                        backgroundColor: item.color,
                        minWidth: item.inscriptos > 0 ? '45px' : '0',
                      }}
                    >
                      <span className="bar-value">
                        {item.inscriptos} {porcentaje >= 20 ? `(${porcentaje}%)` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Distribución por Estado de Legajos */}
      <section style={{ background: 'white', padding: '24px 30px', borderRadius: '8px', border: '1px solid #ccc' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#333', fontSize: '1.2rem' }}>
          Distribución de Expedientes por Estado
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
          <div style={{ padding: '14px', borderRadius: '6px', background: '#d1e7dd', border: '1px solid #badbcc', textAlign: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f5132', display: 'block' }}>
              🟢 Aprobados / Activos
            </span>
            <strong style={{ fontSize: '1.6rem', color: '#0f5132', display: 'block', margin: '4px 0' }}>
              {metricas.aprobados}
            </strong>
            <span style={{ fontSize: '11px', color: '#0f5132' }}>
              {metricas.totalInscriptos > 0 ? Math.round((metricas.aprobados / metricas.totalInscriptos) * 100) : 0}% del total
            </span>
          </div>

          <div style={{ padding: '14px', borderRadius: '6px', background: '#fff3cd', border: '1px solid #ffecb5', textAlign: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#664d03', display: 'block' }}>
              🟡 En Revisión / Trámite
            </span>
            <strong style={{ fontSize: '1.6rem', color: '#664d03', display: 'block', margin: '4px 0' }}>
              {metricas.enRevision}
            </strong>
            <span style={{ fontSize: '11px', color: '#664d03' }}>
              {metricas.totalInscriptos > 0 ? Math.round((metricas.enRevision / metricas.totalInscriptos) * 100) : 0}% del total
            </span>
          </div>

          <div style={{ padding: '14px', borderRadius: '6px', background: '#ffe5d0', border: '1px solid #fecba1', textAlign: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#a04000', display: 'block' }}>
              🟠 Observados
            </span>
            <strong style={{ fontSize: '1.6rem', color: '#a04000', display: 'block', margin: '4px 0' }}>
              {metricas.observados}
            </strong>
            <span style={{ fontSize: '11px', color: '#a04000' }}>
              Requieren subsanación
            </span>
          </div>

          <div style={{ padding: '14px', borderRadius: '6px', background: '#f8d7da', border: '1px solid #f5c2c7', textAlign: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#842029', display: 'block' }}>
              🔴 Rechazados / Bajas
            </span>
            <strong style={{ fontSize: '1.6rem', color: '#842029', display: 'block', margin: '4px 0' }}>
              {metricas.rechazados}
            </strong>
            <span style={{ fontSize: '11px', color: '#842029' }}>
              Postulaciones desestimadas
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
