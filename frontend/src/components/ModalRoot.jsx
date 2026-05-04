import React from 'react';
import CategoryModal from './modals/CategoryModal.jsx';
import SortModal from './modals/SortModal.jsx';
import NewsSortModal from './modals/NewsSortModal.jsx';
import ProfileModal from './modals/ProfileModal.jsx';
import AppModals from './modals/AppModals.jsx';

/**
 * ModalRoot - центральный компонент для всех модалок
 * Использует ModalContext для управления состоянием
 */
export const ModalRoot = () => {
  return (
    <>
      <CategoryModal />
      <SortModal />
      <NewsSortModal />
      <ProfileModal />
      <AppModals />
    </>
  );
};

export default ModalRoot;
