/**
 * Утилиты для безопасной навигации и обновления состояния
 */

/**
 * Безопасная навигация с обновлением URL
 * @param {string} path - путь для навигации
 * @param {Function} setActiveTab - функция для установки активной вкладки
 */
export const navigateTo = (path, setActiveTab) => {
  // Обновляем активную вкладку
  if (setActiveTab) {
    setActiveTab(path);
  }
  
  // Обновляем URL без перезагрузки
  window.history.pushState({}, '', `#${path}`);
};

/**
 * Безопасная навигация на главную страницу
 * @param {Function} setActiveTab - функция для установки активной вкладки
 */
export const navigateToHome = (setActiveTab) => {
  // Обновляем активную вкладку
  if (setActiveTab) {
    setActiveTab('home');
  }
  
  // Обновляем URL без перезагрузки
  window.history.pushState({}, '', '/');
  
  // Дополнительно очищаем hash если есть
  if (window.location.hash) {
    window.history.replaceState({}, '', window.location.pathname);
  }
};

/**
 * Безопасная навигация на страницу поддержки
 * @param {Function} setActiveTab - функция для установки активной вкладки
 */
export const navigateToSupport = (setActiveTab) => {
  navigateTo('support', setActiveTab);
};

/**
 * Обновление медиа данных без перезагрузки страницы
 * @param {Function} setUserMedia - функция для обновления медиа
 * @param {Function} onRefresh - функция для дополнительного обновления
 */
export const refreshMediaData = async (setUserMedia, onRefresh) => {
  try {
    const response = await fetch('/api/profile/update', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.user) {
        setUserMedia({
          avatar_url: data.user.avatar_url,
          banner_url: data.user.banner_url,
          avatar_placeholder: data.user.avatar_placeholder,
          banner_placeholder: data.user.banner_placeholder
        });
        
        // Вызываем дополнительное обновление если нужно
        if (onRefresh) {
          onRefresh();
        }
      }
    }
  } catch (error) {
    // Ошибка обновления медиа - не критична для UX
  }
};

/**
 * Обновление списка медиа без перезагрузки страницы
 * @param {Function} onMediaUpdate - функция обратного вызова при обновлении
 */
export const refreshMediaList = (onMediaUpdate) => {
  // Вызываем обновление списка медиа
  if (onMediaUpdate) {
    onMediaUpdate();
  }
};

/**
 * Безопасный выход из системы с очисткой состояния
 * @param {Function} logout - функция выхода
 * @param {Function} setActiveTab - функция для установки активной вкладки
 * @param {Function} setIsProfileModalOpen - функция для закрытия модального окна профиля
 */
export const safeLogout = (logout, setActiveTab, setIsProfileModalOpen) => {
  // Закрываем модальное окно если открыто
  if (setIsProfileModalOpen) {
    setIsProfileModalOpen(false);
  }
  
  // Выполняем выход
  if (logout) {
    logout();
  }
  
  // Переходим на главную
  if (setActiveTab) {
    setActiveTab('home');
  }
};

/**
 * Обработка ошибок с возможностью обновления
 * @param {Error} error - объект ошибки
 * @param {string} userMessage - сообщение для пользователя
 * @param {Function} onRetry - функция для повтора операции
 */
export const handleError = (error, userMessage, onRetry) => {
  if (onRetry) {
    // Можно добавить логику повтора операции
    console.error('Operation failed:', error);
  }
};
