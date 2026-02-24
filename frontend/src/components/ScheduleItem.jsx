// ScheduleItem компонент - карточка одной пары
import React from 'react';
import { lessonTypes } from '../utils/constants.js';

function ScheduleItem({ item }) {
  const getTypeClass = (type) => {
    return lessonTypes[type] || lessonTypes['Практика'];
  };

  return (
    <div className="flex flex-col sm:flex-row gap-5 p-6 bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-[1.5rem] border border-gray-100 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex sm:flex-col items-center sm:items-start justify-center gap-1 sm:w-28 sm:border-r border-gray-100 dark:border-slate-700/50 pr-4">
         <div className="text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tight">{item.time.split(' - ')[0]}</div>
         <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Начало</div>
      </div>

      <div className="flex-grow pl-2 flex flex-col justify-center">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{item.subject}</h3>
          <span className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full font-bold shadow-sm ${getTypeClass(item.type)}`}>
            {item.type}
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mt-1">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span className="font-medium">{item.teacher}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span className="font-medium">📍 Корпус {item.building}, ауд. {item.room}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScheduleItem;
