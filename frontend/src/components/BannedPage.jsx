import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api.js';
import { navigateToHome, navigateToSupport } from '../utils/navigation.js';
import { AlertTriangle, Clock, Mail, Shield, X, RefreshCw, Home, User } from 'lucide-react';

function BannedPage() {
  const [banInfo, setBanInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBanInfo = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.BAN_INFO, {
          method: 'GET',
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setBanInfo(data.ban_info);
          } else {
            setError(data.detail || 'Ошибка загрузки данных о бане');
          }
        } else {
          setError('Ошибка соединения с сервером');
        }
      } catch (err) {
        setError('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    fetchBanInfo();
  }, []);

  const handleGoHome = () => {
    // Очищаем статус бана и переходим на главную
    localStorage.removeItem('token');
    localStorage.removeItem('banEndDate');
    navigateToHome();
  };

  const handleContactSupport = () => {
    navigateToSupport();
  };

  const handleLogout = () => {
    // Открываем модальное окно профиля поверх страницы бана
    // Пользователь может посмотреть свою информацию, но не может редактировать
    localStorage.setItem('openProfileModal', 'true');
    // Просто обновляем состояние для открытия модального окна
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-slate-900 dark:via-red-900/20 dark:to-orange-900/20 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Основной контейнер с анимацией */}
        <div className="text-center space-y-8 animate-fade-in-up">
          
          {/* Иконка бана с анимацией */}
          <div className="relative inline-block">
            <div className="w-32 h-32 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center animate-pulse shadow-2xl">
              <AlertTriangle className="w-16 h-16 text-white animate-bounce" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-600 rounded-full animate-ping">
              <span className="text-white text-xs flex items-center justify-center h-full">!</span>
            </div>
          </div>

          {/* Заголовок и описание */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent">
              Аккаунт заблокирован
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              Ваш аккаунт был временно заблокирован из-за нарушения правил использования платформы.
            </p>
          </div>

          {/* Карточка с деталями блокировки */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl shadow-2xl border border-red-200 dark:border-red-800/50 p-8">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-slate-600 dark:text-slate-300">Загрузка информации о блокировке...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            ) : banInfo ? (
              <div className="space-y-6">
                {/* Причина блокировки */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Причина блокировки</h3>
                    <p className="text-slate-600 dark:text-slate-300">
                      {banInfo.reason}
                    </p>
                  </div>
                </div>

                {/* Срок блокировки */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Срок блокировки</h3>
                    <p className="text-slate-600 dark:text-slate-300">
                      {banInfo.duration_text} (до {banInfo.end_date_formatted})
                    </p>
                    <div className="mt-3 bg-orange-100 dark:bg-orange-900/20 rounded-xl px-4 py-2">
                      <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">
                        Осталось: {banInfo.remaining_time_text}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Что делать */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Что можно сделать</h3>
                    <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        Обратиться в службу поддержки для апелляции
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        Изучить правила сообщества
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        Ожидать окончания срока блокировки
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Кнопки действий */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleContactSupport}
              className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-3"
            >
              <Mail className="w-5 h-5 group-hover:animate-bounce" />
              <span>Обратиться в поддержку</span>
            </button>

            <button
              onClick={handleLogout}
              className="group px-8 py-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 font-semibold rounded-2xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 flex items-center gap-3"
            >
              <User className="w-5 h-5 group-hover:animate-pulse" />
              <span>Профиль</span>
            </button>
          </div>

          {/* Предупреждение */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                  Важное предупреждение
                </h4>
                <p className="text-yellow-700 dark:text-yellow-400 text-sm">
                  Попытки обхода блокировки могут привести к ее продлению или перманент бану.
                  Пожалуйста, соблюдайте правила платформы.
                </p>
              </div>
            </div>
          </div>

          {/* Декоративный футер */}
          <div className="text-center text-sm text-slate-500 dark:text-slate-400">
            <p>Если вы считаете блокировку ошибочной, 
              <button 
                onClick={handleContactSupport}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium ml-1"
              >
                свяжитесь с нами
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BannedPage;
