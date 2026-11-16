// app/frontend/src/services/authService.js
import { apiClient } from './apiClient';

/**
 * Claves utilizadas para la persistencia en localStorage.
 */
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user_profile',
};

/**
 * Servicio de Autenticación para el Sistema de Gestión de Posgrado.
 * Gestiona el ciclo de vida de la sesión, tokens JWT y comunicación con FastAPI.
 */
export const authService = {
  /**
   * Registra un nuevo usuario con rol ASPIRANTE en POST /api/v1/auth/registro-aspirante.
   *
   * @param {object} params
   * @param {string} params.email
   * @param {string} params.password - Mínimo 12 caracteres
   * @param {string} params.nombre
   * @param {string} params.apellido
   * @returns {Promise<object>}
   */
  async registroAspirante({ email, password, nombre, apellido }) {
    return await apiClient('/auth/registro-aspirante', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email?.trim(),
        password,
        nombre: nombre?.trim(),
        apellido: apellido?.trim(),
      }),
    });
  },

  /**
   * Inicia sesión contra el endpoint POST /api/v1/auth/login.
   * Envía las credenciales y persiste los tokens y el usuario en localStorage.
   * 
   * @param {string} email - Correo del usuario.
   * @param {string} password - Contraseña en texto plano.
   * @returns {Promise<{ access_token: string, refresh_token: string, token_type: string, expires_in: number, user: object }>}
   */
  async login(email, password) {
    const payload = {
      email: email?.trim(),
      password,
    };

    const data = await apiClient('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!data?.access_token || !data?.refresh_token || !data?.user?.id || !data?.user?.rol) {
      this.logout();
      throw new Error('El backend devolvió una respuesta de autenticación incompleta.');
    }

    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
    localStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
    localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(data.user));

    return data;
  },

  /**
   * Cierra la sesión activa y elimina las credenciales locales.
   */
  logout() {
    localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.USER);
  },

  /**
   * Devuelve el Access Token actual almacenado.
   * @returns {string | null}
   */
  getToken() {
    return localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
  },

  /**
   * Devuelve los datos del usuario autenticado actual.
   * @returns {object | null}
   */
  getUser() {
    const userRaw = localStorage.getItem(AUTH_STORAGE_KEYS.USER);
    if (!userRaw) return null;
    try {
      return JSON.parse(userRaw);
    } catch {
      return null;
    }
  },

  /**
   * Verifica si existe una sesión activa válida.
   * @returns {boolean}
   */
  isAuthenticated() {
    return Boolean(this.getToken());
  },

  /**
   * Devuelve los headers de autorización HTTP necesarios para peticiones protegidas.
   * Inyecta Authorization: Bearer <token> si existe una sesión activa.
   * 
   * @returns {Record<string, string>}
   */
  getAuthHeaders() {
    const token = this.getToken();
    if (!token) return {};

    return {
      Authorization: `Bearer ${token}`,
    };
  },
};