// Header компонент - шапка сайта
import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { LogOut, Menu, GraduationCap, Sun, Moon, User } from 'lucide-react';

function Header({ activeTab, setActiveTab, darkMode, toggleTheme, setIsLoginModalOpen, isMobileMenuOpen, setIsMobileMenuOpen }) {
  const { isAuthenticated, user, logout } = useAuth();

  // Блокировка скролла при открытом мобильном меню
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Очистка при размонтировании
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);
  return (
    <>
      {/* Menu */}
        <>
          {/* Overlay */}
          {isMobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}
          
          {/* Menu Panel */}
          <div className={`fixed top-0 right-0 h-full w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}>
            <div className="p-6 pt-24">
              <div className="flex flex-col gap-3">
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-slate-800 rounded-xl flex-1">
                      <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                        {user?.fullname?.charAt(0) ? (
                          <span>{user?.fullname?.charAt(0)}</span>
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {user?.fullname || 'Пользователь'}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {user?.faculty || 'Студент'}
                        </span>
                      </div>
                      <button 
                        onClick={() => {
                          logout();
                          setActiveTab('home');
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-10 h-10 flex items-center justify-center bg-[#FFB2B2] hover:bg-[#FF9696] dark:bg-[#542426] dark:hover:bg-[#4a2526] rounded-lg transition-all"
                      >
                        <LogOut className="w-10 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </>
                ) : (
                  <button 
                    onClick={() => {
                      setIsLoginModalOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Войти
                  </button>
                )}
              </div>
              
              {/* Navigation only on mobile */}
              {isAuthenticated && (
                <nav className="flex flex-col gap-2 mt-6 md:hidden">
                  <button 
                    onClick={() => {
                      setActiveTab('home');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === 'home' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    Главная
                  </button>
                  <button 
                    onClick={() => {
                      setActiveTab('schedule');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === 'schedule' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    Расписание
                  </button>
                  <button 
                    onClick={() => {
                      setActiveTab('literature');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === 'literature' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    Литература
                  </button>
                  <button 
                    onClick={() => {
                      setActiveTab('news');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === 'news' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    Новости
                  </button>
                  <button 
                    onClick={() => {
                      setActiveTab('games');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === 'games' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    Игровая
                  </button>
                </nav>
              )}
            </div>
          </div>
        </>
      
      <header className="fixed top-0 z-50 w-full bg-transparent">
        <div className="container mx-auto px-6 h-24 flex items-center justify-between">
          
          {/* Left spacer */}
          <div className="flex-1"></div>
          
          {/* Center Navigation */}
          {isAuthenticated ? (
            <>
              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-1.5 p-1.5 pl-2.5 bg-gray-100/50 dark:bg-slate-800/50 backdrop-blur-md rounded-full border border-gray-200 dark:border-slate-700/50 shadow-lg shadow-gray-900/10 dark:shadow-black/20">
                {/* Logo */}
                <div 
                  className="flex items-center justify-center w-10 h-10 cursor-pointer rounded-full bg-emerald-500 hover:bg-emerald-600 transition-all"
                  onClick={() => setActiveTab('home')}
                >
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                
                <button 
                  onClick={() => setActiveTab('home')}
                  className={`px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'home' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Главная
                </button>
                <button 
                  onClick={() => setActiveTab('schedule')}
                  className={`px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'schedule' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Расписание
                </button>
                <button 
                  onClick={() => setActiveTab('literature')}
                  className={`px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'literature' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Литература
                </button>
                <button 
                  onClick={() => setActiveTab('news')}
                  className={`px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'news' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Новости
                </button>
                <button 
                  onClick={() => setActiveTab('games')}
                  className={`px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'games' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Игровая
                </button>
                
                {/* Theme Toggle */}
                <button 
                  onClick={toggleTheme}
                  className="p-2.5 rounded-full bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
                >
                  {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                
                {/* Burger Menu */}
                <button 
                  className="p-2.5 rounded-full bg-gray-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  <Menu className="w-6 h-6" />
                </button>
              </nav>
              
              {/* Mobile Navigation */}
              <nav className="md:hidden flex items-center justify-between w-full p-3 bg-gray-100/50 dark:bg-slate-800/50 backdrop-blur-md rounded-full border border-gray-200 dark:border-slate-700/50 shadow-lg shadow-gray-900/10 dark:shadow-black/20">
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
                    className="p-3 rounded-full bg-gray-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  >
                    <Menu className="w-6 h-6" />
                  </button>
                </div>
              </nav>
            </>
          ) : (
            <>
              {/* Desktop Navigation - Unauthenticated */}
              <nav className="hidden md:flex items-center gap-1.5 p-1.5 pl-2.5 bg-gray-100/50 dark:bg-slate-800/50 backdrop-blur-md rounded-full border border-gray-200 dark:border-slate-700/50 shadow-lg shadow-gray-900/10 dark:shadow-black/20">
                {/* Logo */}
                <div 
                  className="flex items-center justify-center w-10 h-10 cursor-pointer rounded-full bg-emerald-500 hover:bg-emerald-600 transition-all"
                  onClick={() => setActiveTab('home')}
                >
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                
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
              </nav>
              
              {/* Mobile Navigation - Unauthenticated */}
              <nav className="md:hidden flex items-center justify-between w-full p-3 bg-gray-100/50 dark:bg-slate-800/50 backdrop-blur-md rounded-full border border-gray-200 dark:border-slate-700/50 shadow-lg shadow-gray-900/10 dark:shadow-black/20">
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
          
          {/* Right spacer */}
          <div className="flex-1 flex justify-end">
            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {/* Кнопки входа перенесены в парящую панель */}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

export default Header;
