import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';
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
    console.log('AuthContext: checkAuth called');
    try {
      const data = await api.getDashboard();
      if (data.success) {
        setIsAuthenticated(true);
        setUser(data.user);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('AuthContext: User not authenticated (401)');
        setIsAuthenticated(false);
        setUser(null);
      } else {
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
        return { success: false, error: data.detail || 'Ошибка входа' };
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
