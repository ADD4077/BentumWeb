import React from 'react';
import {
  ArrowUpRight,
  BookOpen,
  GraduationCap,
  MessageCircle,
  Newspaper,
  ScrollText,
  Send,
  Shield,
} from 'lucide-react';

import Header from '../Header.jsx';
import CookieNotice from '../CookieNotice.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';

const QUICK_LINKS = [
  { id: 'schedule', label: 'Расписание', icon: GraduationCap },
  { id: 'literature', label: 'Литература', icon: BookOpen },
  { id: 'news', label: 'Новости', icon: Newspaper },
];

const COMMUNITY_LINKS = [
  {
    label: 'Telegram',
    description: 'Сообщество Bentum и обновления платформы.',
    href: 'https://t.me/BNTUnity',
    icon: Send,
  },
  {
    label: 'Поддержка',
    description: 'Связь с командой прямо из интерфейса.',
    action: 'support',
    icon: MessageCircle,
  },
];

export const AppShell = ({
  hideHeader,
  activeTab,
  setActiveTab,
  darkMode,
  toggleTheme,
  setIsLoginModalOpen,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  isProfileModalOpen,
  setIsProfileModalOpen,
  userMedia,
  children,
}) => {
  const { isAuthenticated } = useAuth();

  const handleFooterNavigation = (tab) => {
    setActiveTab(tab);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <>
      {!hideHeader ? (
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          darkMode={darkMode}
          toggleTheme={toggleTheme}
          setIsLoginModalOpen={setIsLoginModalOpen}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          isProfileModalOpen={isProfileModalOpen}
          setIsProfileModalOpen={setIsProfileModalOpen}
          userMedia={userMedia}
        />
      ) : null}

      <main className="app-shell-main relative z-10 container mx-auto flex-1 px-4 pb-12">
        {children}
      </main>

      <footer className="border-t border-slate-300/70 bg-slate-100 px-4 pb-6 pt-8 dark:border-slate-800/70 dark:bg-[#0B0F19]">
        <div className="mx-auto max-w-7xl px-2 py-4 lg:px-4">
          <div className={`grid gap-8 ${isAuthenticated ? 'lg:grid-cols-[1.15fr,0.85fr,0.9fr]' : 'lg:grid-cols-[1.2fr,0.95fr]'}`}>
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  Bentum
                </h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Спокойная цифровая среда для студентов БНТУ: расписание,
                  литература, новости и личный кабинет в одном месте.
                </p>
              </div>

              <button
                onClick={() => handleFooterNavigation('privacy')}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300/70 bg-white/82 px-4 py-3 text-sm font-semibold text-slate-700 transition-all duration-300 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-800/70 dark:bg-[#141c28]/70 dark:text-slate-200 dark:hover:border-emerald-500/30"
              >
                <Shield className="h-4 w-4" />
                Политика конфиденциальности
              </button>
            </div>

            {isAuthenticated ? (
            <div>
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                <ScrollText className="h-4 w-4" />
                Разделы
              </div>

              <div className="grid gap-2">
                {QUICK_LINKS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleFooterNavigation(item.id)}
                      className="group flex items-center justify-between rounded-xl border border-slate-300/70 bg-white/82 px-4 py-3 text-left transition-colors duration-300 hover:border-emerald-300 hover:bg-white dark:border-slate-800/70 dark:bg-[#141c28]/70 dark:hover:border-emerald-500/30"
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {item.label}
                        </span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </button>
                  );
                })}
              </div>
            </div>
            ) : null}

            <div>
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                <MessageCircle className="h-4 w-4" />
                Сообщества
              </div>

              <div className="grid gap-2">
                {COMMUNITY_LINKS.map((item) => {
                  const Icon = item.icon;
                  const body = (
                    <>
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span>
                          <span className="block font-medium text-slate-800 dark:text-slate-100">
                            {item.label}
                          </span>
                          <span className="block text-sm text-slate-500 dark:text-slate-400">
                            {item.description}
                          </span>
                        </span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </>
                  );

                  if (item.href) {
                    return (
                      <a
                        key={item.label}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center justify-between rounded-xl border border-slate-300/70 bg-white/82 px-4 py-3 transition-colors duration-300 hover:border-sky-300 hover:bg-white dark:border-slate-800/70 dark:bg-[#141c28]/70 dark:hover:border-sky-500/30"
                      >
                        {body}
                      </a>
                    );
                  }

                  return (
                    <button
                      key={item.label}
                      onClick={() => handleFooterNavigation('support')}
                      className="group flex items-center justify-between rounded-xl border border-slate-300/70 bg-white/82 px-4 py-3 text-left transition-colors duration-300 hover:border-emerald-300 hover:bg-white dark:border-slate-800/70 dark:bg-[#141c28]/70 dark:hover:border-emerald-500/30"
                    >
                      {body}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-300/70 pt-4 dark:border-slate-800/70">
            <div className="flex flex-col gap-2 text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <p>© 2026 Bentum. Все права защищены.</p>
              <p>Bentum для комфортной студенческой повседневности.</p>
            </div>
          </div>
        </div>
      </footer>

      <CookieNotice onOpenPrivacy={() => handleFooterNavigation('privacy')} />
    </>
  );
};

export default AppShell;
