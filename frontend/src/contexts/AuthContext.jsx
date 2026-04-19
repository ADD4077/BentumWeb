import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { clearAuthStorage, safeSetUserData } from '../utils/storage.js';

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
      const auth = await api.authCheck();

      if (auth?.success && auth?.user) {
        setIsAuthenticated(true);
        setUser(auth.user);
        safeSetUserData(auth.user);
        setRequires2FA(false);
      } else if (auth?.requires_2fa) {
        setIsAuthenticated(false);
        setUser(auth.user);
        setRequires2FA(true);
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setRequires2FA(false);
        clearAuthStorage();
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      setRequires2FA(false);
      clearAuthStorage();
    } finally {
      setLoading(false);
    }
  };

  const login = async (studentCode, password) => {
    try {
      const data = await api.saveData({
        studentCode,
        password,
      });

      if (data.success) {
        if (data.requires_2fa) {
          setIsAuthenticated(false);
          setUser(data.user);
          setRequires2FA(true);
          setRemainingTime(data.remaining_time || 300);
          safeSetUserData(data.user);
          return { success: true, requires_2fa: true, remaining_time: data.remaining_time || 300 };
        }

        setIsAuthenticated(true);
        setUser(data.user);
        setRequires2FA(false);
        setRemainingTime(300);
        safeSetUserData(data.user);
        return { success: true };
      }

      return { success: false, error: data.detail || 'Ошибка входа' };
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
        await checkAuth();
        return { success: true };
      }

      return { success: false, error: response.detail || 'Неверный код' };
    } catch (error) {
      return { success: false, error: 'Ошибка соединения с сервером' };
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      // Ignore network/logout errors and always clear local auth state.
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      setRequires2FA(false);
      clearAuthStorage();
    }
  };

  const saveTheme = async (theme) => {
    try {
      await api.saveTheme(theme);
    } catch (error) {
      // Theme persistence failures are non-critical for auth flow.
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
    }}
    >
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
