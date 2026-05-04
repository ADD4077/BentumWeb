import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Book,
  GraduationCap,
  MessageCircle,
  Newspaper,
  Send,
  Shield,
  User,
} from 'lucide-react';

import { API_ENDPOINTS } from '../config/api.js';
import { openExternalUrl } from '../utils/url.js';

const FALLBACK_STATS = {
  totalUsers: 1000,
  facultiesCount: 10,
  uptime: '99.9%',
};

const FEATURES = [
  {
    title: 'Расписание',
    description:
      'Актуальное расписание занятий с фильтрацией по неделям, группам и аудиториям.',
    icon: GraduationCap,
    glow: 'from-emerald-400 to-teal-400',
    iconBg: 'from-emerald-500 to-teal-500',
  },
  {
    title: 'Литература',
    description:
      'Учебные материалы, пособия и методические указания с удобным поиском по категориям.',
    icon: Book,
    glow: 'from-blue-400 to-cyan-400',
    iconBg: 'from-blue-500 to-cyan-500',
  },
  {
    title: 'Новости',
    description:
      'Важные объявления, достижения и свежие события университетской жизни в одном месте.',
    icon: Newspaper,
    glow: 'from-orange-400 to-rose-400',
    iconBg: 'from-orange-500 to-rose-500',
  },
  {
    title: 'Профиль',
    description:
      'Личные данные, настройки аккаунта, управление сессиями и персональные параметры.',
    icon: User,
    glow: 'from-violet-400 to-fuchsia-400',
    iconBg: 'from-violet-500 to-fuchsia-500',
  },
  {
    title: 'Актуальность',
    description:
      'Данные обновляются регулярно, чтобы студент видел только свежую и полезную информацию.',
    icon: ArrowRight,
    glow: 'from-lime-400 to-emerald-400',
    iconBg: 'from-lime-500 to-emerald-500',
  },
  {
    title: 'Поддержка',
    description:
      'Быстрая связь с администрацией через систему обращений и встроенные каналы помощи.',
    icon: MessageCircle,
    glow: 'from-cyan-400 to-sky-400',
    iconBg: 'from-cyan-500 to-sky-500',
  },
];

function StatCard({ value, label, isLoading }) {
  return (
    <div className="rounded-xl border border-emerald-200/50 bg-emerald-50/80 p-4 text-center backdrop-blur-sm dark:border-emerald-700/50 dark:bg-emerald-900/20 sm:p-6">
      <div className="mb-2 text-xl font-bold text-emerald-600 dark:text-emerald-400 sm:text-2xl md:text-3xl">
        {isLoading ? <div className="animate-pulse">Загрузка...</div> : value}
      </div>
      <div className="text-xs text-slate-600 dark:text-slate-400 sm:text-sm md:text-base">
        {label}
      </div>
    </div>
  );
}

