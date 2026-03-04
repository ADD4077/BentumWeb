import React from 'react';
import { Home, Search, ArrowLeft, RefreshCw } from 'lucide-react';

function NotFoundPage() {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleGoBack = () => {
    window.history.back();
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
        {/* Основной контейнер с анимацией */}
        <div className="text-center space-y-8 animate-fade-in">
          
          {/* 404 с анимацией */}
          <div className="relative inline-block">
            <div className="text-9xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent animate-pulse">
              404
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full animate-bounce">
              <span className="text-white text-xs flex items-center justify-center h-full">!</span>
            </div>
          </div>

          {/* Заголовок и описание */}
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              Ой! Страница потерялась
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              Кажется, эта страница ушла в отпуск или решила сыграть в прятки. 
              Давайте поможем вам найти то, что вы ищете!
            </p>
          </div>

          {/* Декоративные элементы */}
          <div className="flex justify-center space-x-4 text-4xl animate-float">
            <span className="animate-spin-slow">🔍</span>
            <span className="animate-bounce-delay">❓</span>
            <span className="animate-pulse">🌟</span>
          </div>

          {/* Кнопки действий */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleGoHome}
              className="group relative px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-3"
            >
              <Home className="w-5 h-5 group-hover:animate-bounce" />
              <span>На главную</span>
            </button>

            <button
              onClick={handleGoBack}
              className="group px-8 py-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold rounded-2xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 flex items-center gap-3"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>Назад</span>
            </button>

            <button
              onClick={handleRefresh}
              className="group px-8 py-4 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 hover:from-slate-300 hover:to-slate-400 dark:hover:from-slate-600 dark:hover:to-slate-500 text-slate-700 dark:text-slate-300 font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-3"
            >
              <RefreshCw className="w-5 h-5 group-hover:animate-spin" />
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
                { name: 'Игры', path: '/games', icon: '🎮' },
                { name: 'Профиль', path: '/profile', icon: '👤' },
              ].map((item) => (
                <button
                  key={item.path}
                  onClick={() => window.location.href = item.path}
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

          {/* Декоративный футер */}
          <div className="text-center text-sm text-slate-500 dark:text-slate-400">
            <p>Если проблема повторяется, свяжитесь с нашей 
              <button 
                onClick={() => window.location.href = '/support'}
                className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium ml-1"
              >
                службой поддержки
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Стили для анимаций */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes bounce-delay {
          0%, 80%, 100% {
            transform: scale(1);
          }
          40% {
            transform: scale(1.2);
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-bounce-delay {
          animation: bounce-delay 2s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default NotFoundPage;
