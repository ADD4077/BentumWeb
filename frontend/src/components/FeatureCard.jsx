// FeatureCard компонент - карточки с одинаковыми анимациями линий
import React from 'react';
import { Zap, TabletSmartphone, Shield, AlarmClock } from 'lucide-react';

function FeatureCard({ icon, title, description }) {
  // Определяем иконки
  const getIcon = () => {
    switch(title) {
      case 'Молниеносная скорость':
        return <Zap className="w-8 h-8" />;
      case 'Адаптивность':
        return <TabletSmartphone className="w-8 h-8" />;
      case 'Приватность':
        return <Shield className="w-8 h-8" />;
      case 'Умные уведомления':
        return <AlarmClock className="w-8 h-8" />;
      default:
        return icon;
    }
  };

  // Определяем цвета для каждой карточки
  const getCardColors = () => {
    switch(title) {
      case 'Молниеносная скорость':
        return {
          bg: 'bg-white/40 dark:bg-slate-800/40 text-slate-900 dark:text-white',
          border: 'border-white/50 dark:border-slate-700/50',
          iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
          line: 'bg-gradient-to-r from-emerald-400 to-teal-400'
        };
      case 'Адаптивность':
        return {
          bg: 'bg-white/40 dark:bg-slate-800/40 text-slate-900 dark:text-white',
          border: 'border-white/50 dark:border-slate-700/50',
          iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
          line: 'bg-gradient-to-r from-blue-400 to-cyan-400'
        };
      case 'Приватность':
        return {
          bg: 'bg-white/40 dark:bg-slate-800/40 text-slate-900 dark:text-white',
          border: 'border-white/50 dark:border-slate-700/50',
          iconBg: 'bg-gradient-to-br from-purple-500 to-fuchsia-500',
          line: 'bg-gradient-to-r from-purple-400 to-fuchsia-400'
        };
      case 'Умные уведомления':
        return {
          bg: 'bg-white/40 dark:bg-slate-800/40 text-slate-900 dark:text-white',
          border: 'border-white/50 dark:border-slate-700/50',
          iconBg: 'bg-gradient-to-br from-orange-500 to-red-500',
          line: 'bg-gradient-to-r from-orange-400 to-red-400'
        };
      default:
        return {
          bg: 'bg-white/40 dark:bg-slate-800/40 text-slate-900 dark:text-white',
          border: 'border-white/50 dark:border-slate-700/50',
          iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
          line: 'bg-gradient-to-r from-emerald-400 to-teal-400'
        };
    }
  };

  const colors = getCardColors();

  return (
    <div className={`relative flex flex-col h-full p-8 rounded-2xl border ${colors.bg} ${colors.border} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group backdrop-blur-md overflow-hidden`}>
      
      {/* Свечение в правом верхнем углу */}
      <div className={`absolute -top-10 -right-20 w-52 h-52 ${colors.line} rounded-full opacity-10 blur-2xl transition-all duration-500 group-hover:w-60 group-hover:h-60 group-hover:opacity-20`}></div>
      
      {/* Иконка */}
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-white text-3xl shadow-lg relative z-10">
        <div className={`w-full h-full rounded-2xl flex items-center justify-center ${colors.iconBg}`}>
          {getIcon()}
        </div>
      </div>

      {/* Заголовок */}
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 relative z-10">{title}</h3>
      
      {/* Описание */}
      <p className="text-slate-600 dark:text-slate-400 text-base flex-grow leading-relaxed relative z-10">{description}</p>

      {/* Нижняя линия для ВСЕХ карточек - из центра в обе стороны */}
      <div
        className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-2 rounded-b-2xl transition-all duration-500 ease-out ${colors.line} opacity-0 group-hover:w-full group-hover:opacity-100`}
      ></div>
    </div>
  );
}

export default FeatureCard;
