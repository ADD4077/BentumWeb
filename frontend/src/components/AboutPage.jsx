import React from 'react';
import { Star, GraduationCap, Users, MessageCircle } from 'lucide-react';

function AboutPage({ darkMode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 py-16">
      
      {/* Hero Section */}
      <div className="text-center mb-20">
        <div className="inline-flex text-lg md:text-xl text-emerald-600 font-medium mb-6 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-500 rounded-full items-center gap-2" style={{ animation: 'float 3s ease-in-out infinite' }}>
          <Star className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>О проекте BentumWeb</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight text-slate-900 dark:text-white leading-[1.1]">
          <span 
            className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-6xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent transition-all duration-1000"
            style={{
              backgroundSize: '200% 100%',
              backgroundPosition: '0% 50%',
              animation: 'colorShift 4s ease-in-out infinite'
            }}
          >
            Революция в учебном процессе
          </span>
        </h1>
        
        <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
          BentumWeb — это не просто расписание. Это целая экосистема для студентов БНТУ, 
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
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">10,000+</div>
            <div className="text-slate-600 dark:text-slate-400">Студентов используют</div>
          </div>
          <div className="text-center p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">50+</div>
            <div className="text-slate-600 dark:text-slate-400">Факультетов охвачено</div>
          </div>
          <div className="text-center p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">99.9%</div>
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
            <h3 className="text-xl font-bold mb-3">Умное расписание</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Автоматическое обновление, уведомления о парах, синхронизация с группой.
            </p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Сообщество</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Чаты групп, форумы, обмен материалами, совместная подготовка.
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
            <MessageCircle className="w-5 h-5" />
            <span>Telegram</span>
          </button>
        </div>
      </div>

      {/* Privacy Policy Section */}
      <div className="text-center mt-12">
        <button 
          onClick={() => window.location.href = '/privacy'}
          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline transition-colors"
        >
          Политика конфиденциальности
        </button>
      </div>
        
    </div>
  );
}

export default AboutPage;
