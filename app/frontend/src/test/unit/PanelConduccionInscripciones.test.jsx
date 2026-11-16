import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PanelConduccionInscripciones } from '../../components/PanelConduccionInscripciones';
import { legajoService } from '../../services/legajoService';

describe('PanelConduccionInscripciones Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('permite pasar un legajo ENVIADO a EN_REVISION', async () => {
    vi.spyOn(legajoService, 'obtenerLegajos').mockResolvedValue({
      items: [
        {
          id: 'leg-env',
          numero_legajo: null,
          dni: '37111222',
          nombre: 'Lucia',
          apellido: 'Fernandez',
          estado: 'ENVIADO',
          cohorte: { nombre: 'Cohorte 2026', carrera: 'Maestría en Sistemas' },
        },
      ],
    });
    vi.spyOn(legajoService, 'actualizarEstadoLegajo').mockResolvedValue({
      id: 'leg-env',
      estado: 'EN_REVISION',
    });

    render(<PanelConduccionInscripciones />);

    await waitFor(() => {
      expect(screen.getByText('Lucia Fernandez')).toBeDefined();
    });

    const btnRevision = screen.getByText(/Iniciar Revisión/i);
    fireEvent.click(btnRevision);

    await waitFor(() => {
      expect(legajoService.actualizarEstadoLegajo).toHaveBeenCalledWith('leg-env', 'EN_REVISION');
    });
  });

  it('exige motivo obligatorio al rechazar un legajo en EN_REVISION', async () => {
    vi.spyOn(legajoService, 'obtenerLegajos').mockResolvedValue({
      items: [
        {
          id: 'leg-rev',
          numero_legajo: null,
          dni: '38222333',
          nombre: 'Marcos',
          apellido: 'Diaz',
          estado: 'EN_REVISION',
          cohorte: { nombre: 'Cohorte 2026', carrera: 'Maestría en Sistemas' },
        },
      ],
    });
    vi.spyOn(legajoService, 'actualizarEstadoLegajo').mockResolvedValue({
      id: 'leg-rev',
      estado: 'RECHAZADO',
      motivo_observacion: 'No cumple requisitos de título de grado',
    });

    render(<PanelConduccionInscripciones />);

    await waitFor(() => {
      expect(screen.getByText('Marcos Diaz')).toBeDefined();
    });

    fireEvent.click(screen.getByText(/✕ Rechazar/i));

    const textarea = await screen.findByLabelText(/Motivo del rechazo/i);
    fireEvent.change(textarea, { target: { value: 'No cumple requisitos de título de grado' } });
    fireEvent.click(screen.getByText('Confirmar Rechazo'));

    await waitFor(() => {
      expect(legajoService.actualizarEstadoLegajo).toHaveBeenCalledWith(
        'leg-rev',
        'RECHAZADO',
        'No cumple requisitos de título de grado'
      );
    });
  });
});
