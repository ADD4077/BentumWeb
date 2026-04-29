import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function ProfileSettingsShell({
  onBack,
  tabs,
  activeTab,
  setActiveTab,
  content,
  children,
}) {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0B0F19]">
      <div className="sticky top-0 z-50 border-b border-slate-300/70 bg-white/88 backdrop-blur-xl dark:border-slate-800/60 dark:bg-[#0F1623]/82">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-300/70 bg-white/92 text-slate-700 shadow-sm dark:border-slate-800/60 dark:bg-[#17202d] dark:text-slate-300"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              Настройки профиля
            </h1>
            <p className="hidden text-sm text-slate-600 dark:text-slate-400 sm:block">
              Управление аккаунтом и персонализация
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 xl:flex-row xl:gap-8">
        <aside className="xl:w-80">
          <div className="rounded-3xl border border-slate-300/70 bg-white/92 p-3 shadow-lg dark:border-slate-800/60 dark:bg-[#121927]">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Разделы настроек
            </h2>
            <nav className="flex gap-2 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible xl:pb-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                const isDanger = tab.tone === 'danger';

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.onClick) {
                        tab.onClick();
                        return;
                      }

                      setActiveTab(tab.id);
                    }}
                    className={`flex flex-shrink-0 items-center gap-3 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                        : isDanger
                          ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#17202d]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="flex-1">{content}</main>
      </div>

      {children}
    </div>
  );
}
