import React, { useEffect } from 'react';
import { Shield, Eye, Lock, Database, Mail, Globe, User, Calendar, AlertTriangle, ArrowLeft } from 'lucide-react';

function PrivacyPolicy({ setActiveTab }) {
  const handleGoBack = () => {
    // Возвращаем на главную страницу
    if (setActiveTab) {
      setActiveTab('home');
    }
  };

  // Автоматическая прокрутка к началу страницы при монтировании
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        {/* Кнопка назад */}
        <button
          onClick={handleGoBack}
          className="mb-4 sm:mb-6 inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl sm:rounded-2xl font-medium transition-all duration-200 hover:shadow-md border border-gray-200 dark:border-slate-700 text-sm sm:text-base"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Назад</span>
          <span className="sm:hidden">Back</span>
        </button>
        
        {/* Заголовок */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl sm:rounded-2xl">
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4 px-2">
            Политика конфиденциальности
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto px-4">
            Последнее обновление: {new Date().toLocaleDateString('ru-RU', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric' 
            })}
          </p>
        </div>

        {/* Основной контент */}
        <div className="space-y-6 sm:space-y-8">
          {/* Введение */}
          <section className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
              <span className="text-lg sm:text-xl">Введение</span>
            </h2>
            <div className="space-y-3 sm:space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
              <p>
                Добро пожаловать в образовательную платформу Бентум! Мы ценим вашу конфиденциальность 
                и стремимся защитить ваши личные данные. Эта политика конфиденциальности объясняет, 
                какие данные мы собираем, как мы их используем и защищаем.
              </p>
              <p>
                Используя нашу платформу, вы соглашаетесь с практиками, описанными в этой политике. 
                Если вы не согласны с этими условиями, пожалуйста, не используйте наш сервис.
              </p>
            </div>
          </section>

          {/* Собираемые данные */}
          <section className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <Database className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
              <span className="text-lg sm:text-xl">Какие данные мы собираем</span>
            </h2>
            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm sm:text-base">Персональные данные</span>
                  </h3>
                  <ul className="space-y-1 sm:space-y-2 text-slate-700 dark:text-slate-300 text-sm sm:text-base">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">•</span>
                      <span>ФИО (полное имя пользователя)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">•</span>
                      <span>Студенческий код</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">•</span>
                      <span>Факультет и учебная группа</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">•</span>
                      <span>Telegram ID (для уведомлений)</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm sm:text-base">Технические данные</span>
                  </h3>
                  <ul className="space-y-1 sm:space-y-2 text-slate-700 dark:text-slate-300 text-sm sm:text-base">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">•</span>
                      <span>IP-адрес и геолокация</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">•</span>
                      <span>Данные о входе в систему</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">•</span>
                      <span>История посещения страниц</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">•</span>
                      <span>Данные о сессии и активности</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Использование данных */}
          <section className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
              <span className="text-lg sm:text-xl">Как мы используем ваши данные</span>
            </h2>
            <div className="space-y-3 sm:space-y-4 text-slate-700 dark:text-slate-300 text-sm sm:text-base">
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2 sm:mb-3 text-sm sm:text-base">Основные цели:</h3>
                  <ul className="space-y-1 sm:space-y-2 text-sm sm:text-base">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">✓</span>
                      <span>Аутентификация и авторизация пользователей</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">✓</span>
                      <span>Предоставление образовательных услуг</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">✓</span>
                      <span>Персонализация контента и интерфейса</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">✓</span>
                      <span>Улучшение качества сервиса</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2 sm:mb-3 text-sm sm:text-base">Технические цели:</h3>
                  <ul className="space-y-1 sm:space-y-2 text-sm sm:text-base">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">✓</span>
                      <span>Обеспечение безопасности системы</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">✓</span>
                      <span>Анализ использования платформы</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">✓</span>
                      <span>Предотвращение мошенничества</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">✓</span>
                      <span>Техническая поддержка пользователей</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Защита данных */}
          <section className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
              <span className="text-lg sm:text-xl">Защита ваших данных</span>
            </h2>
            <div className="space-y-3 sm:space-y-4 text-slate-700 dark:text-slate-300 text-sm sm:text-base">
              <p>
                Мы применяем современные методы защиты данных для обеспечения безопасности вашей информации:
              </p>
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2 sm:mb-3 text-sm sm:text-base">Техническая защита:</h3>
                  <ul className="space-y-1 sm:space-y-2 text-sm sm:text-base">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">🔒</span>
                      <span>Шифрование данных при передаче (HTTPS/TLS)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">🔒</span>
                      <span>Шифрование данных при хранении</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">🔒</span>
                      <span>Регулярное резервное копирование</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">🔒</span>
                      <span>Защита от DDoS-атак</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2 sm:mb-3 text-sm sm:text-base">Организационная защита:</h3>
                  <ul className="space-y-1 sm:space-y-2 text-sm sm:text-base">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">👥</span>
                      <span>Ограниченный доступ к данным</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">👥</span>
                      <span>Обучение персонала безопасности</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">👥</span>
                      <span>Регулярные аудиты безопасности</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">👥</span>
                      <span>Соблюдение нормативных требований</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Cookies и трекеры */}
          <section className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <Database className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
              <span className="text-lg sm:text-xl">Cookies и технологии отслеживания</span>
            </h2>
            <div className="space-y-3 sm:space-y-4 text-slate-700 dark:text-slate-300 text-sm sm:text-base">
              <p>
                Мы используем cookies и аналогичные технологии для улучшения работы платформы:
              </p>
              <div className="space-y-2 sm:space-y-3">
                <div className="p-3 sm:p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-1 sm:mb-2 text-sm sm:text-base">Необходимые cookies:</h4>
                  <p className="text-xs sm:text-sm">Обеспечивают базовую функциональность сайта (аутентификация, сессии).</p>
                </div>
                <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-1 sm:mb-2 text-sm sm:text-base">Функциональные cookies:</h4>
                  <p className="text-xs sm:text-sm">Запоминают ваши предпочтения и настройки (тема, язык).</p>
                </div>
                <div className="p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-1 sm:mb-2 text-sm sm:text-base">Аналитические cookies:</h4>
                  <p className="text-xs sm:text-sm">Помогают нам понять, как вы используете платформу для ее улучшения.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Права пользователей */}
          <section className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <User className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
              <span className="text-lg sm:text-xl">Ваши права</span>
            </h2>
            <div className="space-y-3 sm:space-y-4 text-slate-700 dark:text-slate-300 text-sm sm:text-base">
              <p>
                Вы имеете следующие права в отношении ваших персональных данных:
              </p>
              <div className="space-y-3 sm:space-y-4">
                <div className="p-3 sm:p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-1 sm:mb-2 text-sm sm:text-base">Право исправления:</h4>
                  <p className="text-xs sm:text-sm">Запрашивать исправление неточных или неполных данных.</p>
                </div>
                <div className="p-3 sm:p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-1 sm:mb-2 text-sm sm:text-base">Право удаления:</h4>
                  <p className="text-xs sm:text-sm">Запрашивать удаление ваших персональных данных.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Третьи лица */}
          <section className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
              <span className="text-lg sm:text-xl">Передача данных третьим лицам</span>
            </h2>
            <div className="space-y-3 sm:space-y-4 text-slate-700 dark:text-slate-300 text-sm sm:text-base">
              <p>
                Мы не продаем ваши персональные данные третьим лицам. Мы можем передавать данные только в следующих случаях:
              </p>
              <ul className="space-y-1 sm:space-y-2 text-sm sm:text-base">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">•</span>
                  <span>С вашего явного согласия</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">•</span>
                  <span>По требованию закона или государственных органов</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 text-xs sm:text-base">•</span>
                  <span>Техническим партнерам для обеспечения работы сервиса</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Хранение данных */}
          <section className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
              <span className="text-lg sm:text-xl">Сроки хранения данных</span>
            </h2>
            <div className="space-y-3 sm:space-y-4 text-slate-700 dark:text-slate-300 text-sm sm:text-base">
              <p>
                Мы храним ваши данные только в течение необходимого периода:
              </p>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg gap-1 sm:gap-2">
                  <span className="font-medium text-sm sm:text-base">Учетная запись пользователя:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm sm:text-right">До удаления аккаунта</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg gap-1 sm:gap-2">
                  <span className="font-medium text-sm sm:text-base">Логи активности:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm sm:text-right">90 дней</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg gap-1 sm:gap-2">
                  <span className="font-medium text-sm sm:text-base">Cookies:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm sm:text-right">До истечения сессии</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg gap-1 sm:gap-2">
                  <span className="font-medium text-sm sm:text-base">Резервные копии:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm sm:text-right">30 дней</span>
                </div>
              </div>
            </div>
          </section>

          {/* Контакты */}
          <section className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
              <span className="text-lg sm:text-xl">Связь с нами</span>
            </h2>
            <div className="space-y-3 sm:space-y-4 text-slate-700 dark:text-slate-300 text-sm sm:text-base">
              <p>
                Если у вас есть вопросы по этой политике конфиденциальности или вы хотите 
                осуществить свои права в отношении персональных данных, свяжитесь с нами:
              </p>
              <div className="space-y-2">
                <p className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm sm:text-base">Telegram: @Amfisak</span>
                </p>
              </div>
            </div>
          </section>

          {/* Изменения политики */}
          <section className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
              <span className="text-lg sm:text-xl">Изменения политики</span>
            </h2>
            <div className="space-y-3 sm:space-y-4 text-slate-700 dark:text-slate-300 text-sm sm:text-base">
              <p>
                Мы можем периодически обновлять эту политику конфиденциальности. Все изменения 
                будут опубликованы на этой странице с указанием даты последнего обновления.
              </p>
              <p>
                Существенные изменения вступают в силу через 30 дней после публикации. 
                Мы уведомим пользователей о значительных изменениях через email или уведомления в системе.
              </p>
            </div>
          </section>
        </div>

        {/* Футер */}
        <div className="mt-8 sm:mt-12 text-center text-slate-600 dark:text-slate-400 px-4">
          <p className="text-xs sm:text-sm">
            Эта политика конфиденциальности действует с {new Date().toLocaleDateString('ru-RU')} и применяется ко всем пользователям платформы Бентум.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
