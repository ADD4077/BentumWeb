import React from 'react';
import { Ban, Eye, Shield, UserCheck } from 'lucide-react';

import { buildMediaUrl } from '../../utils/media.js';
import { getRoleLabel } from '../../utils/roles.js';

export default function AdminUsersList({
  loading,
  users,
  highlightedUserId,
  viewProfile,
  openBanModal,
  openUnbanModal,
}) {
  return (
    <div className="rounded-2xl border border-gray-200/70 bg-gray-100/50 p-4 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20">
      {loading ? (
        <div className="py-12 text-center text-slate-500 dark:text-slate-400">Загрузка пользователей...</div>
      ) : users.length === 0 ? (
        <div className="py-12 text-center text-slate-500 dark:text-slate-400">Пользователи не найдены</div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className={`rounded-xl border p-4 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:shadow-black/20 ${
                highlightedUserId === user.id
                  ? 'border-yellow-300 bg-yellow-100/70 dark:border-yellow-700 dark:bg-yellow-900/20'
                  : 'border-gray-200/70 bg-gray-100/40 dark:border-slate-700/50 dark:bg-slate-800/30'
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  {user.avatar_url ? (
                    <img
                      src={buildMediaUrl(user.avatar_url)}
                      alt={user.fullname}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-slate-600">
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        {user.fullname?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{user.fullname}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{user.student_code}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{user.faculty}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{getRoleLabel(user.role)}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:items-end">
                  <div
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                      user.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }`}
                  >
                    {user.status === 'active' ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                    {user.status === 'active' ? 'Активен' : 'Заблокирован'}
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      onClick={() => viewProfile(user)}
                      className="flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-2 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                    >
                      <Eye className="h-4 w-4" />
                      Профиль
                    </button>

                    {user.is_admin ? (
                      <button
                        disabled
                        className="flex cursor-default items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-slate-500 dark:bg-slate-700/60 dark:text-slate-300"
                      >
                        <Shield className="h-4 w-4" />
                        Админ
                      </button>
                    ) : user.status === 'active' ? (
                      <button
                        onClick={() => openBanModal(user)}
                        className="flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                      >
                        <Ban className="h-4 w-4" />
                        Бан
                      </button>
                    ) : (
                      <button
                        onClick={() => openUnbanModal(user)}
                        className="flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                      >
                        <UserCheck className="h-4 w-4" />
                        Разбан
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
