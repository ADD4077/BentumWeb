// API сервис для связи с backend

const API_BASE_URL = 'http://localhost:8000';

export const api = {
  // Сохранение данных пользователя
  async saveData(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/save_data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData),
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
      console.error('Error saving data:', error);
      throw error;
    }
  },

  // Получение данных дашборда
  async getDashboard() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard`, {
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
      console.error('Error getting dashboard:', error);
      throw error;
    }
  },

  // Выход из системы
  async logout() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/logout`, {
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
      console.error('Error logging out:', error);
      throw error;
    }
  },

  // Сохранение темы
  async saveTheme(theme) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/theme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ theme }),
      });
      
      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.response = { status: response.status };
        throw error;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error saving theme:', error);
      throw error;
    }
  },
};
