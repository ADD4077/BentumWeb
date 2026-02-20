// FeatureCard компонент - карточка преимущества
import React from 'react';

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 p-8 text-center group">
      <div className="inline-flex justify-center items-center w-16 h-16 bg-gradient-to-tr from-emerald-400 to-teal-600 rounded-2xl text-white mb-6 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
        {title}
      </h3>
      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

export default FeatureCard;
