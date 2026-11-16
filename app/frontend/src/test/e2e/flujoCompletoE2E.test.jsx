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

  it('actualiza el perfil y abre conducción inmediatamente después del login de admin', async () => {
    const admin = {
      id: 'admin-id',
      nombre: 'Administrador',
      apellido: 'Posgrado',
      email: 'admin@posgrado.frlp.utn.edu.ar',
      rol: 'ADMIN_POSGRADO',
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'admin-token',
        refresh_token: 'admin-refresh',
        token_type: 'bearer',
        expires_in: 28800,
        user: admin,
      }),
    });
    vi.spyOn(legajoService, 'obtenerLegajos').mockResolvedValue(mockLegajos);
    vi.spyOn(legajoService, 'obtenerDocumentosLegajo').mockResolvedValue([]);
    vi.spyOn(cohorteService, 'obtenerCohortes').mockResolvedValue(mockCohortes);

    render(<App />);
    fireEvent.change(screen.getByPlaceholderText(/Correo institucional/i), {
      target: { value: admin.email },
    });
    fireEvent.change(screen.getByPlaceholderText('Contraseña'), {
      target: { value: 'Admin123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

    await waitFor(() => {
      expect(screen.getByText('(ADMIN_POSGRADO)')).toBeDefined();
      expect(screen.getByText(/Panel de Equipo de conducción/i)).toBeDefined();
    });
    expect(JSON.parse(localStorage.getItem('user_profile')).rol).toBe('ADMIN_POSGRADO');
  });

  it('no muestra el acceso al Panel Docente para un aspirante', async () => {
    const aspirante = {
      id: 'aspirante-id',
      nombre: 'Juan',
      apellido: 'Perez',
      email: 'aspirante.demo@posgrado.frlp.utn.edu.ar',
      rol: 'ASPIRANTE',
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'aspirante-token',
        refresh_token: 'aspirante-refresh',
        token_type: 'bearer',
        expires_in: 28800,
        user: aspirante,
      }),
    });
    vi.spyOn(cohorteService, 'obtenerCohortes').mockResolvedValue(mockCohortes);

    render(<App />);
    fireEvent.change(screen.getByPlaceholderText(/Correo institucional/i), {
      target: { value: aspirante.email },
    });
    fireEvent.change(screen.getByPlaceholderText('Contraseña'), {
      target: { value: 'Aspirante123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

    await waitFor(() => {
      expect(screen.getByText('(ASPIRANTE)')).toBeDefined();
    });
    expect(screen.queryByRole('button', { name: 'Docente' })).toBeNull();
    expect(screen.queryByText(/Panel de Equipo de conducción/i)).toBeNull();
  });

  it('permite al docente iniciar sesión y ver su panel', async () => {
    const docente = {
      id: 'docente-id',
      nombre: 'Docente',
      apellido: 'Demo',
      email: 'docente.demo@posgrado.frlp.utn.edu.ar',
      rol: 'DOCENTE',
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'docente-token',
        refresh_token: 'docente-refresh',
        token_type: 'bearer',
        expires_in: 28800,
        user: docente,
      }),
    });

    render(<App />);
    fireEvent.change(screen.getByPlaceholderText(/Correo institucional/i), {
      target: { value: docente.email },
    });
    fireEvent.change(screen.getByPlaceholderText('Contraseña'), {
      target: { value: 'Docente123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

    await waitFor(() => {
      expect(screen.getByText('(DOCENTE)')).toBeDefined();
      expect(screen.getByText('Panel DOCENTE')).toBeDefined();
    });
    expect(screen.getByRole('button', { name: 'Docente' })).toBeDefined();
    expect(JSON.parse(localStorage.getItem('user_profile')).rol).toBe('DOCENTE');
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
