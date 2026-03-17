import React from 'react';
import { Home, Search, RefreshCw } from 'lucide-react';
import { navigateToHome } from '../utils/navigation.js';

function NotFoundPage({ setActiveTab }) {
  const handleGoHome = () => {
    navigateToHome(setActiveTab);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      const query = e.target.value;
      if (query.trim()) {
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 dark:from-slate-900 dark:via-emerald-900/20 dark:to-teal-900/20 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Основной контейнер */}
        <div className="text-center space-y-8">
          
          {/* 404 */}
          <div className="relative inline-block">
            <div className="text-9xl font-bold text-slate-900 dark:text-white">
              404
            </div>
          </div>

          {/* Заголовок и описание */}
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              Ой! Страница не найдена
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              Кажется, эта страница не существует или была удалена. 
              Давайте поможем вам найти то, что вы ищете!
            </p>
          </div>

          {/* Кнопки действий */}
          <div className="flex flex-col gap-4 justify-center items-center">
            <button
              onClick={handleGoHome}
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-3"
            >
              <Home className="w-5 h-5" />
              <span>На главную</span>
            </button>

            <button
              onClick={handleRefresh}
              className="px-8 py-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-3"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Обновить</span>
            </button>
          </div>

          {/* Поиск */}
          <div className="max-w-md mx-auto">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type="text"
                placeholder="Поиск по сайту..."
                className="w-full pl-12 pr-4 py-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 text-lg"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    navigate(`/search?q=${encodeURIComponent(e.target.value)}`);
                  }
                }}
              />
            </div>
          </div>

          {/* Полезные ссылки */}
          <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm rounded-3xl p-6 border border-emerald-200 dark:border-emerald-800">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Возможно, вы искали:
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: 'Расписание', path: '/schedule', icon: '📅' },
                { name: 'Литература', path: '/literature', icon: '📚' },
                { name: 'Игры', path: '/games', icon: '' },
                { name: 'Профиль', path: '/profile', icon: '👤' },
              ].map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    if (setActiveTab) {
                      if (item.path === '/schedule') setActiveTab('schedule');
                      else if (item.path === '/literature') setActiveTab('literature');
                      else if (item.path === '/games') setActiveTab('games');
                      else if (item.path === '/profile') setActiveTab('profile');
                    }
                  }}
                  className="group p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-2 border-transparent hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-2xl transition-all duration-300 hover:scale-105"
                >
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                    {item.name}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Поддержка */}
          <div className="text-center text-sm text-slate-500 dark:text-slate-400">
            <p>Если проблема повторяется, свяжитесь с нашей 
              <button 
                onClick={() => {
                    if (setActiveTab) {
                      setActiveTab('support');
                    }
                  }}
                className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
              >
                службой поддержки
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
