import React, { useEffect, useMemo, useState } from 'react';
import { Ban, UserCheck, UserPlus, Users } from 'lucide-react';

import { API_ENDPOINTS } from '../config/api.js';
import { buildCsrfHeaders } from '../utils/http.js';
import { showWarning, showError, showSuccess } from '../utils/notifications.js';
import AddUserModal from './AddUserModal.jsx';
import BanModal from './BanModal.jsx';
import BanSuccessModal from './BanSuccessModal.jsx';
import UnbanModal from './UnbanModal.jsx';
import UserProfileModal from './UserProfileModal.jsx';
import AdminPagination from './admin/AdminPagination.jsx';
import AdminStatsGrid from './admin/AdminStatsGrid.jsx';
import AdminToolbar from './admin/AdminToolbar.jsx';
import AdminUsersList from './admin/AdminUsersList.jsx';
import { getDateSortValue } from '../utils/dates.js';

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
        if (sortBy === 'oldest') return getDateSortValue(a.created_at) - getDateSortValue(b.created_at);
        if (sortBy === 'name') return (a.fullname || '').localeCompare(b.fullname || '', 'ru');
        return getDateSortValue(b.created_at) - getDateSortValue(a.created_at);
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

  const openUnbanModal = (user) => {
    setSelectedUser(user);
    setIsUnbanModalOpen(true);
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
        <AdminToolbar
          refreshing={refreshing}
          refreshData={refreshData}
          openAddUserModal={() => setIsAddUserModalOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />

        <AdminStatsGrid statCards={statCards} />

        <AdminUsersList
          loading={loading}
          users={currentUsers}
          highlightedUserId={highlightedUserId}
          viewProfile={viewProfile}
          openBanModal={openBanModal}
          openUnbanModal={openUnbanModal}
        />

        <AdminPagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
        />
      </div>

      {isProfileModalOpen && selectedUser && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          studentCode={selectedUser.student_code}
          darkMode={darkMode}
          showActivityMeta
        />
      )}
      {isBanModalOpen && (
        <BanModal
          isOpen={isBanModalOpen}
          onClose={() => setIsBanModalOpen(false)}
          user={banData.user}
          onBan={executeBan}
          darkMode={darkMode}
        />
      )}
      {isBanSuccessModalOpen && (
        <BanSuccessModal
          isOpen={isBanSuccessModalOpen}
          onClose={() => setIsBanSuccessModalOpen(false)}
          user={banData.user}
          reason={banData.reason}
          duration={banData.duration}
          durationLabel={banData.durationLabel}
          darkMode={darkMode}
        />
      )}
      {isUnbanModalOpen && (
        <UnbanModal
          isOpen={isUnbanModalOpen}
          onClose={() => {
            setIsUnbanModalOpen(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          onUnban={executeUnban}
          darkMode={darkMode}
        />
      )}
      {isAddUserModalOpen && (
        <AddUserModal
          isOpen={isAddUserModalOpen}
          onClose={() => setIsAddUserModalOpen(false)}
          onAddUser={handleAddUser}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

export default AdminPanel;
