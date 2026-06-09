import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function ProfileSettingsShell({
  onBack,
  tabs,
  activeTab,
  setActiveTab,
  content,
  children,
  mobileMode = false,
}) {
  const selectedTab = tabs.find((tab) => tab.id === activeTab);
  const showMobileSection = mobileMode && Boolean(selectedTab) && !selectedTab.onClick;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0B0F19]">
      <div className="app-panel-surface sticky top-0 z-50 border-b backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
          <button
            onClick={() => {
              if (showMobileSection) {
                setActiveTab(null);
                return;
              }
              onBack();
            }}
            className="app-cell-surface flex h-10 w-10 items-center justify-center rounded-2xl border text-slate-700 shadow-sm dark:text-slate-300"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              {showMobileSection ? selectedTab.label : 'Настройки профиля'}
            </h1>
            <p className="hidden text-sm text-slate-600 dark:text-slate-400 sm:block">
              {showMobileSection
                ? 'Настройки выбранного раздела'
                : 'Управление аккаунтом и персонализация'}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 xl:flex-row xl:gap-8">
        {(!mobileMode || !showMobileSection) ? (
          <aside className="xl:w-80">
            <div className="app-panel-surface rounded-3xl border p-3 shadow-lg">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Разделы настроек
              </h2>
              <nav className="flex flex-col gap-2">
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
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                        active
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                          : isDanger
                            ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/70'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>
        ) : null}

        {(!mobileMode || showMobileSection) ? (
          <main className="flex-1">{content}</main>
        ) : null}
      </div>

      {children}
    </div>
  );
}
