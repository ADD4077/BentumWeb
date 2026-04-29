import React from 'react';

export default function AdminStatsGrid({ statCards }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {statCards.map(({ label, value, icon: Icon, shellClass, iconClass }) => (
        <div
          key={label}
          className="rounded-2xl border border-gray-200/70 bg-gray-100/50 p-4 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${shellClass}`}>
              <Icon className={`h-5 w-5 ${iconClass}`} />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">{value}</span>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">{label}</div>
        </div>
      ))}
    </div>
  );
}
