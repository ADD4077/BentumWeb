import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api.js';
import { Star, GraduationCap, Users, MessageCircle, Shield, ArrowRight, Book, Newspaper, User, Send } from 'lucide-react';

// Компонент миссии
export const MissionSection = ({ stats, isLoading }) => (
  <div className="relative bg-white/40 dark:bg-slate-800/40 rounded-3xl p-8 md:p-12 mb-16 shadow-xl border border-white/50 dark:border-slate-700/50 backdrop-blur-md overflow-hidden">
    <div className="flex items-center gap-4 mb-6 relative z-10">
      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white shadow-lg">
        <GraduationCap className="w-6 h-6" />
      </div>
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Наша миссия</h2>
    </div>
    
    <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-8 relative z-10">
      Мы верим, что технологии должны упрощать жизнь студентов, а не усложнять её. 
      Наша цель — создать единый цифровой помощник, который решает все учебные задачи: 
      от расписания до поиска нужной аудитории.
    </p>
    
    <div className="grid md:grid-cols-3 gap-6 relative z-10">
      <div className="text-center p-6 bg-emerald-50/80 dark:bg-emerald-900/20 backdrop-blur-sm rounded-2xl border border-emerald-200/50 dark:border-emerald-700/50">
        <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
          {isLoading ? (
            <div className="animate-pulse">Загрузка...</div>
          ) : (
            `${stats.totalUsers.toLocaleString('ru-RU')}+`
          )}
        </div>
        <div className="text-slate-600 dark:text-slate-400">Студентов используют</div>
      </div>
      <div className="text-center p-6 bg-emerald-50/80 dark:bg-emerald-900/20 backdrop-blur-sm rounded-2xl border border-emerald-200/50 dark:border-emerald-700/50">
        <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
          {isLoading ? (
            <div className="animate-pulse">Загрузка...</div>
          ) : (
            stats.facultiesCount
          )}
        </div>
        <div className="text-slate-600 dark:text-slate-400">Факультетов охвачено</div>
      </div>
      <div className="text-center p-6 bg-emerald-50/80 dark:bg-emerald-900/20 backdrop-blur-sm rounded-2xl border border-emerald-200/50 dark:border-emerald-700/50">
        <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
          {isLoading ? (
            <div className="animate-pulse">Загрузка...</div>
          ) : (
            stats.uptime
          )}
        </div>
        <div className="text-slate-600 dark:text-slate-400">Время доступности</div>
      </div>
    </div>
  </div>
);

// Компонент функций
export const FeaturesSection = () => (
  <div className="mb-16">
    <h2 className="text-3xl font-bold mb-8 text-center text-slate-900 dark:text-white">Что мы предлагаем</h2>
    
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="relative bg-white/40 dark:bg-slate-800/40 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-white/50 dark:border-slate-700/50 backdrop-blur-md overflow-hidden group">
        <div className="absolute -top-6 -right-12 w-32 h-32 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full opacity-10 blur-2xl transition-all duration-500 group-hover:w-40 group-hover:h-40 group-hover:opacity-20"></div>
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4 text-white shadow-lg relative z-10 transition-all duration-300 group-hover:scale-110">
          <GraduationCap className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white relative z-10">Расписание</h3>
        <p className="text-slate-600 dark:text-slate-400 relative z-10">
          Актуальное расписание занятий с фильтрацией по неделям и группам.
        </p>
      </div>
      
      <div className="relative bg-white/40 dark:bg-slate-800/40 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-white/50 dark:border-slate-700/50 backdrop-blur-md overflow-hidden group">
        <div className="absolute -top-6 -right-12 w-32 h-32 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full opacity-10 blur-2xl transition-all duration-500 group-hover:w-40 group-hover:h-40 group-hover:opacity-20"></div>
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4 text-white shadow-lg relative z-10 transition-all duration-300 group-hover:scale-110">
          <Book className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white relative z-10">Литература</h3>
        <p className="text-slate-600 dark:text-slate-400 relative z-10">
          Учебные материалы, пособия и методические указания с поиском по категориям.
        </p>
      </div>
      
      <div className="relative bg-white/40 dark:bg-slate-800/40 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-white/50 dark:border-slate-700/50 backdrop-blur-md overflow-hidden group">
        <div className="absolute -top-6 -right-12 w-32 h-32 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-10 blur-2xl transition-all duration-500 group-hover:w-40 group-hover:h-40 group-hover:opacity-20"></div>
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 text-white shadow-lg relative z-10 transition-all duration-300 group-hover:scale-110">
          <Newspaper className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white relative z-10">Новости</h3>
        <p className="text-slate-600 dark:text-slate-400 relative z-10">
          Актуальные события, достижения и важные объявления университета.
        </p>
      </div>
      
      <div className="relative bg-white/40 dark:bg-slate-800/40 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-white/50 dark:border-slate-700/50 backdrop-blur-md overflow-hidden group">
        <div className="absolute -top-6 -right-12 w-32 h-32 bg-gradient-to-r from-orange-400 to-red-400 rounded-full opacity-10 blur-2xl transition-all duration-500 group-hover:w-40 group-hover:h-40 group-hover:opacity-20"></div>
        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4 text-white shadow-lg relative z-10 transition-all duration-300 group-hover:scale-110">
          <User className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white relative z-10">Профиль</h3>
        <p className="text-slate-600 dark:text-slate-400 relative z-10">
          Персональные данные, настройки темы и управление аккаунтом.
        </p>
      </div>
      
      <div className="relative bg-white/40 dark:bg-slate-800/40 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-white/50 dark:border-slate-700/50 backdrop-blur-md overflow-hidden group">
        <div className="absolute -top-6 -right-12 w-32 h-32 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full opacity-10 blur-2xl transition-all duration-500 group-hover:w-40 group-hover:h-40 group-hover:opacity-20"></div>
        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4 text-white shadow-lg relative z-10 transition-all duration-300 group-hover:scale-110">
          <ArrowRight className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white relative z-10">Актуальность</h3>
        <p className="text-slate-600 dark:text-slate-400 relative z-10">
          Регулярное обновление данных и всегда свежая информация.
        </p>
      </div>
      
      <div className="relative bg-white/40 dark:bg-slate-800/40 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-white/50 dark:border-slate-700/50 backdrop-blur-md overflow-hidden group">
        <div className="absolute -top-6 -right-12 w-32 h-32 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full opacity-10 blur-2xl transition-all duration-500 group-hover:w-40 group-hover:h-40 group-hover:opacity-20"></div>
        <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4 text-white shadow-lg relative z-10 transition-all duration-300 group-hover:scale-110">
          <MessageCircle className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white relative z-10">Поддержка</h3>
        <p className="text-slate-600 dark:text-slate-400 relative z-10">
          Система заявок в поддержку и быстрая помощь от администрации.
        </p>
      </div>
    </div>
  </div>
);

