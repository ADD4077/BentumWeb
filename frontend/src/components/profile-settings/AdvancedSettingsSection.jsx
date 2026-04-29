import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function AdvancedSettingsSection({ handleLogout }) {
  return (
    <div className="rounded-3xl border border-gray-200/70 bg-gray-100/50 p-6 shadow-lg shadow-gray-900/10 dark:border-red-900/30 dark:bg-[#121927] dark:shadow-black/20 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Выйти из аккаунта</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Завершить текущую пользовательскую сессию.</p>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-medium text-white"
        >
          Выйти
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
