import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import ScheduleItem from './components/ScheduleItem.jsx';
import LoginModal from './components/LoginModal.jsx';
import FeatureCard from './components/FeatureCard.jsx';
import { scheduleData } from './data/scheduleData.js';
import { daysOfWeek, groupInfo, features } from './utils/constants.js';

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('home'); 
  const [weekType, setWeekType] = useState('upper');
  const [selectedDay, setSelectedDay] = useState('Пн');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const today = new Date().getDay();
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    if (today !== 0) setSelectedDay(days[today]);
    else setSelectedDay('Пн');

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Инициализация темы при загрузке
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    // Добавляем/убираем класс dark у html элемента
    if (!darkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  };

  const currentSchedule = scheduleData[weekType][selectedDay] || [];

  return (
    <div className={`${darkMode ? 'dark' : ''} min-h-screen flex flex-col font-sans selection:bg-emerald-500 selection:text-white`}>
      <div className="flex-grow bg-gray-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 transition-colors duration-500 overflow-x-hidden relative">
        
        {/* --- Header --- */}
        <Header 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          darkMode={darkMode}
          toggleTheme={toggleTheme}
          setIsLoginModalOpen={setIsLoginModalOpen}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        {/* --- Main Content --- */}
        <main className="container mx-auto px-4 py-12 relative z-10">
          
          {/* HOME TAB */}
          {activeTab === 'home' && (
            <div className="flex flex-col items-center">
              <div className="text-center max-w-4xl mx-auto mb-20 mt-10">
                <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                  Умное расписание <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500">
                    Для студентов БНТУ
                  </span>
                </h1>
                
                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed max-w-2xl mx-auto">
                  Персональный ассистент, который знает, где ваша следующая пара. 
                  Уведомления, навигация по корпусам и синхронизация с группой — всё в одном месте.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button 
                    onClick={() => setActiveTab('schedule')}
                    className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-500/30 transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
                  >
                    🤖 Запустить Бота
                  </button>
                  <button 
                    className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-2xl font-bold text-lg transition-all hover:-translate-y-1 flex items-center justify-center gap-2 shadow-lg shadow-slate-200/20 dark:shadow-none"
                  >
                    Узнать больше →
                  </button>
                </div>
              </div>

              {/* Features Section */}
              <div className="w-full max-w-6xl mx-auto mt-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {features.map((feature, index) => (
                    <FeatureCard 
                      key={index}
                      icon={feature.icon}
                      title={feature.title}
                      description={feature.description}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SCHEDULE TAB */}
          {activeTab === 'schedule' && (
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-10 gap-6">
                <div>
                  <h2 className="text-4xl font-bold mb-2 text-slate-900 dark:text-white tracking-tight">Расписание</h2>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700">Группа {groupInfo.group}</span>
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    <span className="text-sm">{groupInfo.faculty}</span>
                  </div>
                </div>

                {/* Week Toggle */}
                <div className="relative bg-white dark:bg-slate-800 p-1.5 rounded-2xl flex shadow-inner border border-gray-200 dark:border-slate-700">
                  <div 
                    className={`absolute top-1.5 bottom-1.5 rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/30 transition-all duration-300 ease-out`}
                    style={{
                      left: weekType === 'upper' ? '6px' : '50%',
                      width: 'calc(50% - 6px)'
                    }}
                  ></div>
                  
                  <button
                    onClick={() => setWeekType('upper')}
                    className={`relative z-10 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors duration-300 w-36 ${
                      weekType === 'upper' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    1 Неделя
                  </button>
                  <button
                    onClick={() => setWeekType('lower')}
                    className={`relative z-10 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors duration-300 w-36 ${
                      weekType === 'lower' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    2 Неделя
                  </button>
                </div>
              </div>

              {/* Days Navigation */}
              <div className="flex overflow-x-auto pb-6 gap-3 mb-2">
                {daysOfWeek.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`min-w-[4rem] h-16 rounded-2xl flex flex-col items-center justify-center border-2 transition-all duration-300 ${
                      selectedDay === day
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                        : 'bg-white dark:bg-slate-800 border-transparent hover:border-emerald-200 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <span className={`text-sm font-medium ${selectedDay === day ? 'opacity-80' : 'opacity-60'}`}>{day}</span>
                  </button>
                ))}
              </div>

              {/* Schedule List */}
              <div className="space-y-4">
                {currentSchedule.length > 0 ? (
                  currentSchedule.map((item) => (
                    <ScheduleItem key={item.id} item={item} />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="text-6xl mb-6">☀️</div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Свободный день</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                      Пар нет. Отличное время для саморазвития или отдыха.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}

export default App;
