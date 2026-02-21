import { useState, useEffect } from 'react';
import { api } from '../services/api.js';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Проверка аутентификации при загрузке
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const data = await api.getDashboard();
      if (data.success) {
        setIsAuthenticated(true);
        setUser(data.user);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (studentCode, password) => {
    try {
      const data = await api.saveData({
        student_code: studentCode,
        password: password,
      });

      if (data.success) {
        setIsAuthenticated(true);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Ошибка входа' };
      }
    } catch (error) {
      return { success: false, error: 'Ошибка соединения с сервером' };
    }
  };

  const logout = async () => {
    try {
      await api.logout();
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const saveTheme = async (theme) => {
    try {
      await api.saveTheme(theme);
    } catch (error) {
      console.error('Save theme error:', error);
    }
  };

  return {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    saveTheme,
    checkAuth,
  };
};
