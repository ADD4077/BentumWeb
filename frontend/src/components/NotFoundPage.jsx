import React, { useState } from 'react';
import { Home, RefreshCw } from 'lucide-react';
import { navigateToHome } from '../utils/navigation.js';

function NotFoundPage({ setActiveTab }) {
  const [isNavigating, setIsNavigating] = useState(false);

  const handleGoHome = () => {
    setIsNavigating(true);
    setTimeout(() => {
      // Пробуем сначала использовать setActiveTab
      if (setActiveTab) {
        navigateToHome(setActiveTab);
      } else {
        // Fallback - прямая навигация
        window.location.href = '/';
      }
    }, 200);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
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
            </p>
          </div>

          {/* Кнопки действий */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleGoHome}
              disabled={isNavigating}
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100"
            >
              {isNavigating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Переход...</span>
                </>
              ) : (
                <>
                  <Home className="w-5 h-5" />
                  <span>На главную</span>
                </>
              )}
            </button>

            <button
              onClick={handleRefresh}
              className="px-8 py-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-3"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Обновить</span>
            </button>
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
                &nbsp;службой поддержки
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
