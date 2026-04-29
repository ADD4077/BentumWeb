import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  GraduationCap,
  Moon,
  Sun,
  User,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext.jsx';
import { buildMediaUrl } from '../utils/media.js';

const SCROLLBAR_HIDE_STYLES = `
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
`;

const NAV_ITEMS = [
  { id: 'home', label: 'Главная' },
  { id: 'schedule', label: 'Расписание' },
  { id: 'literature', label: 'Литература' },
  { id: 'news', label: 'Новости' },
  { id: 'games', label: 'Игровая' },
];

function BurgerIcon({ isOpen }) {
  const baseLineStyle = {
    position: 'absolute',
    left: 0,
    width: '24px',
    height: '2px',
    borderRadius: '9999px',
    backgroundColor: 'currentColor',
    transformOrigin: 'center',
    willChange: 'top, transform, opacity',
    transition:
      'top 450ms cubic-bezier(0.22,1,0.36,1), transform 450ms cubic-bezier(0.22,1,0.36,1), opacity 320ms cubic-bezier(0.22,1,0.36,1)',
  };

  return (
    <span className="relative block h-6 w-6" aria-hidden="true">
      <span
        style={{
          ...baseLineStyle,
          top: `${isOpen ? 12 : 4}px`,
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
      />
      <span
        style={{
          ...baseLineStyle,
          top: '12px',
          opacity: isOpen ? 0 : 1,
          transform: isOpen ? 'scaleX(0.75)' : 'scaleX(1)',
        }}
      />
      <span
        style={{
          ...baseLineStyle,
          top: `${isOpen ? 12 : 20}px`,
          transform: isOpen ? 'rotate(-45deg)' : 'rotate(0deg)',
        }}
      />
    </span>
  );
}

function NavButton({ active, label, onClick, admin = false, mobile = false }) {
  if (admin) {
    return (
      <button
        onClick={onClick}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
          active
            ? 'text-emerald-700 dark:text-emerald-300'
            : 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300'
        } ${mobile ? 'w-full text-left py-3' : 'whitespace-nowrap'}`}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
        active
          ? 'bg-slate-200 text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
      } ${mobile ? 'w-full py-3 text-left' : 'whitespace-nowrap'}`}
    >
      {label}
    </button>
  );
}

function Header({
  activeTab,
  setActiveTab,
  darkMode,
  toggleTheme,
  setIsLoginModalOpen,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  setIsProfileModalOpen,
  userMedia,
}) {
  const { isAuthenticated, user, logout } = useAuth();
  const [isHeaderPill, setIsHeaderPill] = useState(!isMobileMenuOpen);
  const headerRef = useRef(null);

  const isAdmin = Boolean(isAuthenticated && user?.is_admin);

  const navItems = useMemo(() => {
    const items = [...NAV_ITEMS];
    if (isAdmin) {
      items.push({ id: 'admin', label: 'Админ', admin: true });
    }
    return items;
  }, [isAdmin]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      setIsHeaderPill(false);
      return;
    }

    const timeout = setTimeout(() => {
      setIsHeaderPill(true);
    }, 300);

    return () => clearTimeout(timeout);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    const handlePointerDown = (event) => {
      if (window.matchMedia && window.matchMedia('(max-width: 767px)').matches) {
        return;
      }

      if (!headerRef.current?.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isMobileMenuOpen, setIsMobileMenuOpen]);

  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = SCROLLBAR_HIDE_STYLES;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  const renderAvatar = () => {
    if (userMedia?.avatar_url) {
      return (
        <img
          src={buildMediaUrl(userMedia.avatar_url)}
          alt="Profile Avatar"
          className="h-full w-full object-cover"
        />
      );
    }

    if (userMedia?.avatar_placeholder) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-gray-200 font-bold text-gray-400 dark:bg-slate-700 dark:text-slate-500">
          {userMedia.avatar_placeholder.initials}
        </div>
      );
    }

    if (user?.fullname?.charAt(0)) {
      return <span className="font-bold text-gray-400 dark:text-slate-500">{user.fullname.charAt(0)}</span>;
    }

    return <User className="h-5 w-5 text-gray-400 dark:text-slate-500" />;
  };

  const themeButton = (
    <button
      onClick={toggleTheme}
      className="rounded-full border border-transparent bg-gray-100 p-2.5 text-slate-600 transition-all hover:border-gray-200 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-700"
    >
      {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );

  return (
    <header ref={headerRef} className="sticky top-0 z-50 w-full bg-transparent">
      <div className="container mx-auto px-6 py-4">
        <div
          className={`nav-shell glass-surface relative mx-auto max-w-4xl border border-gray-200 bg-gray-100/50 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20 ${
            isHeaderPill ? 'rounded-full' : 'rounded-[32px]'
          }`}
        >
          <div className="flex h-16 items-center justify-between px-4">
            <div
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-emerald-500 transition-all hover:bg-emerald-600"
              onClick={() => setActiveTab('home')}
            >
              <GraduationCap className="h-6 w-6 text-white" />
            </div>

            {isAuthenticated ? (
              <>
                <nav className="scrollbar-hide hidden items-center gap-2 overflow-x-auto md:flex">
                  {navItems.map((item) => (
                    <NavButton
                      key={item.id}
                      active={activeTab === item.id}
                      label={item.label}
                      admin={item.admin}
                      onClick={() => setActiveTab(item.id)}
                    />
                  ))}
                </nav>

                <div className="hidden items-center gap-2 md:flex">
                  {themeButton}
                  <button
                    className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-slate-600 transition-all hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                    onClick={() => setIsProfileModalOpen(true)}
                    aria-label="Профиль"
                  >
                    {renderAvatar()}
                  </button>
                </div>

                <div className="flex items-center gap-2 md:hidden">
                  {themeButton}
                  <button
                    className="rounded-full bg-gray-100 p-3 text-slate-600 transition-all hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-expanded={isMobileMenuOpen}
                    aria-label="Меню"
                  >
                    <BurgerIcon isOpen={isMobileMenuOpen} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                {themeButton}
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition-all hover:bg-slate-300 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500 md:px-6 md:py-2.5"
                >
                  Войти
                </button>
              </div>
            )}
          </div>

          <div
            className={`grid overflow-hidden transition-[grid-template-rows,opacity,transform,padding] duration-300 ease-out ${
              isMobileMenuOpen
                ? 'grid-rows-[1fr] translate-y-0 pb-4 opacity-100'
                : 'grid-rows-[0fr] -translate-y-2 pb-0 opacity-0'
            }`}
          >
            <div className="min-h-0">
              <div className="px-4">
                <div className="flex flex-col gap-3">
                  {isAuthenticated ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setIsProfileModalOpen(true);
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex flex-1 items-center gap-3 rounded-full px-4 py-3 text-left transition-all hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                          {renderAvatar()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-900 dark:text-white">
                            {user?.fullname || 'Пользователь'}
                          </div>
                          <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {user?.faculty || 'Студент'}
                          </div>
                        </div>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setIsLoginModalOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full rounded-2xl bg-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition-all hover:bg-slate-300 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500"
                    >
                      Войти
                    </button>
                  )}
                </div>

                {isAuthenticated ? (
                  <nav className="mt-4 flex flex-col gap-2 md:hidden">
                    {navItems.map((item) => (
                      <NavButton
                        key={item.id}
                        active={activeTab === item.id}
                        label={item.label}
                        admin={item.admin}
                        mobile
                        onClick={() => handleSelectTab(item.id)}
                      />
                    ))}
                  </nav>
                ) : null}

              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
