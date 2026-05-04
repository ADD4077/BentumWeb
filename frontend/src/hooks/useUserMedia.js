import { useCallback, useEffect, useState } from 'react';

function extractMedia(user) {
  return {
    avatar_url: user?.avatar_url || null,
    banner_url: user?.banner_url || null,
    avatar_placeholder: user?.avatar_placeholder || null,
    banner_placeholder: user?.banner_placeholder || null,
  };
}

export const useUserMedia = (_isAuthenticated, user) => {
  const [userMedia, setUserMedia] = useState(extractMedia(user));

  useEffect(() => {
    setUserMedia(extractMedia(user));
  }, [user]);

  const handleProfileUpdate = useCallback((updatedUser) => {
    if (updatedUser) {
      setUserMedia(extractMedia(updatedUser));
    }
  }, []);

  const forceRefresh = useCallback((updatedData) => {
    if (updatedData) {
      setUserMedia(extractMedia(updatedData));
      return;
    }
    setUserMedia(extractMedia(user));
  }, [user]);

  return {
    avatar_url: userMedia.avatar_url,
    banner_url: userMedia.banner_url,
    avatar_placeholder: userMedia.avatar_placeholder,
    banner_placeholder: userMedia.banner_placeholder,
    handleProfileUpdate,
    forceRefresh,
  };
};

export default useUserMedia;
