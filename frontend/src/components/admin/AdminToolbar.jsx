import React from 'react';
import {
  CalendarRange,
  Download,
  RefreshCw,
  RotateCcw,
  Search,
  UserPlus,
} from 'lucide-react';

export default function AdminToolbar({
  refreshing,
  refreshData,
  openAddUserModal,
  exportUsers = () => {},
  resetFilters = () => {},
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  filterRole = 'all',
  setFilterRole = () => {},
  filterFaculty = 'all',
  setFilterFaculty = () => {},
  sortBy,
  setSortBy,
  periodFilter = 'all',
  setPeriodFilter = () => {},
  faculties = [],
  activeFiltersCount = 0,
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            Админ-панель
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400 sm:text-base">
            Управление пользователями и статистика платформы
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={refreshData}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm shadow-slate-900/5 transition hover:border-emerald-300 hover:text-emerald-700 sm:w-auto dark:border-slate-700/80 dark:bg-slate-900/55 dark:text-slate-200 dark:hover:border-emerald-500/60 dark:hover:text-emerald-300"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Обновление...' : 'Обновить'}
          </button>

          <button
            type="button"
            onClick={exportUsers}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm shadow-slate-900/5 transition hover:border-sky-300 hover:text-sky-700 sm:w-auto dark:border-slate-700/80 dark:bg-slate-900/55 dark:text-slate-200 dark:hover:border-sky-500/60 dark:hover:text-sky-300"
          >
            <Download className="h-4 w-4" />
            Экспорт
          </button>

          <button
            type="button"
            onClick={openAddUserModal}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-500 sm:w-auto"
          >
            <UserPlus className="h-4 w-4" />
            Добавить пользователя
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-gray-200/70 bg-gray-100/50 p-4 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Поиск по имени, номеру студбилета или email..."
                className="w-full rounded-2xl border border-gray-200/70 bg-gray-100/70 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700/50 dark:bg-slate-800/70 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200/70 bg-gray-100/70 px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700/50 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
              >
                <RotateCcw className="h-4 w-4" />
                Сбросить
                {activeFiltersCount > 0 ? (
                  <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">
                    {activeFiltersCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <select
              aria-label="Фильтр статуса"
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="rounded-2xl border border-gray-200/70 bg-gray-100/70 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700/50 dark:bg-slate-800/70 dark:text-slate-100"
            >
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="banned">Заблокированные</option>
            </select>

            <select
              aria-label="Фильтр роли"
              value={filterRole}
              onChange={(event) => setFilterRole(event.target.value)}
              className="rounded-2xl border border-gray-200/70 bg-gray-100/70 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700/50 dark:bg-slate-800/70 dark:text-slate-100"
            >
              <option value="all">Все роли</option>
              <option value="student">Студенты</option>
              <option value="teacher">Преподаватели</option>
              <option value="chairperson">Председатели</option>
              <option value="moderator">Модераторы</option>
              <option value="admin">Администраторы</option>
            </select>

            <select
              aria-label="Фильтр факультета"
              value={filterFaculty}
              onChange={(event) => setFilterFaculty(event.target.value)}
              className="rounded-2xl border border-gray-200/70 bg-gray-100/70 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700/50 dark:bg-slate-800/70 dark:text-slate-100"
            >
              <option value="all">Все факультеты</option>
              {faculties.map((faculty) => (
                <option key={faculty} value={faculty}>
                  {faculty}
                </option>
              ))}
            </select>

            <select
              aria-label="Сортировка пользователей"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="rounded-2xl border border-gray-200/70 bg-gray-100/70 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700/50 dark:bg-slate-800/70 dark:text-slate-100"
            >
              <option value="newest">Дата регистрации</option>
              <option value="oldest">Сначала старые</option>
              <option value="name">По имени</option>
              <option value="activity">По активности</option>
            </select>

            <div className="relative">
              <CalendarRange className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                aria-label="Фильтр периода"
                value={periodFilter}
                onChange={(event) => setPeriodFilter(event.target.value)}
                className="w-full rounded-2xl border border-gray-200/70 bg-gray-100/70 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700/50 dark:bg-slate-800/70 dark:text-slate-100"
              >
                <option value="all">Выбрать период</option>
                <option value="today">Сегодня</option>
                <option value="week">7 дней</option>
                <option value="month">30 дней</option>
                <option value="quarter">90 дней</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
