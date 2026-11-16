import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PanelConduccionEstudiante from '../../components/PanelConduccionEstudiante';
import { legajoService } from '../../services/legajoService';

describe('PanelConduccionEstudiante Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockEstudiantes = {
    items: [
      {
        id: 'est-1',
        numero_legajo: '26-MISI-01-001',
        dni: '38123456',
        nombre: 'Juan',
        apellido: 'Perez',
        email: 'juan.perez@example.com',
        estado: 'APROBADO',
        semaforo: 'VERDE',
        solicita_beca: false,
        cohorte: {
          anio: 2026,
          nombre: 'Cohorte 2026 - MISI',
          carrera: 'Maestría en Sistemas',
          codigo_carrera: 'MISI',
        },
      },
      {
        id: 'est-2',
        numero_legajo: null,
        dni: '40987654',
        nombre: 'Maria',
        apellido: 'Gomez',
        email: 'maria.gomez@example.com',
        estado: 'OBSERVADO',
        motivo_observacion: 'Falta legalizar copia del título',
        solicita_beca: true,
        tipo_beca: '100%',
        cohorte: {
          anio: 2026,
          nombre: 'Cohorte 2026 - ESOF',
          carrera: 'Especialización en Software',
          codigo_carrera: 'ESOF',
        },
      },
    ],
  };

  const mockDocs = [
    { id: 'd1', tipo: 'DNI', nombre_original: 'dni.pdf', tamanio_bytes: 102400, fecha_subida: '2026-03-01' },
    { id: 'd2', tipo: 'TITULO_GRADO', nombre_original: 'titulo.pdf', tamanio_bytes: 204800, fecha_subida: '2026-03-01' },
  ];

  it('renderiza datos del estudiante y calcula completitud de documentos', async () => {
    vi.spyOn(legajoService, 'obtenerLegajos').mockResolvedValue(mockEstudiantes);
    vi.spyOn(legajoService, 'obtenerDocumentosLegajo').mockResolvedValue(mockDocs);

    render(<PanelConduccionEstudiante />);

    await waitFor(() => {
      expect(screen.getByText('Perez, Juan')).toBeDefined();
    });

    // Muestra legajo y DNI
    expect(screen.getByText('26-MISI-01-001')).toBeDefined();
    expect(screen.getByText(/38123456/)).toBeDefined();

    // Muestra alerta académica de estudiante regular aprobado
    expect(screen.getByText(/Sin alertas pendientes/i)).toBeDefined();

    // Completitud: 2 de 4 documentos = 50%
    await waitFor(() => {
      expect(screen.getByText(/50% \(2\/4 docs\)/i)).toBeDefined();
    });
  });

  it('permite buscar y seleccionar otro estudiante observando su motivo', async () => {
    vi.spyOn(legajoService, 'obtenerLegajos').mockResolvedValue(mockEstudiantes);
    vi.spyOn(legajoService, 'obtenerDocumentosLegajo').mockResolvedValue([]);

    render(<PanelConduccionEstudiante />);

    await waitFor(() => {
      expect(screen.getByText('Perez, Juan')).toBeDefined();
    });

    const inputBusqueda = screen.getByPlaceholderText(/N° Legajo, DNI o Nombre/i);
    fireEvent.change(inputBusqueda, { target: { value: 'Gomez' } });
    fireEvent.click(screen.getByRole('button', { name: /Buscar/i }));

    await waitFor(() => {
      expect(screen.getByText('Gomez, Maria')).toBeDefined();
    });

    // Muestra el motivo obligatorio de observación
    expect(screen.getByText(/Falta legalizar copia del título/i)).toBeDefined();
    // Muestra estado OBSERVADO
    expect(screen.getByText('OBSERVADO')).toBeDefined();
  });
});
