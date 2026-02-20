// Header компонент - шапка сайта
import React from 'react';

function Header({ activeTab, setActiveTab, darkMode, toggleTheme, setIsLoginModalOpen, isMobileMenuOpen, setIsMobileMenuOpen }) {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-800/50">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setActiveTab('home')}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative bg-white dark:bg-slate-900 p-2.5 rounded-xl text-emerald-600 dark:text-emerald-400">
              🎓
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
              BNTU <span className="text-emerald-500">Bot</span>
            </span>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Assistant</span>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 p-1.5 bg-gray-100/50 dark:bg-slate-800/50 backdrop-blur-md rounded-full border border-gray-200 dark:border-slate-700/50">
          <button 
            onClick={() => setActiveTab('home')}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'home' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Главная
          </button>
          <button 
            onClick={() => setActiveTab('schedule')}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'schedule' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Расписание
          </button>
        </nav>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-4">
          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-400 border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <div className="h-6 w-px bg-gray-200 dark:bg-slate-800"></div>
          <button 
            onClick={() => setIsLoginModalOpen(true)}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
          >
            Войти в аккаунт
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-slate-900 dark:text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>
    </header>
  );
}

export default Header;
