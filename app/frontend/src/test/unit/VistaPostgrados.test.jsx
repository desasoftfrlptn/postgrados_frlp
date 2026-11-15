import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VistaPostgrados from '../../components/VistaPostgrados';
import { cohorteService } from '../../services/cohorteService';

describe('VistaPostgrados Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  const mockCohortes = [
    {
      id: 'c-1',
      anio: 2026,
      nombre: 'Cohorte 2026 - MISI',
      carrera: 'Maestría en Sistemas',
      codigo_carrera: 'MISI',
      numero_cohorte: 1,
      tipo_carrera: 'Maestria',
      abierta: true,
      fecha_inicio: '2026-04-01',
    },
  ];

  it('renderiza cohortes agrupadas y permite toggle de apertura de período', async () => {
    vi.spyOn(cohorteService, 'obtenerCohortes').mockResolvedValue(mockCohortes);
    vi.spyOn(cohorteService, 'actualizarEstado').mockResolvedValue({ ...mockCohortes[0], abierta: false });

    render(<VistaPostgrados />);

    await waitFor(() => {
      expect(screen.getByText('Maestría en Sistemas')).toBeDefined();
    });

    expect(screen.getByText('MISI-01')).toBeDefined();
    expect(screen.getByText(/Abierta/i)).toBeDefined();

    // Clic en botón para cerrar período
    const btnCerrar = screen.getByText('🔒 Cerrar');
    fireEvent.click(btnCerrar);

    await waitFor(() => {
      expect(cohorteService.actualizarEstado).toHaveBeenCalledWith('c-1', false);
    });
  });

  it('valida formato del código de carrera al registrar nueva cohorte', async () => {
    vi.spyOn(cohorteService, 'obtenerCohortes').mockResolvedValue(mockCohortes);

    render(<VistaPostgrados />);

    await waitFor(() => {
      expect(screen.getByText('Maestría en Sistemas')).toBeDefined();
    });

    // Abrir formulario
    const btnNueva = screen.getByText(/Registrar Nueva Cohorte/i);
    fireEvent.click(btnNueva);

    // Ingresar carrera (primer input con placeholder descriptivo)
    const inputCarrera = screen.getAllByPlaceholderText(/Maestría en Ingeniería/i)[0];
    fireEvent.change(inputCarrera, { target: { value: 'Ingeniería en Software' } });

    // Ingresar código inválido (3 caracteres en vez de 4)
    const inputCodigo = screen.getByPlaceholderText('MISI');
    fireEvent.change(inputCodigo, { target: { value: 'ABC' } });

    // Intentar enviar
    const btnGuardar = screen.getByText('Guardar y Publicar Cohorte');
    fireEvent.click(btnGuardar);

    // Debe mostrar error de validación del contrato oficial
    await waitFor(() => {
      expect(screen.getByText(/El código de carrera debe tener exactamente 4 caracteres/i)).toBeDefined();
    });
  });
});
