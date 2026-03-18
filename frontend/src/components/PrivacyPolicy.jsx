import React, { useEffect } from 'react';
import { Shield, Eye, Lock, Database, Mail, Globe, User, Calendar, AlertTriangle, ArrowLeft } from 'lucide-react';

function PrivacyPolicy({ setActiveTab }) {
  const handleGoBack = () => {
    // Возвращаем на страницу "О проекте"
    if (setActiveTab) {
      setActiveTab('about');
    }
  };

  // Автоматическая прокрутка к началу страницы при монтировании
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Кнопка назад */}
        <button
          onClick={handleGoBack}
          className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg font-medium transition-all duration-200 hover:shadow-md border border-gray-200 dark:border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад</span>
        </button>
        
        {/* Заголовок */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-2xl">
              <Shield className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Политика конфиденциальности
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Последнее обновление: {new Date().toLocaleDateString('ru-RU', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric' 
            })}
          </p>
        </div>

        {/* Основной контент */}
        <div className="space-y-8">
          {/* Введение */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
              <Globe className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Введение
            </h2>
            <div className="space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed">
              <p>
                Добро пожаловать в образовательную платформу Bentum! Мы ценим вашу конфиденциальность 
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
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
              <Database className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Какие данные мы собираем
            </h2>
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    Персональные данные
                  </h3>
                  <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">•</span>
                      <span>ФИО (полное имя пользователя)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">•</span>
                      <span>Студенческий код</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">•</span>
                      <span>Факультет и учебная группа</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">•</span>
                      <span>Telegram ID (для уведомлений)</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    Технические данные
                  </h3>
                  <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">•</span>
                      <span>IP-адрес и геолокация</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">•</span>
                      <span>Данные о входе в систему</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">•</span>
                      <span>История посещения страниц</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">•</span>
                      <span>Данные о сессии и активности</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Использование данных */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
              <Eye className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Как мы используем ваши данные
            </h2>
            <div className="space-y-4 text-slate-700 dark:text-slate-300">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Основные цели:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">✓</span>
                      <span>Аутентификация и авторизация пользователей</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">✓</span>
                      <span>Предоставление образовательных услуг</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">✓</span>
                      <span>Персонализация контента и интерфейса</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">✓</span>
                      <span>Улучшение качества сервиса</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Технические цели:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">✓</span>
                      <span>Обеспечение безопасности системы</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">✓</span>
                      <span>Анализ использования платформы</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">✓</span>
                      <span>Предотвращение мошенничества</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">✓</span>
                      <span>Техническая поддержка пользователей</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Защита данных */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
              <Lock className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Защита ваших данных
            </h2>
            <div className="space-y-4 text-slate-700 dark:text-slate-300">
              <p>
                Мы применяем современные методы защиты данных для обеспечения безопасности вашей информации:
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Техническая защита:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">🔒</span>
                      <span>Шифрование данных при передаче (HTTPS/TLS)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">🔒</span>
                      <span>Шифрование данных при хранении</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">🔒</span>
                      <span>Регулярное резервное копирование</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">🔒</span>
                      <span>Защита от DDoS-атак</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Организационная защита:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">👥</span>
                      <span>Ограниченный доступ к данным</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">👥</span>
                      <span>Обучение персонала безопасности</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">👥</span>
                      <span>Регулярные аудиты безопасности</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 mt-1">👥</span>
                      <span>Соблюдение нормативных требований</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Cookies и трекеры */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
              <Database className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Cookies и технологии отслеживания
            </h2>
            <div className="space-y-4 text-slate-700 dark:text-slate-300">
              <p>
                Мы используем cookies и аналогичные технологии для улучшения работы платформы:
              </p>
              <div className="space-y-3">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Необходимые cookies:</h4>
                  <p className="text-sm">Обеспечивают базовую функциональность сайта (аутентификация, сессии).</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Функциональные cookies:</h4>
                  <p className="text-sm">Запоминают ваши предпочтения и настройки (тема, язык).</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Аналитические cookies:</h4>
                  <p className="text-sm">Помогают нам понять, как вы используете платформу для ее улучшения.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Права пользователей */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
              <User className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Ваши права
            </h2>
            <div className="space-y-4 text-slate-700 dark:text-slate-300">
              <p>
                Вы имеете следующие права в отношении ваших персональных данных:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Право исправления:</h4>
                  <p className="text-sm">Запрашивать исправление неточных или неполных данных.</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Право удаления:</h4>
                  <p className="text-sm">Запрашивать удаление ваших персональных данных.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Третьи лица */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
              <Globe className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Передача данных третьим лицам
            </h2>
            <div className="space-y-4 text-slate-700 dark:text-slate-300">
              <p>
                Мы не продаем ваши персональные данные третьим лицам. Мы можем передавать данные только в следующих случаях:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 mt-1">•</span>
                  <span>С вашего явного согласия</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 mt-1">•</span>
                  <span>По требованию закона или государственных органов</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 mt-1">•</span>
                  <span>Техническим партнерам для обеспечения работы сервиса</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Хранение данных */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Сроки хранения данных
            </h2>
            <div className="space-y-4 text-slate-700 dark:text-slate-300">
              <p>
                Мы храним ваши данные только в течение необходимого периода:
              </p>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <span className="font-medium">Учетная запись пользователя:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">До удаления аккаунта</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <span className="font-medium">Логи активности:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">90 дней</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <span className="font-medium">Cookies:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">До истечения сессии</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <span className="font-medium">Резервные копии:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">30 дней</span>
                </div>
              </div>
            </div>
          </section>

          {/* Дети */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              Защита данных детей
            </h2>
            <div className="space-y-4 text-slate-700 dark:text-slate-300">
              <p>
                Наш сервис предназначен для студентов высших учебных заведений. Мы не сознательно собираем 
                персональные данные детей младше 18 лет без согласия родителей или опекунов.
              </p>
              <p>
                Если мы обнаружим, что собрали данные ребенка без соответствующего согласия, 
                мы примем меры для удаления такой информации.
              </p>
            </div>
          </section>

          {/* Контакты */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
              <Mail className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Связь с нами
            </h2>
            <div className="space-y-4 text-slate-700 dark:text-slate-300">
              <p>
                Если у вас есть вопросы по этой политике конфиденциальности или вы хотите 
                осуществить свои права в отношении персональных данных, свяжитесь с нами:
              </p>
              <div className="space-y-2">
                <p className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Telegram: @Amfisak</span>
                </p>
              </div>
            </div>
          </section>

          {/* Изменения политики */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Изменения политики
            </h2>
            <div className="space-y-4 text-slate-700 dark:text-slate-300">
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
        <div className="mt-12 text-center text-slate-600 dark:text-slate-400">
          <p className="text-sm">
            Эта политика конфиденциальности действует с {new Date().toLocaleDateString('ru-RU')} и применяется ко всем пользователям платформы Bentum.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
