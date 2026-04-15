import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from '../config/api.js';

export const useUserMedia = (isAuthenticated, user, isProfileModalOpen) => {
  const [userMedia, setUserMedia] = useState({
    avatar_url: null,
    banner_url: null,
    avatar_placeholder: null,
    banner_placeholder: null
  });

  const fetchUserMedia = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch(API_ENDPOINTS.AUTH_CHECK, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Поддержка двух форматов ответа: {user: {...}} или прямой {...}
          const userData = data.user || data;
          setUserMedia({
            avatar_url: userData.avatar_url,
            banner_url: userData.banner_url,
            avatar_placeholder: userData.avatar_placeholder,
            banner_placeholder: userData.banner_placeholder
          });
        }
      }
    } catch (error) {
      console.error('User media fetch error:', error);
    }
  }, [isAuthenticated]);

  // Загрузка при монтировании и смене user
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserMedia();
    }
  }, [isAuthenticated, user, fetchUserMedia]);

  // Обновление при открытии модального окна профиля
  useEffect(() => {
    if (isProfileModalOpen && isAuthenticated) {
      fetchUserMedia();
    }
  }, [isProfileModalOpen, isAuthenticated, fetchUserMedia]);

  // Fallback: синхронизация с данными из user (если API недоступен)
  useEffect(() => {
    if (user && (user.avatar_url || user.avatar_placeholder)) {
      setUserMedia(prev => {
        // Обновляем только если данные отсутствуют
        if (!prev.avatar_url && !prev.avatar_placeholder) {
          const newMedia = {
            avatar_url: user.avatar_url,
            banner_url: user.banner_url,
            avatar_placeholder: user.avatar_placeholder,
            banner_placeholder: user.banner_placeholder
          };
          return newMedia;
        }
        return prev;
      });
    }
  }, [user]);

  const handleProfileUpdate = useCallback((updatedUser) => {
    if (updatedUser) {
      setUserMedia({
        avatar_url: updatedUser.avatar_url,
        banner_url: updatedUser.banner_url,
        avatar_placeholder: updatedUser.avatar_placeholder,
        banner_placeholder: updatedUser.banner_placeholder
      });
    }
  }, []);

  const forceRefresh = useCallback((updatedData) => {
    if (updatedData) {
      setUserMedia({
        avatar_url: updatedData.avatar_url,
        banner_url: updatedData.banner_url,
        avatar_placeholder: updatedData.avatar_placeholder,
        banner_placeholder: updatedData.banner_placeholder
      });
    } else if (user) {
      setUserMedia({
        avatar_url: user.avatar_url,
        banner_url: user.banner_url,
        avatar_placeholder: user.avatar_placeholder,
        banner_placeholder: user.banner_placeholder
      });
    }
  }, [user]);

  const result = {
    // Spread media fields directly for easy access (userMedia.avatar_url)
    avatar_url: userMedia.avatar_url,
    banner_url: userMedia.banner_url,
    avatar_placeholder: userMedia.avatar_placeholder,
    banner_placeholder: userMedia.banner_placeholder,
    // Methods
    handleProfileUpdate,
    forceRefresh
  };
  return result;
};

export default useUserMedia;
