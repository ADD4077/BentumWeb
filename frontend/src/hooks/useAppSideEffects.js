import { useEffect } from 'react';

import { safeGetItem, safeRemoveItem, safeSetItem } from '../utils/storage.js';

export function useAppSideEffects({
  activeTab,
  setActiveTab,
  setIsSupportModalOpen,
  setIsLoginModalOpen,
  setIsProfileModalOpen,
  isProfileSettingsOpen,
  isProfileModalOpen,
  requires2FA,
  setIs2FAModalOpen,
}) {
  useEffect(() => {
    const currentPath = window.location.pathname;
    const validPaths = ['/', '/home', '/schedule', '/literature', '/news', '/games'];
    const isValidPath = validPaths.some(
      (path) => currentPath === path || currentPath.startsWith(`${path}/`),
    );

    if (!isValidPath && currentPath !== '/') {
      setActiveTab('404');
    }
  }, [setActiveTab]);

  useEffect(() => {
    if (activeTab !== 'home') {
      safeSetItem('activeTab', activeTab);
    } else {
      safeRemoveItem('activeTab');
    }

    if (activeTab === 'support') {
      setIsSupportModalOpen(true);
      setActiveTab('home');
    } else if (activeTab === 'login') {
      setIsLoginModalOpen(true);
      setActiveTab('home');
    }
  }, [activeTab, setActiveTab, setIsLoginModalOpen, setIsSupportModalOpen]);

  useEffect(() => {
    const shouldOpenProfileModal = safeGetItem('openProfileModal', false);
    if (shouldOpenProfileModal) {
      setIsProfileModalOpen(true);
      safeRemoveItem('openProfileModal');
    }
  }, [setIsProfileModalOpen]);

  useEffect(() => {
    if (requires2FA) {
      setIs2FAModalOpen(true);
    }
  }, [requires2FA, setIs2FAModalOpen]);

  useEffect(() => {
    if (isProfileSettingsOpen && isProfileModalOpen) {
      setIsProfileModalOpen(false);
    }
  }, [isProfileModalOpen, isProfileSettingsOpen, setIsProfileModalOpen]);

}
