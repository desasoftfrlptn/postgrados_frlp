import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cohorteService } from '../../services/cohorteService';
import { legajoService } from '../../services/legajoService';

describe('cohorteService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('obtenerCohortes invoca endpoint GET /cohortes', async () => {
    const mockCohortes = [
      { id: '1', nombre: 'Cohorte 2026', carrera: 'Maestría en Sistemas', abierta: true },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockCohortes,
    });

    const resultado = await cohorteService.obtenerCohortes();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/cohortes'),
      expect.objectContaining({ method: 'GET' })
    );
    expect(resultado).toEqual(mockCohortes);
  });

  it('actualizarEstado envía PATCH con { abierta: true/false }', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'c1', abierta: true }),
    });

    const respuesta = await cohorteService.actualizarEstado('c1', true);
    expect(global.fetch).toHaveBeenCalledWith(
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

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 'c-nueva', ...payload }),
    });

    const res = await cohorteService.crearCohorte(payload);
    expect(global.fetch).toHaveBeenCalledWith(
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
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockPage,
    });

    await legajoService.obtenerLegajos({ page: 2, pageSize: 20, estado: 'PENDIENTE' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/legajos?page=2&page_size=20&estado=PENDIENTE'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('actualizarEstadoLegajo envía estado y motivo de observación', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'l1', estado: 'OBSERVADO' }),
    });

    await legajoService.actualizarEstadoLegajo('l1', 'OBSERVADO', 'Falta título secundario');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/legajos/l1/estado'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ estado: 'OBSERVADO', motivo_observacion: 'Falta título secundario' }),
      })
    );
  });

  it('obtenerDocumentosLegajo consulta documentos por id', async () => {
    const mockDocs = [{ id: 'd1', tipo: 'DNI', nombre_original: 'dni.pdf' }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockDocs,
    });

    const docs = await legajoService.obtenerDocumentosLegajo('l1');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/legajos/l1/documentos'),
      expect.objectContaining({ method: 'GET' })
    );
    expect(docs).toHaveLength(1);
  });
});
