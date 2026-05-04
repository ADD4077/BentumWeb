import React, { createContext, useContext, useState, useCallback } from 'react';

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isSupportSuccessModalOpen, setIsSupportSuccessModalOpen] = useState(false);
  const [isProfileEditModalOpen, setIsProfileEditModalOpen] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isNewsSortModalOpen, setIsNewsSortModalOpen] = useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [is2FASetupModalOpen, setIs2FASetupModalOpen] = useState(false);

  // Состояние сортировки литературы (общее для страницы и модалок)
  const [literatureSortBy, setLiteratureSortBy] = useState('default');
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Состояние сортировки новостей (общее для страницы и модалок)
  const [newsSortBy, setNewsSortBy] = useState('date_desc');

  const closeAllModals = useCallback(() => {
    setIsProfileModalOpen(false);
    setIsLoginModalOpen(false);
    setIsAboutModalOpen(false);
    setIsInstructionModalOpen(false);
    setIsSupportModalOpen(false);
    setIsSupportSuccessModalOpen(false);
    setIsProfileEditModalOpen(false);
    setIsProfileSettingsOpen(false);
    setIsCategoryModalOpen(false);
    setIsSortModalOpen(false);
    setIsNewsSortModalOpen(false);
    setIs2FAModalOpen(false);
    setIs2FASetupModalOpen(false);
  }, []);

  return (
    <ModalContext.Provider value={{
      isProfileModalOpen, setIsProfileModalOpen,
      isLoginModalOpen, setIsLoginModalOpen,
      isAboutModalOpen, setIsAboutModalOpen,
      isInstructionModalOpen, setIsInstructionModalOpen,
      isSupportModalOpen, setIsSupportModalOpen,
      isSupportSuccessModalOpen, setIsSupportSuccessModalOpen,
      isProfileEditModalOpen, setIsProfileEditModalOpen,
      isProfileSettingsOpen, setIsProfileSettingsOpen,
      isCategoryModalOpen, setIsCategoryModalOpen,
      isSortModalOpen, setIsSortModalOpen,
      isNewsSortModalOpen, setIsNewsSortModalOpen,
      is2FAModalOpen, setIs2FAModalOpen,
      is2FASetupModalOpen, setIs2FASetupModalOpen,
      // Сортировка
      literatureSortBy, setLiteratureSortBy,
      selectedCategories, setSelectedCategories,
      newsSortBy, setNewsSortBy,
      closeAllModals,
    }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export default ModalContext;
