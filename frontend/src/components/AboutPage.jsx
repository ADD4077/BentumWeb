import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api.js';
import { Star, GraduationCap, Users, MessageCircle, Shield, ArrowRight, Book, Newspaper, User, Send } from 'lucide-react';

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
          <span 
            className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-6xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent transition-all duration-1000"
            style={{
              backgroundSize: '200% 100%',
              backgroundPosition: '0% 50%',
              animation: 'colorShift 4s ease-in-out infinite'
            }}
          >
            О нашем проекте
          </span>
        </h1>
        
        <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
          Bentum — это не просто расписание. Это целая экосистема для студентов БНТУ, 
          созданная чтобы сделать учебу комфортной, продуктивной и увлекательной.
        </p>
      </div>

      {/* Mission Section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 md:p-12 mb-16 shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold">Наша миссия</h2>
        </div>
        
        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
          Мы верим, что технологии должны упрощать жизнь студентов, а не усложнять её. 
          Наша цель — создать единый цифровой помощник, который решает все учебные задачи: 
          от расписания до поиска нужной аудитории.
        </p>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
              {isLoading ? (
                <div className="animate-pulse">Загрузка...</div>
              ) : (
                `${stats.totalUsers.toLocaleString('ru-RU')}+`
              )}
            </div>
            <div className="text-slate-600 dark:text-slate-400">Студентов используют</div>
          </div>
          <div className="text-center p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
              {isLoading ? (
                <div className="animate-pulse">Загрузка...</div>
              ) : (
                stats.facultiesCount
              )}
            </div>
            <div className="text-slate-600 dark:text-slate-400">Факультетов охвачено</div>
          </div>
          <div className="text-center p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
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

      {/* Features Section */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold mb-8 text-center">Что мы предлагаем</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4">
              <GraduationCap className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Расписание</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Актуальное расписание занятий с фильтрацией по неделям и группам.
            </p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
              <Book className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Литература</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Учебные материалы, пособия и методические указания с поиском по категориям.
            </p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4">
              <Newspaper className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Новости</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Актуальные события, достижения и важные объявления университета.
            </p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-4">
              <User className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Профиль</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Персональные данные, настройки темы и управление аккаунтом.
            </p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-4">
              <ArrowRight className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Актуальность</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Регулярное обновление данных и всегда свежая информация.
            </p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Поддержка</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Система заявок в поддержку и быстрая помощь от администрации.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-white dark:bg-slate-800 rounded-3xl p-8 md:p-12 shadow-xl">
        <h2 className="text-3xl font-bold mb-4">Присоединяйтесь к нам!</h2>
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
          Станьте частью сообщества, которое меняет учебный процесс в БНТУ. 
          Вместе мы создаем будущее образования.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={() => window.open('https://t.me/BNTUnity', '_blank')}
            className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-3xl font-bold transition-all hover:-translate-y-1 flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            <span>Telegram</span>
          </button>
        </div>
      </div>

      {/* Privacy Policy Section */}
      <div className="text-center mt-12">
        <button 
          onClick={() => setActiveTab('privacy')}
          className="group inline-flex items-center gap-2 px-6 py-3 bg-emerald-100 dark:bg-emerald-900/20 hover:bg-emerald-200 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 rounded-2xl font-medium transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-emerald-200 dark:border-emerald-700"
        >
          <Shield className="w-5 h-5" />
          <span>Политика конфиденциальности</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
        </button>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Узнайте, как мы защищаем ваши данные
        </p>
      </div>
        
    </div>
  );
}

export default AboutPage;
