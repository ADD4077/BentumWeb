import React, { useEffect, useMemo, useState } from 'react';
import { Users, Ban, UserCheck, Search, Shield, Eye, RefreshCw, UserPlus } from 'lucide-react';

import { API_ENDPOINTS } from '../config/api.js';
import { buildMediaUrl } from '../utils/media.js';
import { buildCsrfHeaders } from '../utils/http.js';
import { showWarning, showError, showSuccess } from '../utils/notifications.js';
import AddUserModal from './AddUserModal.jsx';
import BanModal from './BanModal.jsx';
import BanSuccessModal from './BanSuccessModal.jsx';
import UnbanModal from './UnbanModal.jsx';
import UserProfileModal from './UserProfileModal.jsx';

const USERS_CACHE_KEY = 'admin_users';
const USERS_PER_PAGE = 10;

const emptyStats = { totalUsers: 0, bannedUsers: 0, activeUsers: 0, newUsersToday: 0 };

const fallbackStats = (users) => ({
  totalUsers: users.length,
  bannedUsers: users.filter((user) => user.status === 'banned').length,
  activeUsers: users.filter((user) => user.status === 'active').length,
  newUsersToday: 0,
});

function AdminPanel({ darkMode }) {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [highlightedUserId, setHighlightedUserId] = useState(null);
  const [banData, setBanData] = useState({ user: null, reason: '', duration: '7', durationLabel: '7 дней' });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [isBanSuccessModalOpen, setIsBanSuccessModalOpen] = useState(false);
  const [isUnbanModalOpen, setIsUnbanModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  useEffect(() => {
    loadUsers();
    loadStats();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, sortBy]);

  const readCachedUsers = () => {
    try {
      const raw = localStorage.getItem(USERS_CACHE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const writeCachedUsers = (value) => {
    try {
      localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(value));
    } catch {
      // noop
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      const response = await fetch(API_ENDPOINTS.USERS, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        setUsers(readCachedUsers());
        return;
      }

      const data = await response.json();
      const normalizedUsers = Array.isArray(data.users)
        ? data.users.map((user) => ({ ...user, avatar_url: user.avatar_url || null }))
        : readCachedUsers();

      setUsers(normalizedUsers);
      writeCachedUsers(normalizedUsers);
    } catch {
      setUsers(readCachedUsers());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.USERS_STATS, { credentials: 'include' });
      if (!response.ok) {
        setStats(fallbackStats(users));
        return;
      }

      const data = await response.json();
      setStats(data.success && data.stats ? data.stats : fallbackStats(users));
    } catch {
      setStats(fallbackStats(users));
    }
  };

  const refreshData = async () => {
    await loadUsers();
    await loadStats();
  };

  const handleAddUser = async (userData) => {
    const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' });
    const response = await fetch(API_ENDPOINTS.USERS_CREATE, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(userData),
    });

    if (response.status === 401) {
      throw new Error('У вас нет прав для добавления пользователей.');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.detail || 'Ошибка при добавлении пользователя');
    }

    await refreshData();
    return data;
  };

  const executeBan = async (userId, reason, durationPayload) => {
    try {
      const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' });
      const response = await fetch(API_ENDPOINTS.USERS_BAN, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ user_id: userId, reason, ...durationPayload }),
      });
      const data = await response.json();
      if (!data.success) {
        showError(data.detail || 'Ошибка при блокировке пользователя');
        return;
      }

      setIsBanModalOpen(false);
      setBanData((prev) => ({ ...prev, reason, ...durationPayload }));
      setIsBanSuccessModalOpen(true);
      setHighlightedUserId(userId);
      setTimeout(() => setHighlightedUserId(null), 3000);
      await refreshData();
    } catch {
      showError('Произошла ошибка при блокировке пользователя.');
    }
  };

  const executeUnban = async (userId) => {
    try {
      const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' });
      const response = await fetch(API_ENDPOINTS.USERS_UNBAN, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await response.json();
      if (!data.success) {
        showError(data.detail || 'Ошибка при разблокировке пользователя');
        return;
      }

      setIsUnbanModalOpen(false);
      setSelectedUser(null);
      setHighlightedUserId(userId);
      setTimeout(() => setHighlightedUserId(null), 3000);
      showSuccess('Пользователь успешно разблокирован.');
      await refreshData();
    } catch {
      showError('Произошла ошибка при разблокировке пользователя.');
    }
  };

  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => {
        const search = searchQuery.trim().toLowerCase();
        const matchesSearch = !search
          || user.fullname?.toLowerCase().includes(search)
          || user.student_code?.includes(search);
        const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') return (a.created_at || 0) - (b.created_at || 0);
        if (sortBy === 'name') return (a.fullname || '').localeCompare(b.fullname || '', 'ru');
        return (b.created_at || 0) - (a.created_at || 0);
      });
  }, [users, searchQuery, filterStatus, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const currentUsers = filteredUsers.slice((safeCurrentPage - 1) * USERS_PER_PAGE, safeCurrentPage * USERS_PER_PAGE);

  const viewProfile = (user) => {
    setSelectedUser(user);
    setIsProfileModalOpen(true);
  };

  const openBanModal = (user) => {
    if (user.is_admin) {
      showWarning('Нельзя заблокировать администратора.');
      return;
    }
    setBanData({ user, reason: '', duration: '7', durationLabel: '7 дней' });
    setIsBanModalOpen(true);
  };

  const statCards = [
    {
      label: 'Всего пользователей',
      value: stats.totalUsers,
      icon: Users,
      shellClass: 'bg-blue-100 dark:bg-blue-900/20',
      iconClass: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Активные',
      value: stats.activeUsers,
      icon: UserCheck,
      shellClass: 'bg-emerald-100 dark:bg-emerald-900/20',
      iconClass: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Заблокированы',
      value: stats.bannedUsers,
      icon: Ban,
      shellClass: 'bg-red-100 dark:bg-red-900/20',
      iconClass: 'text-red-600 dark:text-red-400',
    },
    {
      label: 'Новые сегодня',
      value: stats.newUsersToday,
      icon: UserPlus,
      shellClass: 'bg-purple-100 dark:bg-purple-900/20',
      iconClass: 'text-purple-600 dark:text-purple-400',
    },
  ];

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Админ-панель</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Управление пользователями и базовой статистикой</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button onClick={refreshData} className="flex items-center justify-center gap-2 rounded-xl border border-gray-200/70 bg-gray-100/50 px-4 py-2 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Обновление...' : 'Обновить'}
            </button>
            <button onClick={() => setIsAddUserModalOpen(true)} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500">
              <UserPlus className="h-4 w-4" />
              Добавить
            </button>
            <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200/70 bg-gray-100/50 px-4 py-2 text-emerald-700 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-emerald-400 dark:shadow-black/20">
              <Shield className="h-4 w-4" />
              Админ
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statCards.map(({ label, value, icon: Icon, shellClass, iconClass }) => (
            <div key={label} className="rounded-2xl border border-gray-200/70 bg-gray-100/50 p-4 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20">
              <div className="mb-3 flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${shellClass}`}>
                  <Icon className={`h-5 w-5 ${iconClass}`} />
                </div>
                <span className="text-xl font-bold text-slate-900 dark:text-white">{value}</span>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">{label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-200/70 bg-gray-100/50 p-4 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Поиск по имени или номеру студбилета..."
                className="w-full rounded-xl border border-gray-200/70 bg-gray-100/50 py-2 pl-9 pr-4 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:shadow-black/20"
              />
            </div>
            <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="rounded-xl border border-gray-200/70 bg-gray-100/50 px-4 py-2 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:shadow-black/20">
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="banned">Заблокированные</option>
            </select>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-xl border border-gray-200/70 bg-gray-100/50 px-4 py-2 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:shadow-black/20">
              <option value="newest">Новые первые</option>
              <option value="oldest">Старые первые</option>
              <option value="name">По имени</option>
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/70 bg-gray-100/50 p-4 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20">
          {loading ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">Загрузка пользователей...</div>
          ) : currentUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">Пользователи не найдены</div>
          ) : (
            <div className="space-y-3">
              {currentUsers.map((user) => (
                <div key={user.id} className={`rounded-xl border p-4 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:shadow-black/20 ${highlightedUserId === user.id ? 'border-yellow-300 bg-yellow-100/70 dark:border-yellow-700 dark:bg-yellow-900/20' : 'border-gray-200/70 bg-gray-100/40 dark:border-slate-700/50 dark:bg-slate-800/30'}`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img src={buildMediaUrl(user.avatar_url)} alt={user.fullname} className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-slate-600">
                          <span className="font-medium text-slate-600 dark:text-slate-300">{user.fullname?.charAt(0)?.toUpperCase() || 'U'}</span>
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">{user.fullname}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{user.student_code}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{user.faculty}</div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:items-end">
                      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${user.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                        {user.status === 'active' ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                        {user.status === 'active' ? 'Активен' : 'Заблокирован'}
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button onClick={() => viewProfile(user)} className="flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-2 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                          <Eye className="h-4 w-4" />
                          Профиль
                        </button>
                        {user.is_admin ? (
                          <button disabled className="flex cursor-default items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-slate-500 dark:bg-slate-700/60 dark:text-slate-300">
                            <Shield className="h-4 w-4" />
                            Админ
                          </button>
                        ) : user.status === 'active' ? (
                          <button onClick={() => openBanModal(user)} className="flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                            <Ban className="h-4 w-4" />
                            Бан
                          </button>
                        ) : (
                          <button onClick={() => { setSelectedUser(user); setIsUnbanModalOpen(true); }} className="flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between rounded-2xl border border-gray-200/70 bg-gray-100/50 p-4 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Страница {safeCurrentPage} из {totalPages}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={safeCurrentPage === 1} className="rounded-lg border border-gray-200 px-3 py-2 dark:border-slate-600">←</button>
              <button onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={safeCurrentPage === totalPages} className="rounded-lg border border-gray-200 px-3 py-2 dark:border-slate-600">→</button>
            </div>
          </div>
        )}
      </div>

      {isProfileModalOpen && selectedUser && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          studentCode={selectedUser.student_code}
          darkMode={darkMode}
        />
      )}
      {isBanModalOpen && <BanModal isOpen={isBanModalOpen} onClose={() => setIsBanModalOpen(false)} user={banData.user} onBan={executeBan} darkMode={darkMode} />}
      {isBanSuccessModalOpen && <BanSuccessModal isOpen={isBanSuccessModalOpen} onClose={() => setIsBanSuccessModalOpen(false)} user={banData.user} reason={banData.reason} duration={banData.duration} durationLabel={banData.durationLabel} darkMode={darkMode} />}
      {isUnbanModalOpen && <UnbanModal isOpen={isUnbanModalOpen} onClose={() => { setIsUnbanModalOpen(false); setSelectedUser(null); }} user={selectedUser} onUnban={executeUnban} darkMode={darkMode} />}
      {isAddUserModalOpen && <AddUserModal isOpen={isAddUserModalOpen} onClose={() => setIsAddUserModalOpen(false)} onAddUser={handleAddUser} darkMode={darkMode} />}
    </div>
  );
}

export default AdminPanel;