export function MissionSection({ stats, isLoading }) {
  return (
    <section className="mission-sweep glass-card relative mb-8 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/82 p-4 shadow-xl backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/40 sm:mb-12 sm:p-6 md:mb-16 md:p-8 lg:p-12">
      <div className="relative z-10 mb-4 flex items-center gap-3 sm:mb-6 sm:gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg sm:h-12 sm:w-12">
          <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl md:text-3xl">
          Наша миссия
        </h2>
      </div>

      <p className="relative z-10 mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:mb-8 sm:text-base md:text-lg">
        Мы делаем единый цифровой помощник для студентов БНТУ. Цель платформы
        проста: убрать лишнюю рутину и собрать расписание, литературу, новости,
        профиль и поддержку в одном понятном месте.
      </p>

      <div className="relative z-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        <StatCard
          value={`${stats.totalUsers.toLocaleString('ru-RU')}+`}
          label="Студентов используют платформу"
          isLoading={isLoading}
        />
        <StatCard
          value={stats.facultiesCount}
          label="Факультетов уже охвачено"
          isLoading={isLoading}
        />
        <StatCard
          value={stats.uptime}
          label="Средняя доступность сервиса"
          isLoading={isLoading}
        />
      </div>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section className="mb-16">
      <h2 className="mb-8 text-center text-3xl font-bold text-slate-900 dark:text-white">
        Что уже умеет платформа
      </h2>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;

          return (
            <article
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-white/50 bg-white/40 p-6 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-800/40"
            >
              <div
                className={`absolute -right-12 -top-6 h-32 w-32 rounded-full bg-gradient-to-r ${feature.glow} opacity-10 blur-2xl transition-all duration-500 group-hover:h-40 group-hover:w-40 group-hover:opacity-20`}
              />
              <div
                className={`relative z-10 mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.iconBg} text-white shadow-lg transition-all duration-300 group-hover:scale-110`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="relative z-10 mb-3 text-xl font-bold text-slate-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="relative z-10 text-slate-600 dark:text-slate-400">
                {feature.description}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function CTASection({ setActiveTab }) {
  return (
    <section className="mt-8 sm:mt-12 md:mt-16">
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-white/50 bg-white/40 p-4 shadow-xl backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/40 sm:mb-12 sm:p-6 md:p-8 lg:p-12">
        <div className="relative z-10 text-center">
          <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-white sm:mb-4 sm:text-2xl md:text-3xl">
            Присоединяйтесь к Bentum
          </h2>
          <p className="mx-auto mb-6 max-w-2xl px-4 text-sm text-slate-600 dark:text-slate-400 sm:mb-8 sm:text-base md:text-lg">
            Мы развиваем платформу вместе со студентами. Если хочешь следить за
            обновлениями или делиться идеями, заходи в наш Telegram.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 px-4 sm:flex-row sm:gap-4">
            <button
              onClick={() => openExternalUrl('https://t.me/BNTUnity')}
              className="flex items-center gap-2 rounded-2xl bg-[#0088cc] px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:bg-[#0077b3] sm:rounded-3xl sm:px-8 sm:py-4 sm:text-base"
            >
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Telegram</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 text-center">
        <button
          onClick={() => setActiveTab('privacy')}
          className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl border border-emerald-200/50 bg-white/40 px-4 py-2 font-medium text-emerald-600 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white/50 hover:text-emerald-700 hover:shadow-lg dark:border-emerald-700/50 dark:bg-slate-800/40 dark:text-emerald-400 dark:hover:bg-slate-800/50 dark:hover:text-emerald-300 sm:rounded-2xl sm:px-6 sm:py-3 sm:text-base"
        >
          <div className="relative z-10 flex items-center gap-2">
            <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
            Политика конфиденциальности
          </div>
        </button>
      </div>
    </section>
  );
}

function AboutPage({ setActiveTab }) {
  const [stats, setStats] = useState(FALLBACK_STATS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      try {
        const statsResponse = await fetch(API_ENDPOINTS.USERS_STATS, {
          credentials: 'include',
        });

        if (statsResponse.status === 401) {
          return;
        }

        const statsData = await statsResponse.json();

        if (!statsData.success) {
          return;
        }

        let facultiesCount = FALLBACK_STATS.facultiesCount;

        const usersResponse = await fetch(API_ENDPOINTS.USERS, {
          credentials: 'include',
        });

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();

          if (usersData.success && Array.isArray(usersData.users)) {
            facultiesCount = new Set(
              usersData.users.map((user) => user.faculty).filter(Boolean)
            ).size;
          }
        }

        if (!isMounted) {
          return;
        }

        setStats({
          totalUsers: statsData.stats?.totalUsers || FALLBACK_STATS.totalUsers,
          facultiesCount,
          uptime: FALLBACK_STATS.uptime,
        });
      } catch (_error) {
        if (!isMounted) {
          return;
        }

        setStats(FALLBACK_STATS);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadStats();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-16 text-slate-900 dark:bg-[#0B0F19] dark:text-slate-100">
      <div className="mb-20 text-center">
        <h1 className="mb-8 text-5xl font-bold leading-[1.1] tracking-tight text-slate-900 dark:text-white md:text-7xl">
          Bentum
        </h1>
        <p className="mx-auto max-w-3xl text-xl text-slate-600 dark:text-slate-400">
          Платформа для студентов БНТУ, которая помогает быстрее находить нужную
          информацию, держать учебный процесс под рукой и меньше тратить времени
          на рутину.
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-20">
        <MissionSection stats={stats} isLoading={isLoading} />
        <FeaturesSection />
        <CTASection setActiveTab={setActiveTab} />
      </div>
    </div>
  );
}

export default AboutPage;
