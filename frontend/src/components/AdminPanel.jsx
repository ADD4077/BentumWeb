import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { API_ENDPOINTS } from '../config/api.js';
import { buildMediaUrl } from '../utils/media.js';
import { 
  Users, 
  Ban, 
  UserCheck, 
  Search, 
  Shield, 
  Calendar, 
  Clock, 
  AlertTriangle,
  Eye,
  Filter,
  RefreshCw,
  X,
  MoreVertical,
  Settings,
  BarChart3,
  UserX,
  UserPlus,
  Globe,
  BookOpen
} from 'lucide-react';
import { showWarning, showError, showSuccess } from '../utils/notifications.js';
import BanModal from './BanModal.jsx';
import BanSuccessModal from './BanSuccessModal.jsx';
import UnbanModal from './UnbanModal.jsx';
import AddUserModal from './AddUserModal.jsx';

function AdminPanel({ darkMode }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [highlightedUserId, setHighlightedUserId] = useState(null);
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [isBanSuccessModalOpen, setIsBanSuccessModalOpen] = useState(false);
  const [isUnbanModalOpen, setIsUnbanModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [banData, setBanData] = useState({ user: null, reason: '', duration: '7' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedUserMedia, setSelectedUserMedia] = useState({
    avatar_url: null,
    banner_url: null,
    avatar_placeholder: null,
    banner_placeholder: null
  });
  const [stats, setStats] = useState({
    totalUsers: 0,
    bannedUsers: 0,
    activeUsers: 0,
    newUsersToday: 0
  });
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  useEffect(() => {
    loadUsers();
    loadStats();
  }, []);

  // Сбрасываем страницу при изменении фильтров
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, sortBy]);

  const loadUsers = async () => {
    setLoading(true);
    setIsRefreshing(true);
    try {
      // Загружаем пользователей из реальной базы данных
      const response = await fetch(API_ENDPOINTS.USERS, {
        credentials: 'include'
      });
      
      if (response.status === 401) {
        // Пользователь не авторизован или не админ
        setUsers([]);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users);
        localStorage.setItem('admin_users', JSON.stringify(data.users));
      } else {
        // Если API недоступен, используем localStorage
        const storedUsers = localStorage.getItem('admin_users');
        if (storedUsers) {
          setUsers(JSON.parse(storedUsers));
        } else {
          setUsers([]);
        }
      }
    } catch (error) {
      // При ошибке используем localStorage
      const storedUsers = localStorage.getItem('admin_users');
      if (storedUsers) {
        setUsers(JSON.parse(storedUsers));
      } else {
        setUsers([]);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadStats = async () => {
    try {
      // Загружаем статистику из реальной базы данных
      const response = await fetch(API_ENDPOINTS.USERS_STATS, {
        credentials: 'include'
      });
      
      if (response.status === 401) {
        // Пользователь не авторизован или не админ
        setStats({
          totalUsers: 0,
          bannedUsers: 0,
          activeUsers: 0,
          newUsersToday: 0,
          newUsersThisWeek: 0,
          newUsersThisMonth: 0
        });
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      } else {
        // Если API недоступен, используем моковые данные
        const mockStats = {
          totalUsers: users.length,
          bannedUsers: users.filter(u => u.status === 'banned').length,
          activeUsers: users.filter(u => u.status === 'active').length,
          newUsersToday: 0,
          newUsersThisWeek: 0,
          newUsersThisMonth: 0
        };
        setStats(mockStats);
      }
    } catch (error) {
      // При ошибке используем моковые данные
      const mockStats = {
        totalUsers: users.length,
        bannedUsers: users.filter(u => u.status === 'banned').length,
        activeUsers: users.filter(u => u.status === 'active').length,
        newUsersToday: 0,
        newUsersThisWeek: 0,
        newUsersThisMonth: 0
      };
      setStats(mockStats);
    }
  };

  const handleAddUser = async (userData) => {
    try {
      // Отправляем запрос на создание пользователя
      const response = await fetch(API_ENDPOINTS.USERS_CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData)
      });
      
      if (response.status === 401) {
        throw new Error('❌ У вас нет прав для добавления пользователей!');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Обновляем список пользователей
        loadUsers();
        loadStats();
        return data;
      } else {
        throw new Error(data.detail || 'Ошибка при добавлении пользователя');
      }
    } catch (error) {
      throw error;
    }
  };

  const handleBanUser = (userId) => {
    const userToBan = users.find(u => u.id === userId);
    if (userToBan && (userToBan.id === 1 || userToBan.fullname?.includes('Admin'))) {
      showWarning('❌ Нельзя забанить администратора!');
      return;
    }
    
    // Открываем модальное окно бана
    setBanData({ user: userToBan, reason: '', duration: '7' });
    setIsBanModalOpen(true);
  };

  const executeBan = async (userId, reason, duration) => {
    try {
      // Отправляем запрос на бан пользователя
      const response = await fetch(API_ENDPOINTS.USERS_BAN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: userId,
          reason: reason,
          duration: duration
        })
      });
      
      if (response.status === 401) {
        showError('❌ У вас нет прав для блокировки пользователей!');
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Закрываем модальное окно бана
        setIsBanModalOpen(false);
        
        // Показываем модальное окно успеха
        setBanData({ user: banData.user, reason, duration });
        setIsBanSuccessModalOpen(true);
        
        setHighlightedUserId(userId);
        setTimeout(() => setHighlightedUserId(null), 3000);
        
        // Обновляем список пользователей
        loadUsers();
        loadStats();
      } else {
        showError(`❌ Ошибка при блокировке пользователя: ${data.detail}`);
      }
    } catch (error) {
      showError('❌ Произошла ошибка при блокировке пользователя');
    }
  };

  const handleUnbanUser = (userId) => {
    const userToUnban = users.find(u => u.id === userId);
    setSelectedUser(userToUnban);
    setIsUnbanModalOpen(true);
  };

  const executeUnban = async (userId) => {
    try {
      // Отправляем запрос на разбан пользователя
      const response = await fetch(API_ENDPOINTS.USERS_UNBAN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: userId
        })
      });
      
      if (response.status === 401) {
        showError('❌ У вас нет прав для разблокировки пользователей!');
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setIsUnbanModalOpen(false);
        setSelectedUser(null);
        setHighlightedUserId(userId);
        setTimeout(() => setHighlightedUserId(null), 3000);
        showSuccess('✅ Пользователь успешно разблокирован!');
        // Обновляем список пользователей
        loadUsers();
        loadStats();
      } else {
        showError(`❌ Ошибка при разблокировке пользователя: ${data.detail}`);
      }
    } catch (error) {
      showError('❌ Произошла ошибка при разблокировке пользователя');
    }
  };

  const handleViewProfile = async (user) => {
    setSelectedUser(user);
    
    // Загружаем медиа данные пользователя
    try {
      const response = await fetch(`${API_ENDPOINTS.USER_MEDIA}?user_id=${user.id}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSelectedUserMedia({
            avatar_url: data.avatar_url,
            banner_url: data.banner_url,
            avatar_placeholder: data.avatar_placeholder,
            banner_placeholder: data.banner_placeholder
          });
        }
      }
    } catch (error) {
      console.error('Error loading user media:', error);
      // Оставляем значения по умолчанию если загрузка не удалась
    }
    
    setIsProfileModalOpen(true);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.fullname.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           user.student_code.includes(searchQuery);
      
      const matchesFilter = filterStatus === 'all' || 
                            (filterStatus === 'active' && user.status === 'active') ||
                            (filterStatus === 'banned' && user.status === 'banned');
      
      return matchesSearch && matchesFilter;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.registration_date * 1000) - new Date(a.registration_date * 1000);
        case 'oldest':
          return new Date(a.registration_date * 1000) - new Date(b.registration_date * 1000);
        case 'name':
          return a.fullname.localeCompare(b.fullname);
        default:
          return 0;
      }
    });
  }, [users, searchQuery, filterStatus, sortBy]);

  // Пагинация
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const getStatusColor = (status) => {
    return status === 'active' 
      ? 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20'
      : 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
  };

  const getStatusIcon = (status) => {
    return status === 'active' ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-2">
                Админ-панель
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Управление пользователями и статистика
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <button
                onClick={loadUsers}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm sm:text-base">
                  {isRefreshing ? 'Обновление...' : 'Обновить'}
                </span>
              </button>
              <button
                onClick={() => setIsAddUserModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span className="text-sm sm:text-base">Добавить</span>
              </button>
              <div className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl">
                <Shield className="w-4 h-4" />
                <span className="text-sm sm:text-base">Админ</span>
              </div>
            </div>
          </div>

          {/* Инструкция */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-3 sm:p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 dark:text-blue-400 text-sm">💡</span>
              </div>
              <div className="text-left flex-1">
                <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 text-sm sm:text-base">Как пользоваться админкой:</h3>
                <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <p>👁️ <strong className="hidden sm:inline">Просмотр профиля:</strong> <span className="sm:hidden">Профиль:</span> нажмите на глазок 👁️ чтобы увидеть детали</p>
                  <p>🚫 <strong className="hidden sm:inline">Бан пользователя:</strong> <span className="sm:hidden">Бан:</span> нажмите на красный крест 🚫 → введите причину и срок</p>
                  <p>✅ <strong className="hidden sm:inline">Разбан:</strong> <span className="sm:hidden">Разбан:</span> нажмите на зеленую галочку ✅ чтобы разблокировать</p>
                  <p>🛡️ <strong className="hidden sm:inline">Администраторы:</strong> <span className="sm:hidden">Админы:</span> не могут быть забанены (защита щитом)</p>
                  <p>🔍 <strong className="hidden sm:inline">Поиск:</strong> <span className="sm:hidden">Поиск:</span> используйте поиск по имени или номеру студбилета</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stats.totalUsers}</span>
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Всего пользователей</h3>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stats.activeUsers}</span>
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Активные</h3>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
                <Ban className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stats.bannedUsers}</span>
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Заблокированы</h3>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stats.newUsersToday}</span>
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Новые сегодня</h3>
          </div>
        </div>

        {/* Фильтры и поиск */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Поиск по имени или номеру студбилета..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-12 pr-4 py-2 sm:py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              >
                <option value="all">Все статусы</option>
                <option value="active">Активные</option>
                <option value="banned">Заблокированные</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              >
                <option value="newest">Новые первые</option>
                <option value="oldest">Старые первые</option>
                <option value="name">По имени</option>
              </select>
            </div>
          </div>
        </div>

        {/* Таблица пользователей */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          {/* Десктопная версия - таблица */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Пользователь
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Факультет
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Последний вход
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <span className="text-slate-500 dark:text-slate-400">Загрузка пользователей...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                        <span className="text-slate-500 dark:text-slate-400">Пользователи не найдены</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentUsers.map((user) => (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all duration-300 ${
                        highlightedUserId === user.id 
                          ? 'bg-yellow-100 dark:bg-yellow-900/20 animate-pulse' 
                          : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {user.avatar_url ? (
                            <img 
                              src={buildMediaUrl(user.avatar_url)}
                              alt={user.fullname}
                              className="w-10 h-10 rounded-full object-cover mr-3"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 dark:bg-slate-600 rounded-full flex items-center justify-center mr-3">
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                {user.fullname.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                              {user.fullname}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              {user.student_code}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900 dark:text-white">
                          {user.faculty}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                          {getStatusIcon(user.status)}
                          {user.status === 'active' ? 'Активен' : 'Заблокирован'}
                        </div>
                        {user.status === 'banned' && user.ban_end_date && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            До {new Date(user.ban_end_date).toLocaleDateString('ru-RU')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900 dark:text-white">
                          {user.last_login ? 
                            new Date(user.last_login * 1000).toLocaleString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : '—'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewProfile(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Просмотр профиля"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {user.status === 'active' ? (
                            <>
                              {(user.id === 1 || user.fullname?.includes('Admin')) ? (
                                <div className="p-2 text-gray-400 cursor-not-allowed rounded-lg" title="🛡️ Администратор не может быть забанен">
                                  <Shield className="w-4 h-4" />
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleBanUser(user.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title="🚫 Заблокировать пользователя"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                handleUnbanUser(user.id);
                              }}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                              title="✅ Разблокировать пользователя"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Мобильная версия - карточки */}
          <div className="lg:hidden p-4 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <span className="text-slate-500 dark:text-slate-400">Загрузка пользователей...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                <span className="text-slate-500 dark:text-slate-400">Пользователи не найдены</span>
              </div>
            ) : (
              currentUsers.map((user) => (
                <div 
                  key={user.id} 
                  className={`bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-200 dark:border-slate-600 transition-all duration-300 ${
                    highlightedUserId === user.id 
                      ? 'bg-yellow-100 dark:bg-yellow-900/20 animate-pulse border-yellow-300 dark:border-yellow-700' 
                      : ''
                  }`}
                >
                  {/* Заголовок карточки */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img 
                          src={buildMediaUrl(user.avatar_url)}
                          alt={user.fullname}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 dark:bg-slate-600 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            {user.fullname.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {user.fullname}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {user.student_code}
                        </div>
                      </div>
                    </div>
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                      {getStatusIcon(user.status)}
                      {user.status === 'active' ? 'Активен' : 'Заблокирован'}
                    </div>
                  </div>

                  {/* Информация о пользователе */}
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Факультет:</span>
                      <span className="text-sm text-slate-900 dark:text-white">{user.faculty}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Последний вход:</span>
                      <span className="text-sm text-slate-900 dark:text-white">
                        {user.last_login ? 
                          new Date(user.last_login * 1000).toLocaleDateString('ru-RU') : '—'
                        }
                      </span>
                    </div>
                    {user.status === 'banned' && user.ban_end_date && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Бан до:</span>
                        <span className="text-sm text-red-600 dark:text-red-400">
                          {new Date(user.ban_end_date).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Кнопки действий */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-slate-600">
                    <button
                      onClick={() => handleViewProfile(user)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Профиль</span>
                    </button>
                    
                    {user.status === 'active' ? (
                      (user.id === 1 || user.fullname?.includes('Admin')) ? (
                        <div className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 dark:bg-slate-600 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed text-sm">
                          <Shield className="w-4 h-4" />
                          <span>Защита</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleBanUser(user.id)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors text-sm"
                        >
                          <Ban className="w-4 h-4" />
                          <span>Забан</span>
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => handleUnbanUser(user.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/30 transition-colors text-sm"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Разбан</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Пагинация */}
        {totalPages > 1 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 mt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Показано {indexOfFirstUser + 1}-{Math.min(indexOfLastUser, filteredUsers.length)} из {filteredUsers.length} пользователей
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === 1
                      ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600'
                  }`}
                >
                  ←
                </button>
                
                {[...Array(totalPages)].map((_, index) => {
                  const pageNumber = index + 1;
                  const isCurrentPage = pageNumber === currentPage;
                  const isNearCurrent = Math.abs(pageNumber - currentPage) <= 1 || pageNumber === 1 || pageNumber === totalPages;
                  
                  if (!isNearCurrent && pageNumber !== 1 && pageNumber !== totalPages) {
                    if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                      return (
                        <span key={pageNumber} className="px-2 text-slate-400">
                          ...
                        </span>
                      );
                    }
                    return null;
                  }
                  
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => paginate(pageNumber)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isCurrentPage
                          ? 'bg-blue-500 text-white'
                          : 'bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === totalPages
                      ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600'
                  }`}
                >
                  →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Модальное окно профиля */}
        {isProfileModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-gray-200 dark:border-slate-700 rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col">
              <div className="relative h-32">
                {/* Баннер */}
                {selectedUserMedia.banner_url ? (
                  <img 
                    src={buildMediaUrl(selectedUserMedia.banner_url)}
                    alt="Profile Banner"
                    className="w-full h-full object-cover"
                  />
                ) : selectedUserMedia.banner_placeholder ? (
                  <div 
                    className="w-full h-full"
                    style={{ background: selectedUserMedia.banner_placeholder.background }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 dark:bg-slate-700" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                
                {/* Аватар */}
                <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
                  {selectedUserMedia.avatar_url ? (
                    <img 
                      src={buildMediaUrl(selectedUserMedia.avatar_url)}
                      alt="Profile Avatar"
                      className="w-32 h-32 rounded-2xl object-cover border-4 border-white dark:border-slate-800"
                    />
                  ) : selectedUserMedia.avatar_placeholder ? (
                    <div 
                      className="w-32 h-32 rounded-2xl border-4 border-white dark:border-slate-800 flex items-center justify-center text-white font-semibold"
                      style={{ 
                        background: selectedUserMedia.avatar_placeholder.background,
                        color: selectedUserMedia.avatar_placeholder.color,
                        fontSize: selectedUserMedia.avatar_placeholder.font_size,
                        fontWeight: selectedUserMedia.avatar_placeholder.font_weight
                      }}
                    >
                      {selectedUserMedia.avatar_placeholder.initials}
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-800 flex items-center justify-center">
                      <span className="text-4xl font-bold text-slate-600 dark:text-slate-300">
                        {selectedUser.fullname.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Кнопка закрытия */}
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Информация о пользователе */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar pt-20">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    {selectedUser.fullname}
                  </h3>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedUser.status)}`}>
                    {getStatusIcon(selectedUser.status)}
                    {selectedUser.status === 'active' ? 'Активен' : 'Заблокирован'}
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span className="font-medium">Имя:</span>
                    <span>{selectedUser.fullname || 'Не указано'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Код студента:</span>
                    <span>{selectedUser.student_code || 'Не указан'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Факультет:</span>
                    <span>{selectedUser.faculty || 'Не указан'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Статус:</span>
                    <span className={selectedUser.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                      {selectedUser.status === 'active' ? 'Активен' : 'Заблокирован'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Дата регистрации:</span>
                    <span>
                      {new Date(selectedUser.registration_date * 1000).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Последний вход:</span>
                    <span>
                      {selectedUser.last_login ? 
                        new Date(selectedUser.last_login * 1000).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Не входил'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">IP адрес:</span>
                    <span className="font-mono text-sm">
                      {selectedUser.ip_address || 'Не указан'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Модальное окно бана */}
      {isBanModalOpen && (
        <BanModal
          isOpen={isBanModalOpen}
          onClose={() => setIsBanModalOpen(false)}
          user={banData.user}
          onBan={executeBan}
          darkMode={darkMode}
        />
      )}
      
      {/* Модальное окно успешного бана */}
      {isBanSuccessModalOpen && (
        <BanSuccessModal
          isOpen={isBanSuccessModalOpen}
          onClose={() => setIsBanSuccessModalOpen(false)}
          user={banData.user}
          reason={banData.reason}
          duration={banData.duration}
          darkMode={darkMode}
        />
      )}

      {/* Модальное окно разбана */}
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

      {/* Модальное окно добавления пользователя */}
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
