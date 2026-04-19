import React from 'react';
import LoginModal from '../LoginModal.jsx';
import SupportModal from '../SupportModal.jsx';
import InstructionModal from '../InstructionModal.jsx';
import ProfileEditModal from '../ProfileEditModal.jsx';
import SupportSuccessModal from '../SupportSuccessModal.jsx';
import TwoFAModal from '../TwoFAModal.jsx';
import TwoFASetupModal from '../TwoFASetupModal.jsx';
import { useModal } from '../../contexts/ModalContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useUserMedia } from '../../hooks/useUserMedia.js';
import { useTheme } from '../../hooks/useTheme.js';

/**
 * AppModals - все модалки приложения в одном месте
 * Используют ModalContext и другие контексты для получения состояния
 */
export const AppModals = () => {
  const { darkMode } = useTheme();
  const { isAuthenticated, user, checkAuth, remainingTime } = useAuth();
  const userMedia = useUserMedia(isAuthenticated, user);
  
  const {
    isLoginModalOpen, setIsLoginModalOpen,
    isSupportModalOpen, setIsSupportModalOpen,
    isSupportSuccessModalOpen, setIsSupportSuccessModalOpen,
    isInstructionModalOpen, setIsInstructionModalOpen,
    isProfileEditModalOpen, setIsProfileEditModalOpen,
    is2FAModalOpen, setIs2FAModalOpen,
    is2FASetupModalOpen, setIs2FASetupModalOpen
  } = useModal();

  // Обработчики 2FA
  const handle2FAModalClose = () => {
    setIs2FAModalOpen(false);
  };

  const handle2FASuccess = () => {
    checkAuth();
  };

  const handle2FASetupSuccess = () => {
    // Успешная настройка 2FA
  };

  return (
    <>
      <LoginModal 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onInstructionOpen={() => setIsInstructionModalOpen(true)}
      />
      <SupportModal 
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        darkMode={darkMode}
        onSuccess={() => setIsSupportSuccessModalOpen(true)}
      />
      <InstructionModal 
        isOpen={isInstructionModalOpen}
        onClose={() => setIsInstructionModalOpen(false)}
        darkMode={darkMode}
        onSupportOpen={() => {
          setIsInstructionModalOpen(false);
          setIsSupportModalOpen(true);
        }}
      />
      {isProfileEditModalOpen && (
        <ProfileEditModal 
          isOpen={isProfileEditModalOpen}
          onClose={() => setIsProfileEditModalOpen(false)}
          darkMode={darkMode}
          user={user}
          onProfileUpdate={userMedia.handleProfileUpdate}
          onForceRefresh={userMedia.forceRefresh}
        />
      )}
      {isSupportSuccessModalOpen && (
        <SupportSuccessModal 
          isOpen={isSupportSuccessModalOpen}
          onClose={() => setIsSupportSuccessModalOpen(false)}
          darkMode={darkMode}
        />
      )}
      <TwoFAModal 
        isOpen={is2FAModalOpen}
        onClose={handle2FAModalClose}
        onSuccess={handle2FASuccess}
        darkMode={darkMode}
        remainingTime={remainingTime}
      />
      <TwoFASetupModal 
        isOpen={is2FASetupModalOpen}
        onClose={() => setIs2FASetupModalOpen(false)}
        onSuccess={handle2FASetupSuccess}
        darkMode={darkMode}
      />
    </>
  );
};

export default AppModals;
