import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { safeGetUserData, safeSetUserData, safeRemoveItem } from '../utils/storage.js';
const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (!checked) {
      checkAuth();
      setChecked(true);
    }
  }, [checked]);
  const checkAuth = async () => {
    try {
      // Проверяем только localStorage без API запросов
      const storedUser = safeGetUserData();
      if (storedUser) {
        setIsAuthenticated(true);
        setUser(storedUser);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      // Любая ошибка - считаем пользователя неавторизованным
      setIsAuthenticated(false);
      setUser(null);
      safeRemoveItem('user');
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
        // Безопасно сохраняем данные пользователя
        safeSetUserData(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.detail || 'Ошибка входа' };
      }
    } catch (error) {
      return { success: false, error: 'Ошибка соединения с сервером' };
    }
  };
  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      // Всегда очищаем данные локально при ошибке
    } finally {
      // Всегда очищаем данные локально
      setIsAuthenticated(false);
      setUser(null);
      safeRemoveItem('token');
      safeRemoveItem('user');
      safeRemoveItem('banEndDate');
      safeRemoveItem('activeTab');
    }
  };
  const saveTheme = async (theme) => {
    try {
      await api.saveTheme(theme);
    } catch (error) {
      // Ошибка сохранения темы не критична
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
