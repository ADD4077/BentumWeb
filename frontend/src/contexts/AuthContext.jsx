import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);

  // Проверка аутентификации при загрузке
  useEffect(() => {
    if (!checked) {
      checkAuth();
      setChecked(true);
    }
  }, [checked]);

  const checkAuth = async () => {
    console.log('AuthContext: checkAuth called');
    try {
      const data = await api.getDashboard();
      if (data.success) {
        setIsAuthenticated(true);
        setUser(data.user);
      }
    } catch (error) {
      // 401 - это не ошибка соединения, а ожидаемый ответ для неавторизованного
      if (error.response?.status === 401) {
        console.log('AuthContext: User not authenticated (401)');
        setIsAuthenticated(false);
        setUser(null);
      } else {
        // Другие ошибки считаем ошибкой соединения
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (studentCode, password) => {
    try {
      const data = await api.saveData({
        studentCode: studentCode,
        studentRedCode: password,
      });

      if (data.success) {
        setIsAuthenticated(true);
        setUser(data.user);
        return { success: true };
      } else {
        // data.ok === false, но ответ от сервера есть — показываем его текст
        return { success: false, error: data.detail || 'Ошибка входа' };
      }
    } catch (error) {
      // Реальный обрыв соединения или CORS
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

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      loading,
      login,
      logout,
      saveTheme,
      checkAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
