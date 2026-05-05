import React, { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  BookUser,
  ChartPie,
  Lock,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';

import { API_ENDPOINTS } from '../config/api.js';
import { formatDateTime, formatRelativeTime, parseDateValue } from '../utils/dates.js';
import { buildCsrfHeaders } from '../utils/http.js';
import { showWarning, showError, showSuccess } from '../utils/notifications.js';
import { getRoleLabel } from '../utils/roles.js';
import AddUserModal from './AddUserModal.jsx';
import BanModal from './BanModal.jsx';
import BanSuccessModal from './BanSuccessModal.jsx';
import UnbanModal from './UnbanModal.jsx';
import UserProfileModal from './UserProfileModal.jsx';
import AdminActivityLog from './admin/AdminActivityLog.jsx';
import AdminInsightsColumn from './admin/AdminInsightsColumn.jsx';
import AdminPagination from './admin/AdminPagination.jsx';
import AdminStatsGrid from './admin/AdminStatsGrid.jsx';
import AdminToolbar from './admin/AdminToolbar.jsx';
import AdminUsersList from './admin/AdminUsersList.jsx';

const USERS_PER_PAGE = 10;
const ACTIVITY_PAGE_SIZE = 10;
const FACULTY_FALLBACK = 'Не указан';
const emptyStats = {
  totalUsers: 0,
  bannedUsers: 0,
  activeUsers: 0,
  newUsersToday: 0,
  newUsersWeek: 0,
};

function buildEmptyRegistrationsSeries(days = 30) {
  const now = new Date();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(now.getDate() - (days - index - 1));
    return {
      label: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      count: 0,
    };
  });
}

function isWithinDays(value, days) {
  const parsedDate = parseDateValue(value);
  return parsedDate ? Date.now() - parsedDate.getTime() <= days * 86_400_000 : false;
}

function getUserActivityDate(user) {
  return user.last_login || user.updated_at || user.created_at || null;
}

function getUserEmail(user) {
  return user.email || user.mail || user.username || '';
}

function formatPercent(value, fractionDigits = 1) {
  return `${value.toLocaleString('ru-RU', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}%`;
}

function fallbackStats(users) {
  return {
    totalUsers: users.length,
    bannedUsers: users.filter((user) => user.status === 'banned').length,
    activeUsers: users.filter((user) => user.status === 'active').length,
    newUsersToday: users.filter((user) => isWithinDays(user.created_at, 1)).length,
    newUsersWeek: users.filter((user) => isWithinDays(user.created_at, 7)).length,
  };
}

