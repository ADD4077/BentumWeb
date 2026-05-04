import React from 'react';
import { Ban, Eye, Shield, UserCheck } from 'lucide-react';

import { buildMediaUrl } from '../../utils/media.js';
import { getRoleLabel } from '../../utils/roles.js';

function getStatusBadge(user) {
  if (user.status === 'banned') {
    return {
      label: 'Заблокирован',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    };
  }

  return {
    label: 'Активен',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  };
}

function getRoleBadgeClass(role) {
  const classes = {
    student: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    teacher: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    chairperson: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    moderator: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/20 dark:text-fuchsia-400',
    admin: 'bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
  };

  return classes[role] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
}

function getUserSecondaryText(user) {
  return user.student_code || user.email || user.mail || user.username || 'Нет данных';
}

export default function AdminUsersList({
  loading,
  users,
  highlightedUserId,
  viewProfile,
  openBanModal,
  openUnbanModal,
  totalUsers,
  pageStart,
  pageEnd,
  pagination,
}) {
  return (
    <section className="self-start overflow-hidden rounded-[30px] border border-gray-200/70 bg-gray-100/50 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20">
      <div className="hidden border-b border-gray-200/70 px-5 py-4 dark:border-slate-700/50 md:block">
        <div className="grid grid-cols-[minmax(260px,2fr)_110px_120px_220px] gap-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          <span>Пользователь</span>
          <span className="hidden lg:block">Факультет</span>
          <span className="hidden xl:block">Роль</span>
          <span className="text-right">Действия</span>
        </div>
      </div>

      {loading ? (
        <div className="px-5 py-16 text-center text-slate-500 dark:text-slate-400">Загрузка пользователей...</div>
      ) : users.length === 0 ? (
        <div className="px-5 py-16 text-center text-slate-500 dark:text-slate-400">Пользователи не найдены</div>
      ) : (
        <div className="divide-y divide-gray-200/70 dark:divide-slate-700/50">
          {users.map((user) => {
            const statusBadge = getStatusBadge(user);

            return (
              <div
                key={user.id}
                className={`grid grid-cols-1 gap-4 px-4 py-4 transition sm:px-5 md:grid-cols-[minmax(260px,2fr)_110px_120px_220px] md:items-center ${
                  highlightedUserId === user.id
                    ? 'bg-yellow-100/70 dark:bg-yellow-900/20'
                    : 'hover:bg-gray-100/70 dark:hover:bg-slate-800/70'
                }`}
              >
                <div className="flex min-w-0 items-start gap-3 md:items-center">
                  {user.avatar_url ? (
                    <img
                      src={buildMediaUrl(user.avatar_url)}
                      alt={user.fullname}
                      className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white/70 dark:ring-slate-800"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      {user.fullname?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-slate-950 dark:text-white">{user.fullname}</div>
                    <div className="truncate text-sm text-slate-500 dark:text-slate-400">{getUserSecondaryText(user)}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 md:hidden">
                      <span className="rounded-full bg-slate-200/70 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700/70 dark:text-slate-300">
                        {user.faculty || 'Не указан'}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge.className}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="hidden text-sm text-slate-600 dark:text-slate-300 lg:block">
                  {user.faculty || 'Не указан'}
                </div>

                <div className="hidden xl:block">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 md:flex-nowrap md:justify-end">
                  <span className={`hidden rounded-full px-2.5 py-1 text-xs font-medium xl:inline-flex ${statusBadge.className}`}>
                    {statusBadge.label}
                  </span>

                  <button
                    type="button"
                    aria-label={`Открыть профиль ${user.fullname}`}
                    onClick={() => viewProfile(user)}
                    className="inline-flex h-11 min-w-[56px] flex-1 items-center justify-center rounded-xl border border-gray-200/70 bg-gray-100/70 px-4 text-slate-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700/50 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:border-blue-500/60 dark:hover:text-blue-300 sm:h-12 sm:min-w-[64px] sm:flex-none"
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                  {user.is_admin ? (
                    <button
                      type="button"
                      disabled
                      aria-label={`Администратор ${user.fullname}`}
                      className="inline-flex h-11 min-w-[56px] flex-1 cursor-default items-center justify-center rounded-xl border border-gray-200/70 bg-gray-100/70 px-4 text-slate-400 dark:border-slate-700/50 dark:bg-slate-800/60 dark:text-slate-500 sm:h-12 sm:min-w-[64px] sm:flex-none"
                    >
                      <Shield className="h-4 w-4" />
                    </button>
                  ) : user.status === 'active' ? (
                    <button
                      type="button"
                      aria-label={`Заблокировать ${user.fullname}`}
                      onClick={() => openBanModal(user)}
                      className="inline-flex h-11 min-w-[56px] flex-1 items-center justify-center rounded-xl border border-red-200 bg-red-100/80 px-4 text-red-700 transition hover:bg-red-200 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400 sm:h-12 sm:min-w-[64px] sm:flex-none"
                    >
                      <Ban className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Разблокировать ${user.fullname}`}
                      onClick={() => openUnbanModal(user)}
                      className="inline-flex h-11 min-w-[56px] flex-1 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-100/80 px-4 text-emerald-700 transition hover:bg-emerald-200 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-400 sm:h-12 sm:min-w-[64px] sm:flex-none"
                    >
                      <UserCheck className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-4 border-t border-gray-200/70 px-4 py-4 text-sm text-slate-500 dark:border-slate-700/50 dark:text-slate-400 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-center lg:text-left">
          Показано {pageStart}-{pageEnd} из {totalUsers} пользователей
        </div>
        {pagination}
      </div>
    </section>
  );
}
