import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { safeGetUserData, safeSetUserData, safeRemoveItem } from '../utils/storage.js';
const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [remainingTime, setRemainingTime] = useState(300);
  
  useEffect(() => {
    if (!checked) {
      checkAuth();
      setChecked(true);
    }
  }, [checked]);
  
  const checkAuth = async () => {
    try {
      const storedUser = safeGetUserData();

      if (!storedUser) {
        setIsAuthenticated(false);
        setUser(null);
        setRequires2FA(false);
        return;
      }

      const auth = await api.authCheck();

      if (auth?.success && auth?.user) {
        setIsAuthenticated(true);
        setUser(auth.user);
        safeSetUserData(auth.user);
        setRequires2FA(false);
      } else if (auth?.requires_2fa) {
        // Сессия создана, но требуется 2FA
        setIsAuthenticated(false);
        setUser(auth.user);
        setRequires2FA(true);
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setRequires2FA(false);
        safeRemoveItem('token');
        safeRemoveItem('user');
        safeRemoveItem('banEndDate');
        safeRemoveItem('activeTab');
      }
    } catch (error) {
      // Любая ошибка - считаем пользователя неавторизованным
      setIsAuthenticated(false);
      setUser(null);
      setRequires2FA(false);
      safeRemoveItem('token');
      safeRemoveItem('user');
      safeRemoveItem('banEndDate');
      safeRemoveItem('activeTab');
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
        if (data.requires_2fa) {
          // Вход выполнен, но требуется 2FA
          setIsAuthenticated(false);
          setUser(data.user);
          setRequires2FA(true);
          setRemainingTime(data.remaining_time || 300);
          safeSetUserData(data.user);
          return { success: true, requires_2fa: true, remaining_time: data.remaining_time || 300 };
        } else {
          // Вход выполнен полностью
          setIsAuthenticated(true);
          setUser(data.user);
          setRequires2FA(false);
          setRemainingTime(300);
          safeSetUserData(data.user);
          return { success: true };
        }
      } else {
        return { success: false, error: data.detail || 'Ошибка входа' };
      }
    } catch (error) {
      return { success: false, error: 'Ошибка соединения с сервером' };
    }
  };
  
  const verify2FA = async (code) => {
    try {
      const response = await api.verify2FACode(code);
      
      if (response.success) {
        setIsAuthenticated(true);
        setRequires2FA(false);
        // Обновляем данные пользователя после успешной 2FA
        await checkAuth();
        return { success: true };
      } else {
        return { success: false, error: response.detail || 'Неверный код' };
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
      setRequires2FA(false);
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
      verify2FA,
      logout,
      saveTheme,
      checkAuth,
      requires2FA,
      setRequires2FA,
      remainingTime,
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
