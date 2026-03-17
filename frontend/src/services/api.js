import { API_ENDPOINTS } from '../config/api.js';

export const api = {
  async saveData(userData) {
    try {
      const response = await fetch(API_ENDPOINTS.SAVE_DATA, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include',
      });
      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.response = { status: response.status };
        throw error;
      }
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
      const response = await fetch(API_ENDPOINTS.LOGOUT, {
        method: 'POST',
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
      const response = await fetch(API_ENDPOINTS.THEME, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
