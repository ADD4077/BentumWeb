// Header компонент - шапка сайта
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { LogOut, GraduationCap, Sun, Moon, User } from 'lucide-react';

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
    transition: 'top 450ms cubic-bezier(0.22,1,0.36,1), transform 450ms cubic-bezier(0.22,1,0.36,1), opacity 320ms cubic-bezier(0.22,1,0.36,1)',
  };

  const topClosed = 4;
  const middle = 12;
  const bottomClosed = 20;

  const topStyle = {
    ...baseLineStyle,
    top: `${isOpen ? middle : topClosed}px`,
    transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
  };

  const middleStyle = {
    ...baseLineStyle,
    top: `${middle}px`,
    opacity: isOpen ? 0 : 1,
    transform: isOpen ? 'scaleX(0.75)' : 'scaleX(1)',
  };

  const bottomStyle = {
    ...baseLineStyle,
    top: `${isOpen ? middle : bottomClosed}px`,
    transform: isOpen ? 'rotate(-45deg)' : 'rotate(0deg)',
  };

  return (
    <span className="relative block w-6 h-6" aria-hidden="true">
      <span style={topStyle} />
      <span style={middleStyle} />
      <span style={bottomStyle} />
    </span>
  );
}

function Header({ activeTab, setActiveTab, darkMode, toggleTheme, setIsLoginModalOpen, isMobileMenuOpen, setIsMobileMenuOpen }) {
  const { isAuthenticated, user, logout } = useAuth();

  const [isHeaderPill, setIsHeaderPill] = useState(!isMobileMenuOpen);

  const headerRef = useRef(null);

  useEffect(() => {
    if (isMobileMenuOpen) {
      setIsHeaderPill(false);
      return;
    }

    const t = setTimeout(() => {
      setIsHeaderPill(true);
    }, 300);

    return () => clearTimeout(t);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    const onPointerDown = (e) => {
      // On mobile devices the menu should not close on outside taps/swipes.
      // Keep outside-click close only for desktop widths.
      if (window.matchMedia && window.matchMedia('(max-width: 767px)').matches) {
        return;
      }
      if (!headerRef.current) return;
      if (!headerRef.current.contains(e.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isMobileMenuOpen, setIsMobileMenuOpen]);

  return (
    <>
      <header ref={headerRef} className="sticky top-0 z-50 w-full bg-transparent">
        <div className="container mx-auto px-6 py-4">
          <div className={`relative bg-gray-100/50 dark:bg-slate-800/50 backdrop-blur-md border border-gray-200 dark:border-slate-700/50 shadow-lg shadow-gray-900/10 dark:shadow-black/20 ${
            isHeaderPill ? 'rounded-full' : 'rounded-[32px]'
          }`}>
            <div className="h-16 flex items-center justify-between px-4">
          
          {/* Center Navigation */}
          {isAuthenticated ? (
            <>
              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center justify-between w-full">
                {/* Logo */}
                <div 
                  className="flex items-center justify-center w-10 h-10 cursor-pointer rounded-full bg-emerald-500 hover:bg-emerald-600 transition-all"
                  onClick={() => setActiveTab('home')}
                >
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setActiveTab('home')}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'home' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white/40 dark:bg-slate-900/20'}`}
                  >
                    Главная
                  </button>
                  <button 
                    onClick={() => setActiveTab('schedule')}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'schedule' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white/40 dark:bg-slate-900/20'}`}
                  >
                    Расписание
                  </button>
                  <button 
                    onClick={() => setActiveTab('literature')}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'literature' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white/40 dark:bg-slate-900/20'}`}
                  >
                    Литература
                  </button>
                  <button 
                    onClick={() => setActiveTab('news')}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'news' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white/40 dark:bg-slate-900/20'}`}
                  >
                    Новости
                  </button>
                  <button 
                    onClick={() => setActiveTab('games')}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'games' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white/40 dark:bg-slate-900/20'}`}
                  >
                    Игровая
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Theme Toggle */}
                  <button 
                    onClick={toggleTheme}
                    className="p-2.5 rounded-full bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
                  >
                    {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>
                  
                  {/* Burger Menu */}
                  <button 
                    className="p-2.5 rounded-full bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-expanded={isMobileMenuOpen}
                    aria-label="Меню"
                  >
                    <BurgerIcon isOpen={isMobileMenuOpen} />
                  </button>
                </div>
              </nav>

              {/* Mobile Navigation */}
              <nav className="md:hidden flex items-center justify-between w-full">
                {/* Logo */}
                <div 
                  className="flex items-center justify-center w-12 h-12 cursor-pointer rounded-full bg-emerald-500 hover:bg-emerald-600 transition-all"
                  onClick={() => setActiveTab('home')}
                >
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Theme Toggle */}
                  <button 
                    onClick={toggleTheme}
                    className="p-3 rounded-full bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
                  >
                    {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                  </button>
                  
                  {/* Burger Menu */}
                  <button 
                    className="p-3 rounded-full bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-expanded={isMobileMenuOpen}
                    aria-label="Меню"
                  >
                    <BurgerIcon isOpen={isMobileMenuOpen} />
                  </button>
                </div>
              </nav>
            </>
          ) : (
            <>
              {/* Desktop Navigation - Unauthenticated */}
              <nav className="hidden md:flex items-center justify-between w-full">
                {/* Logo */}
                <div 
                  className="flex items-center justify-center w-10 h-10 cursor-pointer rounded-full bg-emerald-500 hover:bg-emerald-600 transition-all"
                  onClick={() => setActiveTab('home')}
                >
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>

                <div className="flex items-center gap-2">
                  {/* Theme Toggle */}
                  <button 
                    onClick={toggleTheme}
                    className="p-2.5 rounded-full bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
                  >
                    {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>

                  {/* Login Button */}
                  <button 
                    onClick={() => setIsLoginModalOpen(true)}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 rounded-full transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Войти
                  </button>
                </div>
              </nav>
              
              {/* Mobile Navigation - Unauthenticated */}
              <nav className="md:hidden flex items-center justify-between w-full">
                {/* Logo */}
                <div 
                  className="flex items-center justify-center w-12 h-12 cursor-pointer rounded-full bg-emerald-500 hover:bg-emerald-600 transition-all"
                  onClick={() => setActiveTab('home')}
                >
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
                
                <div className="w-[400px] flex items-center gap-2 justify-end">
                  {/* Theme Toggle */}
                  <button 
                    onClick={toggleTheme}
                    className="p-3 rounded-full bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
                  >
                    {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                  </button>
                  
                  {/* Login Button */}
                  <button 
                    onClick={() => setIsLoginModalOpen(true)}
                    className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 rounded-full transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Войти
                  </button>
                </div>
              </nav>
            </>
          )}
            </div>

            <div className={`grid overflow-hidden transition-[grid-template-rows,opacity,transform,padding] duration-300 ease-out ${
              isMobileMenuOpen ? 'grid-rows-[1fr] opacity-100 translate-y-0 pb-4' : 'grid-rows-[0fr] opacity-0 -translate-y-2 pb-0'
            }`}>
              <div className="min-h-0">
                <div className="px-4">
            <div className="flex flex-col gap-3">
              {isAuthenticated ? (
                <div className="flex items-center gap-3 px-4 py-3 bg-white/50 dark:bg-slate-900/30 rounded-2xl flex-1">
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                    {user?.fullname?.charAt(0) ? (
                      <span>{user?.fullname?.charAt(0)}</span>
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {user?.fullname || 'Пользователь'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {user?.faculty || 'Студент'}
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      logout();
                      setActiveTab('home');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-10 h-10 flex items-center justify-center bg-[#FFB2B2] hover:bg-[#FF9696] dark:bg-[#542426] dark:hover:bg-[#4a2526] rounded-xl transition-all"
                  >
                    <LogOut className="w-10 h-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    setIsLoginModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
                >
                  Войти
                </button>
              )}
            </div>

            {isAuthenticated && (
              <nav className="flex flex-col md:hidden gap-2 mt-4">
                <button 
                  onClick={() => {
                    setActiveTab('home');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'home' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white/40 dark:bg-slate-900/20'}`}
                >
                  Главная
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('schedule');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'schedule' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white/40 dark:bg-slate-900/20'}`}
                >
                  Расписание
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('literature');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'literature' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white/40 dark:bg-slate-900/20'}`}
                >
                  Литература
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('news');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'news' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white/40 dark:bg-slate-900/20'}`}
                >
                  Новости
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('games');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'games' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white/40 dark:bg-slate-900/20'}`}
                >
                  Игровая
                </button>
              </nav>
            )}
              </div>
                </div>
              </div>
          </div>
        </div>
      </header>
    </>
  );
}

export default Header;
