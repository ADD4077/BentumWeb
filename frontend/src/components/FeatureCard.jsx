import React from 'react';
import { Zap, TabletSmartphone, Shield, AlarmClock } from 'lucide-react';
function FeatureCard({ icon, title, description }) {
  const getIcon = () => {
    switch(title) {
      case 'Молниеносная скорость':
        return <Zap className="w-6 h-6 sm:w-8 sm:h-8" />;
      case 'Адаптивность':
        return <TabletSmartphone className="w-6 h-6 sm:w-8 sm:h-8" />;
      case 'Приватность':
        return <Shield className="w-6 h-6 sm:w-8 sm:h-8" />;
      case 'Умные уведомления':
        return <AlarmClock className="w-6 h-6 sm:w-8 sm:h-8" />;
      default:
        return icon;
    }
  };
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
    <div className={`relative flex flex-col h-full p-4 sm:p-8 rounded-2xl sm:rounded-3xl border ${colors.bg} ${colors.border} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group backdrop-blur-md overflow-hidden`}>
      <div className={`absolute -top-6 sm:-top-10 -right-12 sm:-right-20 w-32 sm:w-52 h-32 sm:h-52 ${colors.line} rounded-full opacity-10 blur-2xl transition-all duration-500 group-hover:w-40 sm:group-hover:w-60 group-hover:h-40 sm:group-hover:h-60 group-hover:opacity-20`}></div>
      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-3 sm:mb-6 text-white text-2xl sm:text-3xl shadow-lg relative z-10 transition-all duration-300 group-hover:scale-110">
        <div className={`w-full h-full rounded-2xl sm:rounded-3xl flex items-center justify-center ${colors.iconBg} transition-all duration-300`}>
          {getIcon()}
        </div>
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2 sm:mb-3 relative z-10">{title}</h3>
      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 flex-grow leading-relaxed relative z-10">{description}</p>
      <div
        className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-1 sm:h-2 rounded-b-2xl sm:rounded-b-3xl transition-all duration-500 ease-out ${colors.line} opacity-0 group-hover:w-full group-hover:opacity-100`}
      ></div>
    </div>
  );
}
export default FeatureCard;
