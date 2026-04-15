import { useState, useCallback } from 'react';

/**
 * Hook для управления всеми модальными окнами приложения
 * @returns {Object} - state и функции для управления модалками
 */
export const useModals = () => {
  // Основные модалки
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isSupportSuccessModalOpen, setIsSupportSuccessModalOpen] = useState(false);
  const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Модалки профиля
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isProfileEditModalOpen, setIsProfileEditModalOpen] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  
  // 2FA модалки
  const [isTwoFAModalOpen, setIsTwoFAModalOpen] = useState(false);
  const [isTwoFASetupModalOpen, setIsTwoFASetupModalOpen] = useState(false);
  const [twoFAMessage, setTwoFAMessage] = useState('');
  const [twoFARemainingTime, setTwoFARemainingTime] = useState(300);
  
  // Модалки литературы
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  
  // Модалки новостей
  const [isNewsSortModalOpen, setIsNewsSortModalOpen] = useState(false);

  // Функции открытия
  const openLoginModal = useCallback(() => setIsLoginModalOpen(true), []);
  const openSupportModal = useCallback(() => setIsSupportModalOpen(true), []);
  const openProfileModal = useCallback(() => setIsProfileModalOpen(true), []);
  const openProfileSettings = useCallback(() => setIsProfileSettingsOpen(true), []);
  const openTwoFAModal = useCallback(() => setIsTwoFAModalOpen(true), []);
  const openTwoFASetupModal = useCallback(() => setIsTwoFASetupModalOpen(true), []);
  
  // Функции закрытия
  const closeLoginModal = useCallback(() => setIsLoginModalOpen(false), []);
  const closeSupportModal = useCallback(() => setIsSupportModalOpen(false), []);
  const closeSupportSuccessModal = useCallback(() => setIsSupportSuccessModalOpen(false), []);
  const closeInstructionModal = useCallback(() => setIsInstructionModalOpen(false), []);
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const closeProfileModal = useCallback(() => setIsProfileModalOpen(false), []);
  const closeProfileEditModal = useCallback(() => setIsProfileEditModalOpen(false), []);
  const closeProfileSettings = useCallback(() => setIsProfileSettingsOpen(false), []);
  const closeTwoFAModal = useCallback(() => setIsTwoFAModalOpen(false), []);
  const closeTwoFASetupModal = useCallback(() => setIsTwoFASetupModalOpen(false), []);
  const closeCategoryModal = useCallback(() => setIsCategoryModalOpen(false), []);
  const closeSortModal = useCallback(() => setIsSortModalOpen(false), []);
  
  // Закрыть все модалки профиля (используется при logout)
  const closeAllProfileModals = useCallback(() => {
    setIsProfileModalOpen(false);
    setIsProfileEditModalOpen(false);
    setIsProfileSettingsOpen(false);
  }, []);
  
  // Закрыть все модалки
  const closeAllModals = useCallback(() => {
    setIsLoginModalOpen(false);
    setIsSupportModalOpen(false);
    setIsSupportSuccessModalOpen(false);
    setIsInstructionModalOpen(false);
    setIsMobileMenuOpen(false);
    setIsProfileModalOpen(false);
    setIsProfileEditModalOpen(false);
    setIsProfileSettingsOpen(false);
    setIsTwoFAModalOpen(false);
    setIsTwoFASetupModalOpen(false);
    setIsCategoryModalOpen(false);
    setIsSortModalOpen(false);
    setIsNewsSortModalOpen(false);
  }, []);

  return {
    // State
    isLoginModalOpen,
    isSupportModalOpen,
    isSupportSuccessModalOpen,
    isInstructionModalOpen,
    isMobileMenuOpen,
    isProfileModalOpen,
    isProfileEditModalOpen,
    isProfileSettingsOpen,
    isTwoFAModalOpen,
    isTwoFASetupModalOpen,
    twoFAMessage,
    twoFARemainingTime,
    isCategoryModalOpen,
    isSortModalOpen,
    isNewsSortModalOpen,
    
    // Setters (для прямого управления если нужно)
    setIsLoginModalOpen,
    setIsSupportModalOpen,
    setIsSupportSuccessModalOpen,
    setIsInstructionModalOpen,
    setIsMobileMenuOpen,
    setIsProfileModalOpen,
    setIsProfileEditModalOpen,
    setIsProfileSettingsOpen,
    setIsTwoFAModalOpen,
    setIsTwoFASetupModalOpen,
    setTwoFAMessage,
    setTwoFARemainingTime,
    setIsCategoryModalOpen,
    setIsSortModalOpen,
    setIsNewsSortModalOpen,
    
    // Actions
    openLoginModal,
    openSupportModal,
    openProfileModal,
    openProfileSettings,
    openTwoFAModal,
    openTwoFASetupModal,
    closeLoginModal,
    closeSupportModal,
    closeSupportSuccessModal,
    closeInstructionModal,
    closeMobileMenu,
    closeProfileModal,
    closeProfileEditModal,
    closeProfileSettings,
    closeTwoFAModal,
    closeTwoFASetupModal,
    closeCategoryModal,
    closeSortModal,
    closeAllProfileModals,
    closeAllModals
  };
};