function downloadTextFile(filename, content) {
  if (typeof document === 'undefined') {
    return;
  }

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function mapActivityItem(item) {
  const toneByType = {
    user_created: { icon: UserPlus, iconShell: 'bg-violet-500/10', iconClass: 'text-violet-400' },
    user_banned: { icon: Ban, iconShell: 'bg-rose-500/10', iconClass: 'text-rose-400' },
    user_unbanned: { icon: UserCheck, iconShell: 'bg-emerald-500/10', iconClass: 'text-emerald-400' },
    admin_assigned: { icon: ShieldAlert, iconShell: 'bg-sky-500/10', iconClass: 'text-sky-400' },
    admin_removed: { icon: ShieldAlert, iconShell: 'bg-amber-500/10', iconClass: 'text-amber-400' },
    telegram_linked: { icon: RefreshCw, iconShell: 'bg-cyan-500/10', iconClass: 'text-cyan-400' },
    telegram_unlinked: { icon: RefreshCw, iconShell: 'bg-slate-500/10', iconClass: 'text-slate-300' },
    twofa_enabled: { icon: Lock, iconShell: 'bg-emerald-500/10', iconClass: 'text-emerald-400' },
    twofa_disabled: { icon: Lock, iconShell: 'bg-amber-500/10', iconClass: 'text-amber-400' },
  };

  const tone = toneByType[item.event_type] || toneByType.user_created;
  return {
    ...item,
    time: formatRelativeTime(item.created_at),
    ...tone,
  };
}

export default function AdminPanel({ darkMode, setActiveTab }) {
  const [adminView, setAdminView] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [filterFaculty, setFilterFaculty] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [faculties, setFaculties] = useState([]);
  const [roleDistribution, setRoleDistribution] = useState([]);
  const [registrationsSeries, setRegistrationsSeries] = useState(() => buildEmptyRegistrationsSeries());
  const [recentActivityRaw, setRecentActivityRaw] = useState([]);
  const [moderationQueueRaw, setModerationQueueRaw] = useState([]);
  const [activityItems, setActivityItems] = useState([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activitySearch, setActivitySearch] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  const [activityPeriodFilter, setActivityPeriodFilter] = useState('all');
  const [activityTypeOptions, setActivityTypeOptions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [highlightedUserId, setHighlightedUserId] = useState(null);
  const [banData, setBanData] = useState({ user: null, reason: '', duration: '7', durationLabel: '7 дней' });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [isBanSuccessModalOpen, setIsBanSuccessModalOpen] = useState(false);
  const [isUnbanModalOpen, setIsUnbanModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  const loadUsers = async (page = currentPage, showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(USERS_PER_PAGE),
      });

      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterRole !== 'all') params.set('role', filterRole);
      if (filterFaculty !== 'all') params.set('faculty', filterFaculty);
      if (periodFilter !== 'all') params.set('period', periodFilter);
      if (sortBy !== 'newest') params.set('sort', sortBy);

      const response = await fetch(`${API_ENDPOINTS.USERS}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setUsers([]);
          setTotalUsers(0);
          setTotalPages(1);
          setFaculties([]);
          setRoleDistribution([]);
          setRegistrationsSeries(buildEmptyRegistrationsSeries());
          setRecentActivityRaw([]);
          setModerationQueueRaw([]);
        }
        return [];
      }

      const data = await response.json();
      const normalizedUsers = Array.isArray(data.users)
        ? data.users.map((user) => ({ ...user, avatar_url: user.avatar_url || null }))
        : [];

      setUsers(normalizedUsers);
      setTotalUsers(data.total || 0);
      setTotalPages(Math.max(1, data.total_pages || 1));
      setFaculties(Array.isArray(data.faculties) ? data.faculties : []);
      setRoleDistribution(Array.isArray(data.insights?.roleDistribution) ? data.insights.roleDistribution : []);
      setRegistrationsSeries(
        Array.isArray(data.insights?.registrationsSeries) && data.insights.registrationsSeries.length
          ? data.insights.registrationsSeries
          : buildEmptyRegistrationsSeries(),
      );
      setRecentActivityRaw(Array.isArray(data.insights?.recentActivity) ? data.insights.recentActivity : []);
      setModerationQueueRaw(Array.isArray(data.insights?.moderationQueue) ? data.insights.moderationQueue : []);

      if (typeof data.page === 'number' && data.page !== currentPage) {
        setCurrentPage(data.page);
      }

      return normalizedUsers;
    } catch {
      return users;
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  const loadStats = async (usersSnapshot = users) => {
    try {
      const response = await fetch(API_ENDPOINTS.USERS_STATS, { credentials: 'include' });
      if (!response.ok) {
        setStats(fallbackStats(usersSnapshot));
        return;
      }

      const data = await response.json();
      setStats(data.success && data.stats ? data.stats : fallbackStats(usersSnapshot));
    } catch {
      setStats(fallbackStats(usersSnapshot));
    }
  };

  const loadActivity = async (page = activityPage, showLoader = false) => {
    if (showLoader) {
      setActivityLoading(true);
    }

    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(ACTIVITY_PAGE_SIZE),
      });

      if (activitySearch.trim()) params.set('search', activitySearch.trim());
      if (activityTypeFilter !== 'all') params.set('event_type', activityTypeFilter);
      if (activityPeriodFilter !== 'all') params.set('period', activityPeriodFilter);

      const response = await fetch(`${API_ENDPOINTS.ADMIN_ACTIVITY}?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setActivityItems(Array.isArray(data.items) ? data.items : []);
      setActivityTotal(data.total || 0);
      setActivityTotalPages(Math.max(1, data.total_pages || 1));
      setActivityTypeOptions(Array.isArray(data.event_types) ? data.event_types : []);

      if (typeof data.page === 'number' && data.page !== activityPage) {
        setActivityPage(data.page);
      }
    } finally {
      if (showLoader) {
        setActivityLoading(false);
      }
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    const loadedUsers = await loadUsers(currentPage, true);
    await loadStats(loadedUsers);
    if (adminView === 'activity') {
      await loadActivity(activityPage, true);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    const bootstrap = async () => {
      const loadedUsers = await loadUsers(1, true);
      await loadStats(loadedUsers);
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
      return;
    }

    loadUsers(1, true);
  }, [searchQuery, filterStatus, filterRole, filterFaculty, periodFilter, sortBy]);

  useEffect(() => {
    if (currentPage === 1) {
      return;
    }

    loadUsers(currentPage, true);
  }, [currentPage]);

  useEffect(() => {
    if (activityPage !== 1) {
      setActivityPage(1);
      return;
    }

    if (adminView === 'activity') {
      loadActivity(1, true);
    }
  }, [activitySearch, activityTypeFilter, activityPeriodFilter, adminView]);

  useEffect(() => {
    if (adminView === 'activity' && activityPage > 1) {
      loadActivity(activityPage, true);
    }
  }, [activityPage, adminView]);

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

  const recentActivity = useMemo(() => recentActivityRaw.slice(0, 3).map(mapActivityItem), [recentActivityRaw]);
  const moderationQueueItems = useMemo(() => {
    const toneByType = {
      support: { icon: BookUser, iconShell: 'bg-emerald-500/10', iconClass: 'text-emerald-400' },
      bug: { icon: ShieldAlert, iconShell: 'bg-rose-500/10', iconClass: 'text-rose-400' },
      feature: { icon: Sparkles, iconShell: 'bg-fuchsia-500/10', iconClass: 'text-fuchsia-400' },
      question: { icon: RefreshCw, iconShell: 'bg-blue-500/10', iconClass: 'text-blue-400' },
    };

    return moderationQueueRaw.map((item) => {
      const tone = toneByType[item.request_type] || toneByType.support;
      return {
        ...item,
        title: item.subject,
        subtitle: `${item.created_by?.fullname || 'Пользователь'}${item.preview ? ` · ${item.preview}` : ''}`,
        time: formatRelativeTime(item.last_message_at),
        ...tone,
      };
    });
  }, [moderationQueueRaw]);

  const pageStart = totalUsers === 0 ? 0 : (currentPage - 1) * USERS_PER_PAGE + 1;
  const pageEnd = totalUsers === 0 ? 0 : Math.min(totalUsers, (currentPage - 1) * USERS_PER_PAGE + users.length);

  const activeFiltersCount = [
    searchQuery,
    filterStatus !== 'all',
    filterRole !== 'all',
    filterFaculty !== 'all',
    periodFilter !== 'all',
    sortBy !== 'newest',
  ].filter(Boolean).length;

  const bannedUsersPercent = stats.totalUsers ? (stats.bannedUsers / stats.totalUsers) * 100 : 0;
  const newUsersTodayPercent = stats.totalUsers ? (stats.newUsersToday / stats.totalUsers) * 100 : 0;
  const newUsersWeekPercent = stats.totalUsers ? (stats.newUsersWeek / stats.totalUsers) * 100 : 0;

  const statCards = [
    {
      label: 'Всего пользователей',
      value: stats.totalUsers.toLocaleString('ru-RU'),
      meta: 'Текущая база пользователей',
      trend: null,
      icon: Users,
      shellClass: 'bg-blue-500/10',
      iconClass: 'text-blue-400',
      trendClass: 'bg-blue-500/10 text-blue-400',
    },
    {
      label: 'Заблокированы',
      value: stats.bannedUsers.toLocaleString('ru-RU'),
      meta: stats.totalUsers ? `${formatPercent(bannedUsersPercent)} от всех пользователей` : 'Нет данных',
      trend: formatPercent(bannedUsersPercent),
      icon: Ban,
      shellClass: 'bg-rose-500/10',
      iconClass: 'text-rose-400',
      trendClass: 'bg-rose-500/10 text-rose-400',
    },
    {
      label: 'Новые сегодня',
      value: stats.newUsersToday.toLocaleString('ru-RU'),
      meta: stats.totalUsers ? `${formatPercent(newUsersTodayPercent)} от всех пользователей` : 'Нет данных',
      trend: formatPercent(newUsersTodayPercent),
      icon: Sparkles,
      shellClass: 'bg-fuchsia-500/10',
      iconClass: 'text-fuchsia-400',
      trendClass: 'bg-fuchsia-500/10 text-fuchsia-400',
    },
    {
      label: 'Новые за неделю',
      value: stats.newUsersWeek.toLocaleString('ru-RU'),
      meta: stats.totalUsers ? `${formatPercent(newUsersWeekPercent)} от всех пользователей` : 'Нет данных',
      trend: formatPercent(newUsersWeekPercent),
      icon: UserCheck,
      shellClass: 'bg-emerald-500/10',
      iconClass: 'text-emerald-400',
      trendClass: 'bg-emerald-500/10 text-emerald-400',
    },
    {
      label: 'Роли в системе',
      value: roleDistribution.length.toLocaleString('ru-RU'),
      meta: roleDistribution.map((item) => item.label).join(', '),
      trend: null,
      icon: ChartPie,
      shellClass: 'bg-amber-500/10',
      iconClass: 'text-amber-400',
      trendClass: 'bg-amber-500/10 text-amber-300',
    },
  ];

  const exportUsers = () => {
    const csvRows = users.map((user) => [
      user.fullname || '',
      user.student_code || '',
      user.faculty || '',
      user.is_admin ? 'Администратор' : getRoleLabel(user.role),
      user.status === 'banned' ? 'Заблокирован' : 'Активен',
      getUserEmail(user),
      formatDateTime(user.created_at, ''),
      formatDateTime(getUserActivityDate(user), ''),
    ]);

    const csv = [
      '﻿Имя;Студенческий ID;Факультет;Роль;Статус;Email;Дата регистрации;Последняя активность',
      ...csvRows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')),
    ].join('\n');

    downloadTextFile(`bentum-admin-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    showSuccess('Файл экспорта сформирован для текущей страницы.');
  };

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

  const resetFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterRole('all');
    setFilterFaculty('all');
    setPeriodFilter('all');
    setSortBy('newest');
  };

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="mx-auto max-w-[1560px] space-y-6">
        {adminView === 'dashboard' ? (
          <>
            <AdminToolbar
              refreshing={refreshing}
              refreshData={refreshData}
              openAddUserModal={() => setIsAddUserModalOpen(true)}
              exportUsers={exportUsers}
              resetFilters={resetFilters}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              filterRole={filterRole}
              setFilterRole={setFilterRole}
              filterFaculty={filterFaculty}
              setFilterFaculty={setFilterFaculty}
              sortBy={sortBy}
              setSortBy={setSortBy}
              periodFilter={periodFilter}
              setPeriodFilter={setPeriodFilter}
              faculties={faculties.length ? faculties : [FACULTY_FALLBACK]}
              activeFiltersCount={activeFiltersCount}
            />

            <AdminStatsGrid statCards={statCards} />

            <div className="grid gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1.8fr)_380px]">
              <AdminUsersList
                loading={loading}
                users={users}
                highlightedUserId={highlightedUserId}
                viewProfile={viewProfile}
                openBanModal={openBanModal}
                openUnbanModal={openUnbanModal}
                totalUsers={totalUsers}
                pageStart={pageStart}
                pageEnd={pageEnd}
                pagination={(
                  <AdminPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    setCurrentPage={setCurrentPage}
                  />
                )}
              />

              <AdminInsightsColumn
                roleData={roleDistribution}
                totalUsers={totalUsers}
                registrationsSeries={registrationsSeries}
                recentActivity={recentActivity}
                moderationQueue={moderationQueueItems}
                onOpenActivity={() => setAdminView('activity')}
                onOpenModeration={() => setActiveTab('moder')}
              />
            </div>
          </>
        ) : (
          <AdminActivityLog
            loading={activityLoading}
            items={activityItems}
            total={activityTotal}
            page={activityPage}
            totalPages={activityTotalPages}
            search={activitySearch}
            setSearch={setActivitySearch}
            typeFilter={activityTypeFilter}
            setTypeFilter={setActivityTypeFilter}
            periodFilter={activityPeriodFilter}
            setPeriodFilter={setActivityPeriodFilter}
            eventTypes={activityTypeOptions}
            onBack={() => setAdminView('dashboard')}
            setPage={setActivityPage}
          />
        )}
      </div>

      {isProfileModalOpen && selectedUser && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          studentCode={selectedUser.student_code}
          userId={selectedUser.id}
          darkMode={darkMode}
          showActivityMeta
          adminView
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
