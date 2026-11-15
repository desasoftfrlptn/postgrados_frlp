import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { VistaEstadisticas } from '../../components/VistaEstadisticas';
import { legajoService } from '../../services/legajoService';
import { cohorteService } from '../../services/cohorteService';

describe('VistaEstadisticas Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calcula y renderiza KPIs e indicadores dinámicamente', async () => {
    const mockLegajos = {
      items: [
        { id: '1', estado: 'APROBADO', solicita_beca: true, cohorte: { carrera: 'Maestría en Sistemas' } },
        { id: '2', estado: 'ACTIVO', solicita_beca: false, cohorte: { carrera: 'Maestría en Sistemas' } },
        { id: '3', estado: 'PENDIENTE', solicita_beca: true, cohorte: { carrera: 'Especialización en Software' } },
        { id: '4', estado: 'OBSERVADO', solicita_beca: false, cohorte: { carrera: 'Especialización en Software' } },
      ],
      total: 4,
    };

    const mockCohortes = [
      { id: 'c1', carrera: 'Maestría en Sistemas', abierta: true },
      { id: 'c2', carrera: 'Especialización en Software', abierta: false },
    ];

    vi.spyOn(legajoService, 'obtenerLegajos').mockResolvedValue(mockLegajos);
    vi.spyOn(cohorteService, 'obtenerCohortes').mockResolvedValue(mockCohortes);

    render(<VistaEstadisticas />);

    // Esperar a que se carguen los datos
    await waitFor(() => {
      expect(screen.getByText('Métricas y Estadísticas Generales')).toBeDefined();
    });

    // Verificar Total de Postulantes: 4
    expect(screen.getByText('Total de Postulantes').closest('article').querySelector('.metric-value').textContent).toBe('4');

    // Verificar Tasa de Aprobación: 2 de 4 = 50%
    expect(screen.getByText('Tasa de Aprobación').closest('article').querySelector('.metric-value').textContent).toBe('50%');

    // Verificar Cohortes Activas: 1
    expect(screen.getByText('Cohortes Activas').closest('article').querySelector('.metric-value').textContent).toBe('1');

    // Verificar Solicitudes de Beca: 2
    expect(screen.getByText('Solicitudes de Beca').closest('article').querySelector('.metric-value').textContent).toBe('2');

    // Verificar que ambas carreras figuren en el gráfico de barras
    expect(screen.getByText('Maestría en Sistemas')).toBeDefined();
    expect(screen.getByText('Especialización en Software')).toBeDefined();
  });
});
