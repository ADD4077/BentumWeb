import { useState, useEffect, useCallback } from 'react';
import { getCachedItem, setCachedItem } from '../utils/storage.js';

/**
 * Hook для управления темой (dark/light mode)
 * @returns {Object} { darkMode, toggleTheme, setDarkMode }
 */
export const useTheme = () => {
  // Инициализация из кэша (5 минут)
  const [darkMode, setDarkMode] = useState(() => {
    return getCachedItem('darkMode', true, 300000);
  });

  // Применение темы к документу
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      // Update theme-color for mobile browsers
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', '#0B0F19');
      }
    } else {
      document.documentElement.classList.remove('dark');
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', '#f0fdf4');
      }
    }
  }, [darkMode]);

  // Сохранение в кэш при изменении
  useEffect(() => {
    setCachedItem('darkMode', darkMode);
  }, [darkMode]);

  // Функция переключения темы
  const toggleTheme = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  return {
    darkMode,
    toggleTheme,
    setDarkMode
  };
};
