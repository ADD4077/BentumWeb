import React from 'react';
import { ArrowLeft, Ban, CheckCircle2, Link2, Search, ShieldCheck, UserPlus } from 'lucide-react';

import { formatDateTime, formatRelativeTime } from '../../utils/dates.js';
import AdminPagination from './AdminPagination.jsx';

const ICON_MAP = {
  user_created: UserPlus,
  user_banned: Ban,
  user_unbanned: CheckCircle2,
  admin_assigned: ShieldCheck,
  admin_removed: ShieldCheck,
  telegram_linked: Link2,
  telegram_unlinked: Link2,
  twofa_enabled: ShieldCheck,
  twofa_disabled: ShieldCheck,
};

const TONE_MAP = {
  user_created: 'bg-violet-500/10 text-violet-400',
  user_banned: 'bg-rose-500/10 text-rose-400',
  user_unbanned: 'bg-emerald-500/10 text-emerald-400',
  admin_assigned: 'bg-sky-500/10 text-sky-400',
  admin_removed: 'bg-amber-500/10 text-amber-400',
  telegram_linked: 'bg-cyan-500/10 text-cyan-400',
  telegram_unlinked: 'bg-slate-500/10 text-slate-300',
  twofa_enabled: 'bg-emerald-500/10 text-emerald-400',
  twofa_disabled: 'bg-amber-500/10 text-amber-400',
};

function ActivityRow({ item }) {
  const Icon = ICON_MAP[item.event_type] || UserPlus;
  const toneClass = TONE_MAP[item.event_type] || 'bg-slate-500/10 text-slate-300';

  return (
    <article className="rounded-[24px] border border-gray-200/70 bg-gray-100/70 p-4 dark:border-slate-700/50 dark:bg-slate-800/70">
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-950 dark:text-white">{item.title}</h3>
              <p className="truncate text-sm text-slate-600 dark:text-slate-300">{item.subtitle}</p>
            </div>
            <div className="text-left text-xs text-slate-500 dark:text-slate-400 sm:text-right">
              <div>{formatRelativeTime(item.created_at)}</div>
              <div>{formatDateTime(item.created_at, '')}</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
            {item.subject_code ? <span className="rounded-full bg-slate-200/70 px-2.5 py-1 dark:bg-slate-700/70">Код: {item.subject_code}</span> : null}
            {item.actor_name ? <span className="rounded-full bg-slate-200/70 px-2.5 py-1 dark:bg-slate-700/70">Инициатор: {item.actor_name}</span> : null}
            {item.category ? <span className="rounded-full bg-slate-200/70 px-2.5 py-1 capitalize dark:bg-slate-700/70">{item.category}</span> : null}
          </div>
          {item.details ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{item.details}</p> : null}
        </div>
      </div>
    </article>
  );
}

export default function AdminActivityLog({
  loading,
  items,
  total,
  page,
  totalPages,
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
  periodFilter,
  setPeriodFilter,
  eventTypes,
  onBack,
  setPage,
}) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-[30px] border border-gray-200/70 bg-gray-100/50 p-4 sm:p-5 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-600 transition hover:text-emerald-500 dark:text-emerald-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад к панели
            </button>
            <h2 className="text-3xl font-semibold text-slate-950 dark:text-white">Журнал активности</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Последние действия в системе с фильтрами и пагинацией
            </p>
          </div>
          <div className="self-start rounded-full bg-slate-200/70 px-4 py-2 text-sm text-slate-600 dark:bg-slate-700/70 dark:text-slate-300">
            Всего событий: {total.toLocaleString('ru-RU')}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_220px_220px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по пользователю, коду или описанию"
              className="w-full rounded-2xl border border-gray-200/70 bg-white/80 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400 dark:border-slate-700/50 dark:bg-slate-900/70 dark:text-slate-100"
            />
          </label>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-2xl border border-gray-200/70 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 dark:border-slate-700/50 dark:bg-slate-900/70 dark:text-slate-100"
          >
            <option value="all">Все типы</option>
            {eventTypes.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>

          <select
            value={periodFilter}
            onChange={(event) => setPeriodFilter(event.target.value)}
            className="rounded-2xl border border-gray-200/70 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 dark:border-slate-700/50 dark:bg-slate-900/70 dark:text-slate-100"
          >
            <option value="all">За все время</option>
            <option value="today">За сегодня</option>
            <option value="week">За неделю</option>
            <option value="month">За месяц</option>
            <option value="quarter">За квартал</option>
          </select>
        </div>
      </section>

      <section className="rounded-[30px] border border-gray-200/70 bg-gray-100/50 p-4 sm:p-5 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20">
        <div className="space-y-3 sm:space-y-4">
          {loading ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400">Загрузка активности...</div>
          ) : items.length ? (
            items.map((item) => <ActivityRow key={item.id} item={item} />)
          ) : (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400">События не найдены</div>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t border-gray-200/70 pt-4 text-sm text-slate-500 dark:border-slate-700/50 dark:text-slate-400 lg:flex-row lg:items-center lg:justify-between">
          <div>
            Страница {page} из {totalPages}
          </div>
          <AdminPagination currentPage={page} totalPages={totalPages} setCurrentPage={setPage} />
        </div>
      </section>
    </div>
  );
}