// Компонент призыва к действию
export const CTASection = ({ setActiveTab }) => (
  <div className="mt-16">
    {/* CTA Section */}
    <div className="relative bg-white/40 dark:bg-slate-800/40 rounded-3xl p-8 md:p-12 shadow-xl border border-white/50 dark:border-slate-700/50 backdrop-blur-md overflow-hidden mb-16">
      <div className="text-center relative z-10">
        <h2 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">Присоединяйтесь к нам!</h2>
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
          Станьте частью сообщества, которое меняет учебный процесс в БНТУ. 
          Вместе мы создаем будущее образования.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={() => window.open('https://t.me/BNTUnity', '_blank')}
            className="px-8 py-4 bg-[#0088cc] hover:bg-[#0077b3] text-white rounded-3xl font-bold transition-all hover:-translate-y-1 flex items-center gap-2 shadow-lg"
          >
            <Send className="w-5 h-5" />
            <span>Telegram</span>
          </button>
        </div>
      </div>
    </div>

    {/* Privacy Policy Section */}
    <div className="text-center">
      <button 
        onClick={() => setActiveTab('privacy')}
        className="group relative inline-flex items-center gap-2 px-6 py-3 bg-white/40 dark:bg-slate-800/40 hover:bg-white/50 dark:hover:bg-slate-800/50 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 rounded-2xl font-medium transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-emerald-200/50 dark:border-emerald-700/50 backdrop-blur-sm overflow-hidden"
      >
        <div className="relative z-10 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Политика конфиденциальности
        </div>
      </button>
    </div>
  </div>
);

function AboutPage({ darkMode, setActiveTab }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    facultiesCount: 0,
    uptime: '99.9%'
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Загружаем статистику из API
      const response = await fetch(API_ENDPOINTS.USERS_STATS, {
        credentials: 'include'
      });
      
      if (response.status === 401) {
        // Пользователь не админ - используем моковые данные
        setStats({
          totalUsers: 1000,
          facultiesCount: 10,
          uptime: '99.9%'
        });
        setIsLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Считаем количество уникальных факультетов
        const usersResponse = await fetch(API_ENDPOINTS.USERS, {
          credentials: 'include'
        });
        
        if (usersResponse.status === 401) {
          // Пользователь не админ - используем базовую статистику
          setStats({
            totalUsers: data.stats.totalUsers || 0,
            facultiesCount: 10,
            uptime: '99.9%'
          });
          setIsLoading(false);
          return;
        }
        
        const usersData = await usersResponse.json();
        
        if (usersData.success) {
          const uniqueFaculties = [...new Set(usersData.users.map(user => user.faculty).filter(Boolean))];
          
          setStats({
            totalUsers: data.stats.totalUsers || 0,
            facultiesCount: uniqueFaculties.length || 0,
            uptime: '99.9%'
          });
        }
      } else {
        // Используем моковые данные при ошибке API
        setStats({
          totalUsers: 1000,
          facultiesCount: 10,
          uptime: '99.9%'
        });
      }
    } catch (error) {
      // Используем моковые данные при ошибке
      setStats({
        totalUsers: 1000,
        facultiesCount: 10,
        uptime: '99.9%'
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 py-16">
      
      {/* Hero Section */}
      <div className="text-center mb-20">
        
        <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight text-slate-900 dark:text-white leading-[1.1]">
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
          Узнайте больше о нашей платформе и команде, которая работает для улучшения учебного процесса в БНТУ
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-20">
        <MissionSection stats={stats} isLoading={isLoading} />
        <FeaturesSection />
        <CTASection setActiveTab={setActiveTab} />
      </div>
    </div>
  );
}

export default AboutPage;
