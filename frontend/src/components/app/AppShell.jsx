import React from 'react';

import Header from '../Header.jsx';

export const AppShell = ({
  hideHeader,
  activeTab,
  setActiveTab,
  darkMode,
  toggleTheme,
  setIsLoginModalOpen,
  setIsSupportModalOpen,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  isProfileModalOpen,
  setIsProfileModalOpen,
  userMedia,
  children,
}) => {
  return (
    <>
      {!hideHeader ? (
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          darkMode={darkMode}
          toggleTheme={toggleTheme}
          setIsLoginModalOpen={setIsLoginModalOpen}
          setIsSupportModalOpen={setIsSupportModalOpen}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          isProfileModalOpen={isProfileModalOpen}
          setIsProfileModalOpen={setIsProfileModalOpen}
          userMedia={userMedia}
        />
      ) : null}

      <main className="relative z-10 container mx-auto flex-1 px-4 pb-12 pt-8">
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-slate-500 dark:text-slate-400">
            <p>© 2026 Bentum. Все права защищены.</p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default AppShell;
