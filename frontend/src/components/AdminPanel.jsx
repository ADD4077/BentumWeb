import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Ban, 
  UserCheck, 
  Search, 
  Shield, 
  Mail, 
  Calendar, 
  Clock, 
  AlertTriangle,
  Eye,
  Filter,
  RefreshCw,
  Settings,
  BarChart3,
  UserX,
  UserPlus
} from 'lucide-react';

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [highlightedUserId, setHighlightedUserId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    bannedUsers: 0,
    activeUsers: 0,
    newUsersToday: 0
  });
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    loadUsers();
    loadStats();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setIsRefreshing(true);
    try {
      const mockUsers = [
        {
          id: 1,
          fullname: 'Иванов Иван Иванович',
          email: 'ivanov@example.com',
          student_code: '12345678',
          faculty: 'ФИТР',
          registration_date: '2024-01-15',
          last_login: '2024-03-09',
          status: 'active',
          avatar_url: null,
          ban_reason: null,
          ban_end_date: null
        },
        {
          id: 2,
          fullname: 'Петров Петр Петрович',
          email: 'petrov@example.com',
          student_code: '87654321',
          faculty: 'ФТК',
          registration_date: '2024-02-20',
          last_login: '2024-03-08',
          status: 'banned',
          avatar_url: null,
          ban_reason: 'Спам-активность',
          ban_end_date: '2024-03-16'
        },
        {
          id: 3,
          fullname: 'Сидорова Анна Михайловна',
          email: 'sidorova@example.com',
          student_code: '11223344',
          faculty: 'ЭФ',
          registration_date: '2024-03-01',
          last_login: '2024-03-09',
          status: 'active',
          avatar_url: null,
          ban_reason: null,
          ban_end_date: null
        },
        {
          id: 4,
          fullname: 'banned_user',
          email: 'banned@example.com',
          student_code: '99999999',
          faculty: 'Тестовый',
          registration_date: '2024-01-01',
          last_login: '2024-03-01',
          status: 'banned',
          avatar_url: null,
          ban_reason: 'Многократное нарушение правил сообщества',
          ban_end_date: '2024-03-16'
        }
      ];
      
      localStorage.setItem('admin_users', JSON.stringify(mockUsers));
      setUsers(mockUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadStats = () => {
    const mockStats = {
      totalUsers: 4,
      bannedUsers: 2,
      activeUsers: 2,
      newUsersToday: 1
    };
    setStats(mockStats);
  };

  const handleBanUser = (userId, reason, duration) => {
    const userToBan = users.find(u => u.id === userId);
    if (userToBan && (userToBan.email?.includes('admin') || userToBan.id === 1 || userToBan.fullname?.includes('Admin'))) {
      alert('❌ Нельзя забанить администратора!');
      return;
    }
    
    const confirmBan = confirm(
      `🚫 ЗАБЛОКИРОВАТЬ ПОЛЬЗОВАЛЯ?\n\n` +
      `👤 Имя: ${userToBan.fullname}\n` +
      `📧 Email: ${userToBan.email}\n` +
      `⚠️ Причина: ${reason}\n` +
      `📅 Срок: ${duration} дней\n\n` +
      `Подтвердить блокировку?`
    );
    
    if (!confirmBan) return;
    
    const updatedUsers = users.map(user => {
      if (user.id === userId) {
        const banEndDate = new Date();
        banEndDate.setDate(banEndDate.getDate() + (duration || 7));
        
        return {
          ...user,
          status: 'banned',
          ban_reason: reason,
          ban_end_date: banEndDate.toISOString().split('T')[0]
        };
      }
      return user;
    });
    
    setUsers(updatedUsers);
    localStorage.setItem('admin_users', JSON.stringify(updatedUsers));
    
    const bannedUser = updatedUsers.find(u => u.id === userId);
    if (bannedUser && bannedUser.email === 'banned@example.com') {
      localStorage.setItem('user', JSON.stringify({
        id: 'banned_user',
        fullname: bannedUser.fullname,
        student_code: bannedUser.student_code,
        faculty: bannedUser.faculty,
        banned: true,
        banReason: bannedUser.ban_reason,
        banEndDate: bannedUser.ban_end_date
      }));
      localStorage.setItem('banEndDate', bannedUser.ban_end_date);
    }
    
    loadStats();
    
    const user = updatedUsers.find(u => u.id === userId);
    alert(`✅ УСПЕШНО ЗАБЛОКИРОВАНО!\n\n👤 ${user.fullname}\n⚠️ Причина: ${reason}\n📅 До: ${user.ban_end_date}`);
    setHighlightedUserId(userId);
    setTimeout(() => setHighlightedUserId(null), 3000);
  };

  const handleUnbanUser = (userId) => {
    const userToUnban = users.find(u => u.id === userId);
    
    const confirmUnban = confirm(
      `✅ РАЗБЛОКИРОВАТЬ ПОЛЬЗОВАЛЯ?\n\n` +
      `👤 Имя: ${userToUnban.fullname}\n` +
      `📧 Email: ${userToUnban.email}\n` +
      `⚠️ Причина бана: ${userToUnban.ban_reason || 'Не указана'}\n` +
      `📅 Был забанен до: ${userToUnban.ban_end_date || 'Не указано'}\n\n` +
      `Подтвердить разблокировку?`
    );
    
    if (!confirmUnban) return;
    
    const updatedUsers = users.map(user => {
      if (user.id === userId) {
        return {
          ...user,
          status: 'active',
          ban_reason: null,
          ban_end_date: null
        };
      }
      return user;
    });
    
    setUsers(updatedUsers);
    localStorage.setItem('admin_users', JSON.stringify(updatedUsers));
    
    const unbannedUser = updatedUsers.find(u => u.id === userId);
    if (unbannedUser && unbannedUser.email === 'banned@example.com') {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('banEndDate');
    }
    
    loadStats();
    
    const user = updatedUsers.find(u => u.id === userId);
    alert(`✅ УСПЕШНО РАЗБЛОКИРОВАНО!\n\n👤 ${user.fullname}\n📧 ${user.email}\n✨ Теперь пользователь может снова использовать систему`);
    setHighlightedUserId(userId);
    setTimeout(() => setHighlightedUserId(null), 3000);
  };

  const handleViewProfile = (user) => {
    setSelectedUser(user);
    setIsProfileModalOpen(true);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullname.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.student_code.includes(searchQuery);
    
    const matchesFilter = filterStatus === 'all' || 
                          (filterStatus === 'active' && user.status === 'active') ||
                          (filterStatus === 'banned' && user.status === 'banned');
    
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.registration_date) - new Date(a.registration_date);
      case 'oldest':
        return new Date(a.registration_date) - new Date(b.registration_date);
      case 'name':
        return a.fullname.localeCompare(b.fullname);
      case 'email':
        return a.email.localeCompare(b.email);
      default:
        return 0;
    }
  });

  const getStatusColor = (status) => {
    return status === 'active' 
      ? 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20'
      : 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
  };

  const getStatusIcon = (status) => {
    return status === 'active' ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-900/20 dark:to-indigo-900/20 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                Админ-панель
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Управление пользователями и статистика
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadUsers}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Обновление...' : 'Обновить'}
              </button>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl">
                <Shield className="w-4 h-4" />
                Администратор
              </div>
            </div>
          </div>

          {/* Инструкция */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 dark:text-blue-400 text-sm">💡</span>
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Как пользоваться админкой:</h3>
                <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <p>👁️ <strong>Просмотр профиля:</strong> нажмите на глазок 👁️ чтобы увидеть детали пользователя</p>
                  <p>🚫 <strong>Бан пользователя:</strong> нажмите на красный крест 🚫 → введите причину и срок</p>
                  <p>✅ <strong>Разбан:</strong> нажмите на зеленую галочку ✅ чтобы разблокировать</p>
                  <p>🛡️ <strong>Администраторы:</strong> не могут быть забанены (защита щитом)</p>
                  <p>🔍 <strong>Поиск:</strong> используйте поиск по имени, email или номеру студбилета</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalUsers}</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Всего пользователей</h3>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{stats.activeUsers}</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Активные</h3>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
                <Ban className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{stats.bannedUsers}</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Заблокированы</h3>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{stats.newUsersToday}</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Новые сегодня</h3>
          </div>
        </div>

        {/* Фильтры и поиск */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Поиск по имени, email или номеру студбилета..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Все статусы</option>
                <option value="active">Активные</option>
                <option value="banned">Заблокированные</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">Новые первые</option>
                <option value="oldest">Старые первые</option>
                <option value="name">По имени</option>
                <option value="email">По email</option>
              </select>
            </div>
          </div>
        </div>

        {/* Таблица пользователей */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Пользователь
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Email
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
                  filteredUsers.map((user) => (
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
                          <div className="w-10 h-10 bg-gray-200 dark:bg-slate-600 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                              {user.fullname.charAt(0).toUpperCase()}
                            </span>
                          </div>
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
                          {user.email}
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
                          {new Date(user.last_login).toLocaleDateString('ru-RU')}
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
                              {(user.email?.includes('admin') || user.id === 1 || user.fullname?.includes('Admin')) ? (
                                <div className="p-2 text-gray-400 cursor-not-allowed rounded-lg" title="🛡️ Администратор не может быть забанен">
                                  <Shield className="w-4 h-4" />
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    const reason = prompt('🚫 Укажите причину блокировки:');
                                    if (reason) {
                                      const duration = prompt('📅 Укажите срок блокировки (дней):', '7');
                                      if (duration && !isNaN(duration)) {
                                        handleBanUser(user.id, reason, parseInt(duration));
                                      } else {
                                        alert('❌ Неверный срок блокировки!');
                                      }
                                    }
                                  }}
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
        </div>

        {/* Модальное окно профиля */}
        {isProfileModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Профиль пользователя
                  </h2>
                  <button
                    onClick={() => setIsProfileModalOpen(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center mb-6">
                  <div className="w-20 h-20 bg-gray-200 dark:bg-slate-600 rounded-full flex items-center justify-center mr-4">
                    <span className="text-2xl font-bold text-slate-600 dark:text-slate-300">
                      {selectedUser.fullname.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {selectedUser.fullname}
                    </h3>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedUser.status)} mt-2`}>
                      {getStatusIcon(selectedUser.status)}
                      {selectedUser.status === 'active' ? 'Активен' : 'Заблокирован'}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Контактная информация</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-900 dark:text-white">{selectedUser.email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Shield className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-900 dark:text-white">{selectedUser.student_code}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <BarChart3 className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-900 dark:text-white">{selectedUser.faculty}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Активность</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-900 dark:text-white">
                          Регистрация: {new Date(selectedUser.registration_date).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-900 dark:text-white">
                          Последний вход: {new Date(selectedUser.last_login).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {selectedUser.status === 'banned' && (
                  <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-red-800 dark:text-red-300 mb-1">Информация о блокировке</h4>
                        <p className="text-sm text-red-700 dark:text-red-400 mb-2">
                          Причина: {selectedUser.ban_reason}
                        </p>
                        {selectedUser.ban_end_date && (
                          <p className="text-sm text-red-700 dark:text-red-400">
                            Окончание: {new Date(selectedUser.ban_end_date).toLocaleDateString('ru-RU')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
