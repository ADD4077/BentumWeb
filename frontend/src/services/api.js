import { API_ENDPOINTS } from '../config/api.js';
import { buildCsrfHeaders } from '../utils/http.js';

export const api = {
  async saveData(userData) {
    try {
      const headers = await buildCsrfHeaders({
        'Content-Type': 'application/json',
      });
      const response = await fetch(API_ENDPOINTS.SAVE_DATA, {
        method: 'POST',
        headers,
        body: JSON.stringify(userData),
        credentials: 'include',
      });
      
      let data;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      
      return {
        ok: response.ok,
        status: response.status,
        ...(data || {}),
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        detail: 'Ошибка сети'
      };
    }
  },

  async authCheck() {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH_CHECK, {
        method: 'GET',
        credentials: 'include',
      });

      let data;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      return {
        ok: response.ok,
        status: response.status,
        ...(data || {}),
      };
    } catch (error) {
      throw error;
    }
  },

  async verify2FACode(code) {
    try {
      const headers = await buildCsrfHeaders({
        'Content-Type': 'application/json',
      });
      const response = await fetch(API_ENDPOINTS.TWO_FA_VERIFY, {
        method: 'POST',
        headers,
        body: JSON.stringify({ code }),
        credentials: 'include',
      });

      let data;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      return {
        ok: response.ok,
        status: response.status,
        ...(data || {}),
      };
    } catch (error) {
      throw error;
    }
  },

  async get2FAConfig() {
    try {
      const response = await fetch(API_ENDPOINTS.TWO_FA_CONFIG, {
        method: 'GET',
        credentials: 'include',
      });

      let data;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      return {
        ok: response.ok,
        status: response.status,
        ...(data || {}),
      };
    } catch (error) {
      throw error;
    }
  },

  async set2FAConfig(enabled, method) {
    try {
      const headers = await buildCsrfHeaders({
        'Content-Type': 'application/json',
      });
      const response = await fetch(API_ENDPOINTS.TWO_FA_CONFIG, {
        method: 'POST',
        headers,
        body: JSON.stringify({ enabled, method }),
        credentials: 'include',
      });

      let data;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      return {
        ok: response.ok,
        status: response.status,
        ...(data || {}),
      };
    } catch (error) {
      throw error;
    }
  },

  async resend2FACode() {
    try {
      const headers = await buildCsrfHeaders({
        'Content-Type': 'application/json',
      });
      const response = await fetch(API_ENDPOINTS.TWO_FA_RESEND, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
        credentials: 'include',
      });

      let data;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      return {
        ok: response.ok,
        status: response.status,
        ...(data || {}),
      };
    } catch (error) {
      throw error;
    }
  },
  async getDashboard() {
    try {
      const response = await fetch(API_ENDPOINTS.DASHBOARD, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.response = { status: response.status };
        throw error;
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  },
  async logout() {
    try {
      const headers = await buildCsrfHeaders();
      const response = await fetch(API_ENDPOINTS.LOGOUT, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.response = { status: response.status };
        throw error;
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  },
  async saveTheme(theme) {
    try {
      const headers = await buildCsrfHeaders({
        'Content-Type': 'application/json',
      });
      const response = await fetch(API_ENDPOINTS.THEME, {
        method: 'POST',
        headers,
        body: JSON.stringify({ theme }),
        credentials: 'include',
      });
      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.response = { status: response.status };
        throw error;
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  },
};
