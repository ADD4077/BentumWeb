import React from 'react';
import ScheduleItem from '../components/ScheduleItem.jsx';
import { daysOfWeek, quickDayButtons, groupInfo } from '../utils/constants.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useSchedule } from '../hooks/useSchedule.js';

/**
 * Страница расписания занятий
 */
export const SchedulePage = () => {
  const { user, isAuthenticated } = useAuth();
  const {
    userSchedule,
    currentSchedule,
    scheduleLoading,
    selectedDay,
    setSelectedDay,
    weekType,
    setWeekType,
    loadUserSchedule,
    getTodayDay,
    getTomorrowDay,
    getWeekType,
    handleQuickDaySelect
  } = useSchedule(isAuthenticated, user);
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-10 gap-6 w-full">
        <div className="text-left self-start">
          <h2 className="text-4xl font-bold mb-2 text-slate-900 dark:text-white tracking-tight">Расписание</h2>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700">
              Группа {user?.student_code?.slice(0, 8) || groupInfo.group}
            </span>
            <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
            <span className="text-sm">{user?.faculty || groupInfo.faculty}</span>
          </div>
        </div>
        <div className="relative bg-white dark:bg-slate-800 p-1.5 rounded-2xl flex shadow-inner border border-gray-200 dark:border-slate-700 w-full max-w-md mx-auto">
          <div 
            className={`absolute top-1.5 bottom-1.5 rounded-xl bg-white dark:bg-slate-700 transition-all duration-300 ease-out shadow-sm`}
            style={{
              left: weekType === 'upper' ? '6px' : '50%',
              width: 'calc(50% - 6px)'
            }}
          ></div>
          <button
            onClick={() => setWeekType('upper')}
            className={`relative z-10 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors duration-300 flex-1 ${
              weekType === 'upper' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            1 Неделя
          </button>
          <button
            onClick={() => setWeekType('lower')}
            className={`relative z-10 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors duration-300 flex-1 ${
              weekType === 'lower' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            2 Неделя
          </button>
        </div>
      </div>
      <div className="flex gap-3 mb-4">
        {quickDayButtons.map((button) => (
          <button
            key={button.id}
            onClick={() => handleQuickDaySelect(button.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
              (button.id === 'today' && getTodayDay() && selectedDay === getTodayDay() && weekType === getWeekType()) ||
              (button.id === 'tomorrow' && getTomorrowDay() && selectedDay === getTomorrowDay() && weekType === getWeekType())
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : button.id === 'today' && !getTodayDay()
                ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-slate-600'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:text-emerald-600 dark:hover:text-emerald-400'
            }`}
          >
            {button.name}
          </button>
        ))}
      </div>
      <div className="flex overflow-x-auto px-3 py-2 pb-6 gap-3 mb-2">
        {daysOfWeek.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`min-w-[3rem] h-12 sm:min-w-[4rem] sm:h-16 rounded-2xl flex flex-col items-center justify-center border-2 transition-all duration-300 ${
              selectedDay === day
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                : 'bg-white dark:bg-slate-800 border-transparent hover:border-emerald-200 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span className={`text-xs sm:text-sm font-medium ${selectedDay === day ? 'opacity-80' : 'opacity-60'}`}>{day}</span>
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {scheduleLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6"></div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Загрузка расписания...</h3>
          </div>
        ) : currentSchedule.length > 0 ? (
          currentSchedule.map((item) => (
            <ScheduleItem key={item.id} item={item} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl mb-6">{selectedDay === 'Вс' ? '😴' : '☀️'}</div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
              {userSchedule ? (selectedDay === 'Вс' ? 'Воскресенье' : 'Свободный день') : 'Расписание не загружено'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              {userSchedule 
                ? (selectedDay === 'Вс' ? 'Пар нет. Отличное время для саморазвития или отдыха.' : 'Пар нет. Отличное время для саморазвития или отдыха.')
                : 'Попробуйте обновить страницу или войти заново.'
              }
            </p>
            {!userSchedule && (
              <button 
                onClick={loadUserSchedule}
                className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
              >
                Обновить расписание
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SchedulePage;
