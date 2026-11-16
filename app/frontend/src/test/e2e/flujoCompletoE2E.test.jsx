import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../App';
import { cohorteService } from '../../services/cohorteService';
import { legajoService } from '../../services/legajoService';
import { authService } from '../../services/authService';

describe('Flujo E2E Completo del Módulo Core', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const mockCohortes = [
    {
      id: 'cohorte-1',
      anio: 2026,
      nombre: 'Cohorte 2026 - MISI',
      carrera: 'Maestría en Sistemas de Información',
      codigo_carrera: 'MISI',
      numero_cohorte: 1,
      tipo_carrera: 'Maestria',
      abierta: true,
      fecha_inicio: '2026-04-01',
    },
  ];

  const mockLegajos = {
    items: [
      {
        id: 'legajo-1',
        numero_legajo: null,
        usuario_id: 'user-1',
        cohorte_id: 'cohorte-1',
        cohorte: mockCohortes[0],
        dni: '35123456',
        apellido: 'Rodriguez',
        nombre: 'Carlos',
        email: 'carlos.rodriguez@example.com',
        estado: 'EN_REVISION',
        solicita_beca: false,
        tipo_beca: null,
        fecha_inscripcion: '2026-03-01T10:00:00Z',
        fecha_aprobacion: null,
        motivo_observacion: null,
        semaforo: 'AMARILLO',
      },
    ],
    total: 1,
    page: 1,
    page_size: 20,
  };

  it('permite al aspirante acceder a la preinscripción pública desde login', async () => {
    vi.spyOn(cohorteService, 'obtenerCohortes').mockResolvedValue(mockCohortes);

    render(<App />);

    // Verifica pantalla de Login
    expect(screen.getByText('Sistema de Posgrado')).toBeDefined();

    // Clic en botón de preinscripción pública para aspirantes
    const btnPreinscripcion = screen.getByText(/Preinscribite acá como aspirante/i);
    fireEvent.click(btnPreinscripcion);

    // Debe mostrar la vista pública de Preinscripción
    await waitFor(() => {
      expect(screen.getByText(/Sistema de Posgrado - Preinscripción/i)).toBeDefined();
    });

    // Clic en Volver al Inicio de Sesión
    const btnVolver = screen.getByText(/Volver al Inicio de Sesión/i);
    fireEvent.click(btnVolver);

    // Vuelve al Login
    await waitFor(() => {
      expect(screen.getByText('Sistema de Posgrado')).toBeDefined();
    });
  });

  it('permite al coordinador auditar y gestionar el flujo de aprobación y métricas', async () => {
    // Simular coordinador autenticado con rol ADMIN_POSGRADO
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(authService, 'getUser').mockReturnValue({
      id: 'admin-id',
      nombre: 'Emilio',
      apellido: 'Rivero',
      email: 'admin@posgrado.frlp.utn.edu.ar',
      rol: 'ADMIN_POSGRADO',
    });

    vi.spyOn(legajoService, 'obtenerLegajos').mockResolvedValue(mockLegajos);
    vi.spyOn(legajoService, 'obtenerDocumentosLegajo').mockResolvedValue([]);
    vi.spyOn(cohorteService, 'obtenerCohortes').mockResolvedValue(mockCohortes);

    render(<App />);

    // Verifica que entra al Panel de Conducción
    await waitFor(() => {
      expect(screen.getByText(/Panel de Equipo de conducción/i)).toBeDefined();
      expect(screen.getByText('Carlos Rodriguez')).toBeDefined();
    });

    // Estado actual: En Revisión y "Se asigna al aprobar"
    expect(screen.getByText('Se asigna al aprobar')).toBeDefined();
    expect(screen.getAllByText('En Revisión').length).toBeGreaterThanOrEqual(1);

    // Navega a Posgrados desde la barra lateral
    const menuPosgrados = screen.getByText('Posgrados');
    fireEvent.click(menuPosgrados);

    await waitFor(() => {
      expect(screen.getByText('Gestión de Posgrados y Cohortes')).toBeDefined();
    });

    // Navega a Estadísticas
    const menuEstadisticas = screen.getByText('Estadisticas');
    fireEvent.click(menuEstadisticas);

    await waitFor(() => {
      expect(screen.getByText('Métricas y Estadísticas Generales')).toBeDefined();
    });

    // Navega a Estudiantes
    const menuEstudiantes = screen.getByText('Estudiantes');
    fireEvent.click(menuEstudiantes);

    await waitFor(() => {
      expect(screen.getByText(/Alertas Académicas y Notificaciones/i)).toBeDefined();
    });
  });
});
