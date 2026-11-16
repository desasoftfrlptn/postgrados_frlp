import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cohorteService } from '../../services/cohorteService';
import { legajoService } from '../../services/legajoService';
import { inscripcionService } from '../../services/inscripcionService';
import { authService } from '../../services/authService';

describe('cohorteService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('obtenerCohortes invoca endpoint GET /cohortes', async () => {
    const mockCohortes = [
      { id: '1', nombre: 'Cohorte 2026', carrera: 'Maestría en Sistemas', abierta: true },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockCohortes,
    });

    const resultado = await cohorteService.obtenerCohortes();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/cohortes'),
      expect.objectContaining({ method: 'GET' })
    );
    expect(resultado).toEqual(mockCohortes);
  });

  it('actualizarEstado envía PATCH con { abierta: true/false }', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'c1', abierta: true }),
    });

    const respuesta = await cohorteService.actualizarEstado('c1', true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/cohortes/c1/estado'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ abierta: true }),
      })
    );
    expect(respuesta.abierta).toBe(true);
  });

  it('crearCohorte envía POST con contrato oficial', async () => {
    const payload = {
      anio: 2026,
      nombre: 'Cohorte 2026 - MISI',
      carrera: 'Maestría en Sistemas',
      codigo_carrera: 'MISI',
      numero_cohorte: 1,
      tipo_carrera: 'Maestria',
      abierta: true,
      fecha_inicio: '2026-04-01',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 'c-nueva', ...payload }),
    });

    const res = await cohorteService.crearCohorte(payload);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/cohortes'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      })
    );
    expect(res.id).toBe('c-nueva');
    expect(res.codigo_carrera).toBe('MISI');
  });
});

describe('legajoService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('obtenerLegajos envía parámetros de paginación y filtros', async () => {
    const mockPage = { items: [], total: 0, page: 1, page_size: 20 };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockPage,
    });

    await legajoService.obtenerLegajos({ page: 2, pageSize: 20, estado: 'PENDIENTE' });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/legajos?page=2&page_size=20&estado=PENDIENTE'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('actualizarEstadoLegajo envía estado y motivo de observación', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'l1', estado: 'OBSERVADO' }),
    });

    await legajoService.actualizarEstadoLegajo('l1', 'OBSERVADO', 'Falta título secundario');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/legajos/l1/estado'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ estado: 'OBSERVADO', motivo_observacion: 'Falta título secundario' }),
      })
    );
  });

  it('obtenerDocumentosLegajo consulta documentos por id', async () => {
    const mockDocs = [{ id: 'd1', tipo: 'DNI', nombre_original: 'dni.pdf' }];
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockDocs,
    });

    const docs = await legajoService.obtenerDocumentosLegajo('l1');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/legajos/l1/documentos'),
      expect.objectContaining({ method: 'GET' })
    );
    expect(docs).toHaveLength(1);
  });
});

describe('inscripcionService y authService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('enviarLegajo invoca POST /legajos/{id}/enviar con token bearer', async () => {
    localStorage.setItem('access_token', 'jwt-demo');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'l-1', estado: 'ENVIADO' }),
    });

    const res = await inscripcionService.enviarLegajo('l-1');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/legajos/l-1/enviar'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-demo' }),
      })
    );
    expect(res.estado).toBe('ENVIADO');
  });

  it('registroAspirante invoca POST /auth/registro-aspirante', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 'u-1', email: 'asp@utn.edu.ar', rol: 'ASPIRANTE' }),
    });

    const user = await authService.registroAspirante({
      email: ' asp@utn.edu.ar ',
      password: 'PasswordSegura123',
      nombre: 'Ana',
      apellido: 'Lopez',
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/registro-aspirante'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(user.rol).toBe('ASPIRANTE');
  });

  it('login reemplaza el perfil anterior con el usuario devuelto por la API', async () => {
    localStorage.setItem('user_profile', JSON.stringify({ rol: 'ADMIN_POSGRADO' }));
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'aspirante-token',
        refresh_token: 'aspirante-refresh',
        user: { id: 'u-2', email: 'asp@utn.edu.ar', rol: 'ASPIRANTE' },
      }),
    });

    const session = await authService.login('asp@utn.edu.ar', 'password');

    expect(session.user.rol).toBe('ASPIRANTE');
    expect(JSON.parse(localStorage.getItem('user_profile')).rol).toBe('ASPIRANTE');
  });

  it('login elimina cualquier perfil anterior si la respuesta no trae usuario', async () => {
    localStorage.setItem('access_token', 'old-admin-token');
    localStorage.setItem('refresh_token', 'old-admin-refresh');
    localStorage.setItem('user_profile', JSON.stringify({ rol: 'ADMIN_POSGRADO' }));
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'new-token',
        refresh_token: 'new-refresh',
      }),
    });

    await expect(authService.login('asp@utn.edu.ar', 'password')).rejects.toThrow(
      'El backend devolvió una respuesta de autenticación incompleta.'
    );
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(localStorage.getItem('user_profile')).toBeNull();
  });
});
