import { useState, useEffect, useCallback } from 'react';
import { safeGetItem, safeSetItem } from '../utils/storage.js';

const VALID_TABS = ['home', 'schedule', 'literature', 'news', 'support', 'moder', 'login', 'profile', 'admin', 'privacy', '404'];
const DEFAULT_TAB = 'home';

/**
 * Hook для управления навигацией и глобальным поиском
 * @returns {Object} { activeTab, setActiveTab, navigateTo, searchQuery, setSearchQuery }
 */
export const useNavigation = () => {
  // Инициализация из localStorage
  const [activeTab, setActiveTabState] = useState(() => {
    const saved = safeGetItem('activeTab', DEFAULT_TAB);
    return VALID_TABS.includes(saved) ? saved : DEFAULT_TAB;
  });

  // Глобальный поисковый запрос (используется в header и страницах)
  const [searchQuery, setSearchQuery] = useState('');

  // Сохранение в localStorage при изменении
  useEffect(() => {
    if (activeTab !== DEFAULT_TAB) {
      safeSetItem('activeTab', activeTab);
    }
  }, [activeTab]);

  // Безопасная установка вкладки
  const setActiveTab = useCallback((tab) => {
    if (VALID_TABS.includes(tab)) {
      setActiveTabState(tab);
    } else {
      console.warn(`Invalid tab: ${tab}, falling back to ${DEFAULT_TAB}`);
      setActiveTabState(DEFAULT_TAB);
    }
  }, []);

  // Удобный метод навигации с опциональным callback
  const navigateTo = useCallback((tab, onNavigate) => {
    setActiveTab(tab);
    if (typeof onNavigate === 'function') {
      onNavigate(tab);
    }
  }, [setActiveTab]);

  // Проверка валидности вкладки
  const isValidTab = useCallback((tab) => {
    return VALID_TABS.includes(tab);
  }, []);

  return {
    activeTab,
    setActiveTab,
    navigateTo,
    isValidTab,
    VALID_TABS,
    searchQuery,
    setSearchQuery
  };
};
