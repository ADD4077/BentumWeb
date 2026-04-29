import React from 'react';
import { RefreshCw, Search, Shield, UserPlus } from 'lucide-react';

export default function AdminToolbar({
  refreshing,
  refreshData,
  openAddUserModal,
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  sortBy,
  setSortBy,
}) {
  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Админ-панель</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Управление пользователями и базовой статистикой
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={refreshData}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200/70 bg-gray-100/50 px-4 py-2 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Обновление...' : 'Обновить'}
          </button>
          <button
            onClick={openAddUserModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500"
          >
            <UserPlus className="h-4 w-4" />
            Добавить
          </button>
          <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200/70 bg-gray-100/50 px-4 py-2 text-emerald-700 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-emerald-400 dark:shadow-black/20">
            <Shield className="h-4 w-4" />
            Админ
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200/70 bg-gray-100/50 p-4 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Поиск по имени или номеру студбилета..."
              className="w-full rounded-xl border border-gray-200/70 bg-gray-100/50 py-2 pl-9 pr-4 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:shadow-black/20"
            />
          </div>
          <select
            aria-label="Фильтр статуса"
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
            className="rounded-xl border border-gray-200/70 bg-gray-100/50 px-4 py-2 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:shadow-black/20"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="banned">Заблокированные</option>
          </select>
          <select
            aria-label="Сортировка пользователей"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="rounded-xl border border-gray-200/70 bg-gray-100/50 px-4 py-2 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:shadow-black/20"
          >
            <option value="newest">Новые первые</option>
            <option value="oldest">Старые первые</option>
            <option value="name">По имени</option>
          </select>
        </div>
      </div>
    </>
  );
}
