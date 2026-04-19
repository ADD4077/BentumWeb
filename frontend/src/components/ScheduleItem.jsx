import React from 'react';
import { lessonTypes } from '../utils/constants.js';
function ScheduleItem({ item }) {
  const getTypeClass = (type) => {
    return lessonTypes[type] || lessonTypes['Практика'];
  };
  const cleanSubjectName = (subject) => {
    return subject
      .replace(/^\(Лаб\.\)\s*/, '')
      .replace(/^\(Лекц\.\)\s*/, '')
      .replace(/^\(Практ\.\)\s*/, '')
      .replace(/^\(Сем\.\)\s*/, '')
      .trim();
  };
  return (
    <div className="flex flex-col gap-3 rounded-[1.5rem] border border-gray-200/70 bg-gray-100/50 p-4 shadow-lg shadow-gray-900/10 backdrop-blur-md transition-all duration-300 hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20 sm:flex-row sm:gap-5 sm:p-6">
      <div className="flex items-center justify-center pr-2 sm:w-28 sm:flex-col sm:items-start sm:border-r sm:border-gray-200/70 sm:pr-4 dark:sm:border-slate-700/50">
         <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tight">{item.time.split(' - ')[0]}</div>
      </div>
      <div className="flex-grow pl-1 sm:pl-2 flex flex-col justify-center">
        <div className="flex justify-between items-start mb-1 sm:mb-2">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{cleanSubjectName(item.subject)}</h3>
          <span className={`text-[8px] sm:text-[10px] uppercase tracking-wider px-2 sm:px-3 py-1 rounded-full font-bold shadow-sm ${getTypeClass(item.type)}`}>
            {item.type}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm mt-1">
          {item.teacher && (
            <div className="flex items-center gap-1 sm:gap-2 text-slate-500 dark:text-slate-400">
              <span className="font-medium text-xs sm:text-sm">{item.teacher}</span>
            </div>
          )}
          {(item.frame || item.classroom) && (
            <div className="flex items-center gap-1 sm:gap-2 text-slate-500 dark:text-slate-400">
              <span className="font-medium text-xs sm:text-sm">
                📍 
                {item.frame && `Корпус ${item.frame}`}
                {item.frame && item.classroom && ', '}
                {item.classroom && `ауд. ${item.classroom}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default ScheduleItem;
