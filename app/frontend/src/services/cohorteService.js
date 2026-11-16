// app/frontend/src/services/cohorteService.js
import { apiClient } from './apiClient';
import { authService } from './authService';

/**
 * Servicio para la gestión académica de Carreras de Posgrado y Cohortes.
 * Conecta con los endpoints oficiales de FastAPI (/api/v1/cohortes).
 */
export const cohorteService = {
  /**
   * Obtiene la lista completa de cohortes desde FastAPI.
   * Si es llamado por ADMIN_POSGRADO o SUPERADMIN devuelve todas (abiertas y cerradas).
   * Endpoint: GET /api/v1/cohortes
   * 
   * @returns {Promise<Array<{ id: string, anio: number, nombre: str, carrera: str, codigo_carrera: string|null, numero_cohorte: number|null, tipo_carrera: string, abierta: boolean, fecha_inicio: string|null }>>}
   */
  async obtenerCohortes() {
    return await apiClient('/cohortes', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
      },
    });
  },

  /**
   * Actualiza el estado de inscripción (abrir / cerrar período) de una cohorte.
   * Endpoint: PATCH /api/v1/cohortes/{cohort_id}/estado
   * Requiere rol ADMIN_POSGRADO o SUPERADMIN.
   * 
   * @param {string} cohortId - UUID de la cohorte
   * @param {boolean} abierta - true para abrir, false para cerrar
   * @returns {Promise<object>}
   */
  async actualizarEstado(cohortId, abierta) {
    return await apiClient(`/cohortes/${cohortId}/estado`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
      },
      body: JSON.stringify({ abierta }),
    });
  },

  /**
   * Registra una nueva cohorte en el sistema.
   * Endpoint: POST /api/v1/cohortes
   * Requiere rol ADMIN_POSGRADO o SUPERADMIN.
   * 
   * @param {object} payload
   * @param {number} payload.anio
   * @param {string} payload.nombre
   * @param {string} payload.carrera
   * @param {string} payload.codigo_carrera
   * @param {number} payload.numero_cohorte
   * @param {string} payload.tipo_carrera
   * @param {boolean} payload.abierta
   * @param {string|null} [payload.fecha_inicio]
   * @returns {Promise<object>}
   */
  async crearCohorte(payload) {
    return await apiClient('/cohortes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });
  },
};
