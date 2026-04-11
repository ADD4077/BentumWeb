import React, { useState, useEffect, useRef } from 'react';
import { API_ENDPOINTS } from '../config/api.js';
import { buildMediaUrl } from '../utils/media.js';
import { showSuccess, showError } from '../utils/notifications.js';
import { 
  User, 
  Settings, 
  Settings2,
  Camera, 
  Upload, 
  Lock, 
  Eye, 
  EyeOff,
  Shield,
  AlertTriangle,
  CheckCircle,
  X,
  Image,
  Loader2,
  HelpCircle,
  Calendar,
  Clock,
  UserCheck,
  Bell,
  ArrowLeft,
  Save,
  Send,
  Link,
  Smartphone,
  ChevronRight,
  Globe,
  Mail,
  Download,
  Trash2,
  LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import TwoFARecoveryModal from './TwoFARecoveryModal.jsx';

const ProfileSettings = ({ darkMode, onBack, user, userMedia, onProfileUpdate, onForceRefresh, on2FASetupOpen }) => {
  const { isAuthenticated, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isTwoFARecoveryModalOpen, setIsTwoFARecoveryModalOpen] = useState(false);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [deletingBanner, setDeletingBanner] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null });

  // Дополнительные состояния для расширенных настроек
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  // Настройки уведомлений
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    news: true,
    updates: false,
    security: true
  });

  // Настройки приватности
  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    showEmail: false,
    showStudentCode: false,
    allowMessages: true
  });

  // Активные сессии
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Состояние привязки Telegram
  const [telegramBinding, setTelegramBinding] = useState(null);
  const [telegramLink, setTelegramLink] = useState(null);
  const [loadingTelegram, setLoadingTelegram] = useState(false);

  // Получаем информацию о бане пользователя
  const [banInfo, setBanInfo] = useState(null);
  const [loadingBanInfo, setLoadingBanInfo] = useState(true);

  // Состояние для обновленных медиа данных
  const [updatedMediaData, setUpdatedMediaData] = useState(null);

  useEffect(() => {
    const fetchBanInfo = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.BAN_INFO, {
          method: 'GET',
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setBanInfo(data.ban_info);
          } else {
            setBanInfo(null);
          }
        } else if (response.status === 404) {
          setBanInfo(null);
        } else if (response.status === 401) {
          console.log('User not authorized for ban info check');
          setBanInfo(null);
        } else {
          console.log('Error checking ban info:', response.status);
          setBanInfo(null);
        }
      } catch (err) {
        setBanInfo(null);
      } finally {
        setLoadingBanInfo(false);
      }
    };

    if (user && isAuthenticated) {
      fetchBanInfo();
    }
  }, [user, isAuthenticated]);

  // Загрузка активных сессий
  useEffect(() => {
    const fetchSessions = async () => {
      if (!user || !isAuthenticated) return;
      
      setLoadingSessions(true);
      try {
        const response = await fetch(API_ENDPOINTS.SESSIONS, {
          method: 'GET',
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setSessions(data.sessions || []);
          }
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
      } finally {
        setLoadingSessions(false);
      }
    };

    fetchSessions();
  }, [user, isAuthenticated]);

  // Функция для обновления сессий
  const refreshSessions = async () => {
    if (!user || !isAuthenticated) return;
    
    setLoadingSessions(true);
    try {
      const response = await fetch(API_ENDPOINTS.SESSIONS, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSessions(data.sessions || []);
        }
      }
    } catch (error) {
      console.error('Error refreshing sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (updatedMediaData) {
      onForceRefresh?.(updatedMediaData);
      setUpdatedMediaData(null);
    }
  }, [updatedMediaData, onForceRefresh]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      if (!avatarFile && !bannerFile) {
        setErrors({ general: 'Выберите хотя бы один файл для загрузки' });
        showError('⚠️ Выберите хотя бы один файл для загрузки');
        setLoading(false);
        return;
      }
      
      const updatedData = {};
      
      if (avatarFile) {
        const avatarResult = await uploadMedia(avatarFile, 'avatar');
        if (avatarResult.success) {
          updatedData.avatar_url = avatarResult.url;
        } else {
          setErrors({ general: 'Ошибка загрузки аватара' });
          showError('❌ Не удалось загрузить аватар');
          setLoading(false);
          return;
        }
      }
      
      if (bannerFile) {
        const bannerResult = await uploadMedia(bannerFile, 'banner');
        if (bannerResult.success) {
          updatedData.banner_url = bannerResult.url;
        } else {
          setErrors({ general: 'Ошибка загрузки баннера' });
          showError('❌ Не удалось загрузить баннер');
          setLoading(false);
          return;
        }
      }

      const response = await fetch(API_ENDPOINTS.PROFILE_UPDATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedData),
      });

      const result = await response.json();

      if (result.success) {
        setUpdatedMediaData({
          avatar_url: updatedData.avatar_url,
          banner_url: updatedData.banner_url,
          avatar_placeholder: userMedia?.avatar_placeholder,
          banner_placeholder: userMedia?.banner_placeholder
        });
        
        // Показываем уведомление об успехе
        showSuccess('✅ Настройки профиля успешно применены!');
        
        try {
          const profileResponse = await fetch(API_ENDPOINTS.PROFILE_UPDATE, {
            method: 'GET',
            credentials: 'include',
          });
          
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            if (profileData.success && profileData.user) {
              onProfileUpdate?.(profileData.user);
              setTimeout(() => {
                setAvatarPreview(null);
                setBannerPreview(null);
                setAvatarFile(null);
                setBannerFile(null);
              }, 1000);
            }
          }
        } catch (error) {
          console.log('Error fetching updated profile:', error);
        }
      } else {
        setErrors({ general: result.detail || 'Ошибка сохранения профиля' });
        showError('❌ Не удалось применить настройки профиля');
      }
    } catch (error) {
      setErrors({ general: 'Ошибка при сохранении профиля' });
      showError('❌ Произошла ошибка при сохранении профиля');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setSuccessMessage('');

    if (newPassword !== confirmPassword) {
      setErrors({ password: 'Пароли не совпадают' });
      showError('❌ Пароли не совпадают');
      setLoading(false);
      return;
    }

    if (newPassword.length < 7) {
      setErrors({ password: 'Пароль должен содержать минимум 7 символов' });
      showError('❌ Пароль должен содержать минимум 7 символов');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.CHANGE_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setShowPasswordForm(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSuccessMessage('Пароль успешно изменен');
        // Показываем уведомление об успехе
        showSuccess('✅ Пароль успешно изменен!');
        // Скрыть сообщение об успехе через 3 секунды
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        setErrors({ password: data.detail || 'Ошибка смены пароля' });
        showError('❌ Не удалось изменить пароль');
      }
    } catch (error) {
      setErrors({ password: 'Ошибка сети при смене пароля' });
      showError('❌ Произошла ошибка сети при смене пароля');
    } finally {
      setLoading(false);
    }
  };

  const uploadMedia = async (file, mediaType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('media_type', mediaType);

    try {
      const response = await fetch(API_ENDPOINTS.MEDIA_UPLOAD, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, detail: 'Ошибка сети при загрузке файла' };
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setAvatarPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBannerFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setBannerPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    logout();
  };

  // Функции для работы с Telegram
  const fetchTelegramBinding = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.TELEGRAM_BINDING_STATUS, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTelegramBinding(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching Telegram binding status:', error);
    }
  };

  const generateTelegramLink = async () => {
    setLoadingTelegram(true);
    const popup = window.open('about:blank', '_blank');
    if (!popup) {
      setErrors({ telegram: 'Браузер заблокировал всплывающее окно. Разреши popups для этого сайта и попробуй снова.' });
      setLoadingTelegram(false);
      return;
    }
    popup.document.title = 'Подготовка привязки Telegram...';
    popup.document.body.innerHTML = '<p>Подготавливаем ссылку для привязки Telegram...</p>';
    try {
      const response = await fetch(API_ENDPOINTS.TELEGRAM_GENERATE_LINK, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();
      
      if (data.success) {
        const link = data.data?.binding_link;
        if (!link) {
          popup.close();
          setErrors({ telegram: 'Некорректный ответ сервера: нет ссылки привязки' });
          return;
        }

        setTelegramLink(link);
        // Копируем ссылку в буфер обмена
        navigator.clipboard.writeText(link);
        popup.location.href = link;
      } else {
        popup.close();
        setErrors({ telegram: data.detail });
      }
    } catch (error) {
      popup.close();
      setErrors({ telegram: 'Ошибка при генерации ссылки' });
    } finally {
      setLoadingTelegram(false);
    }
  };

  useEffect(() => {
    fetchTelegramBinding();
  }, []);

  const handleDeleteAvatar = () => {
    setDeleteModal({ isOpen: true, type: 'avatar' });
  };

  const handleDeleteBanner = () => {
    setDeleteModal({ isOpen: true, type: 'banner' });
  };

  const performDeleteAvatar = async () => {
    setDeletingAvatar(true);
    try {
      const response = await fetch(API_ENDPOINTS.MEDIA_DELETE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ media_type: 'avatar' }),
      });

      const result = await response.json();

      if (result.success) {
        setUpdatedMediaData({
          avatar_url: null,
          banner_url: userMedia?.banner_url,
          avatar_placeholder: userMedia?.avatar_placeholder,
          banner_placeholder: userMedia?.banner_placeholder
        });
        setAvatarPreview(null);
        setAvatarFile(null);
      } else {
        setErrors({ general: result.detail || 'Ошибка удаления аватара' });
      }
    } catch (error) {
      setErrors({ general: 'Ошибка при удалении аватара' });
    } finally {
      setDeletingAvatar(false);
    }
  };

  const performDeleteBanner = async () => {
    setDeletingBanner(true);
    try {
      const response = await fetch(API_ENDPOINTS.MEDIA_DELETE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ media_type: 'banner' }),
      });

      const result = await response.json();

      if (result.success) {
        setUpdatedMediaData({
          avatar_url: userMedia?.avatar_url,
          banner_url: null,
          avatar_placeholder: userMedia?.avatar_placeholder,
          banner_placeholder: userMedia?.banner_placeholder
        });
        setBannerPreview(null);
        setBannerFile(null);
      } else {
        setErrors({ general: result.detail || 'Ошибка удаления баннера' });
      }
    } catch (error) {
      setErrors({ general: 'Ошибка при удалении баннера' });
    } finally {
      setDeletingBanner(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Профиль', icon: User },
    { id: 'security', label: 'Безопасность', icon: Shield },
    { id: 'notifications', label: 'Уведомления', icon: Bell },
    { id: 'privacy', label: 'Приватность', icon: Eye },
    { id: 'advanced', label: 'Дополнительно', icon: Settings2 },
  ];

  // Функция форматирования даты и времени
  const formatDateTime = (dateString) => {
    if (!dateString) return 'Неизвестно';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) {
        return 'Только что';
      } else if (diffMins < 60) {
        return `${diffMins} мин. назад`;
      } else if (diffHours < 24) {
        return `${diffHours} ч. назад`;
      } else if (diffDays < 7) {
        return `${diffDays} д. назад`;
      } else {
        return date.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'short',
          year: date.getFullYear() !== now.getFullYear() ? undefined : undefined
        });
      }
    } catch (error) {
      return 'Некорректная дата';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-900/70 border-b border-slate-200/60 dark:border-slate-800/60 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={onBack}
                className="group relative w-10 h-10 rounded-2xl flex items-center justify-center bg-white/80 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-200/30 dark:hover:shadow-black/20 hover:scale-[1.02] transition-all duration-300"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform duration-300" />
              </button>
              <div className="flex flex-col gap-0.5">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">Настройки профиля</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Управление аккаунтом и персонализация</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col xl:flex-row gap-6 sm:gap-8">
          {/* Sidebar */}
          <div className="xl:w-80">
            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-3 shadow-lg">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Разделы настроек</h2>
              </div>
              <nav className="flex flex-row xl:flex-col gap-2 overflow-x-auto xl:overflow-x-visible pb-2 xl:pb-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group relative flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 dark:shadow-emerald-900/40 transform scale-[1.02]'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:scale-[1.01]'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg transition-all duration-300 ${
                      activeTab === tab.id 
                        ? 'bg-white/20' 
                        : 'bg-slate-100/50 dark:bg-slate-700/50 group-hover:bg-slate-200/70 dark:group-hover:bg-slate-700/70'
                    }`}>
                      <Icon className={`w-4 h-4 transition-colors duration-300 ${
                        activeTab === tab.id ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                      }`} />
                    </div>
                    <span className="text-sm font-medium">{tab.label}</span>
                    {activeTab === tab.id && (
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                    )}
                  </button>
                );
              })}
              </nav>
            </div>
            
            {/* Quick Stats */}
            <div className="mt-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 backdrop-blur-xl border border-emerald-200/60 dark:border-emerald-800/60 rounded-3xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Статистика профиля</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Заполненность профиля</span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">85%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-1.5 rounded-full" style={{width: '85%'}}></div>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Последнее обновление</span>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Сегодня</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 sm:p-8 shadow-lg">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Информация профиля</h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Управление внешним видом и данными</p>
                    </div>
                  </div>
                  
                  {/* Profile Preview */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-3xl p-6 mb-6 border border-slate-200/60 dark:border-slate-700/60">
                    {/* Banner Container */}
                    <div className="relative h-40 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-2xl mb-20">
                      {/* Banner */}
                      <div className="absolute inset-0 rounded-2xl overflow-hidden">
                        {bannerPreview ? (
                          <img 
                            src={bannerPreview} 
                            alt="Banner" 
                            className="w-full h-full object-cover"
                          />
                        ) : userMedia?.banner_url ? (
                          <img 
                            src={buildMediaUrl(userMedia.banner_url)}
                            alt="Banner" 
                            className="w-full h-full object-cover"
                          />
                        ) : userMedia?.banner_placeholder ? (
                          <div 
                            className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800" />
                        )}
                      </div>
                      
                      {/* Banner upload button */}
                      {!banInfo && (
                        <label className="absolute top-4 right-4 w-12 h-12 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:scale-105 transition-all cursor-pointer shadow-lg">
                          <Upload className="w-6 h-6" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleBannerChange}
                            className="hidden"
                          />
                        </label>
                      )}

                      {/* Delete banner button */}
                      {!banInfo && userMedia?.banner_url && (
                        <button
                          onClick={handleDeleteBanner}
                          disabled={deletingBanner}
                          className="absolute top-4 right-20 w-12 h-12 bg-red-500/90 dark:bg-red-600/90 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white hover:bg-red-600 dark:hover:bg-red-700 hover:scale-105 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                          title="Удалить баннер"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}

                      {/* Avatar */}
                      <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 z-20">
                        <div className="relative group">
                          <div className="w-32 h-32 rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-800 shadow-2xl">
                            {avatarPreview ? (
                              <img 
                                src={avatarPreview} 
                                alt="Avatar" 
                                className="w-full h-full object-cover"
                              />
                            ) : userMedia?.avatar_url ? (
                              <img 
                                src={buildMediaUrl(userMedia.avatar_url)}
                                alt="Avatar" 
                                className="w-full h-full object-cover"
                              />
                            ) : userMedia?.avatar_placeholder ? (
                              <div 
                                className="w-full h-full flex items-center justify-center text-white font-semibold bg-gradient-to-br from-slate-400 to-slate-600 dark:from-slate-600 dark:to-slate-800"
                                style={{ 
                                  color: 'rgb(156 163 175)',
                                  fontSize: userMedia.avatar_placeholder.font_size,
                                  fontWeight: userMedia.avatar_placeholder.font_weight
                                }}
                              >
                                {userMedia.avatar_placeholder.initials}
                              </div>
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-400 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                                <User className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                              </div>
                            )}
                          </div>
                          
                          {/* Avatar upload button */}
                          {!banInfo && (
                            <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-3xl cursor-pointer">
                              <div className="bg-white/90 dark:bg-slate-800/90 p-3 rounded-2xl">
                                <Camera className="w-8 h-8 text-slate-700 dark:text-slate-300" />
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                              />
                            </label>
                          )}
                          
                          {/* Delete avatar button */}
                          {!banInfo && userMedia?.avatar_url && (
                            <button
                              onClick={handleDeleteAvatar}
                              disabled={deletingAvatar}
                              className="absolute top-2 right-2 w-8 h-8 bg-red-500/90 dark:bg-red-600/90 backdrop-blur-sm rounded-xl flex items-center justify-center text-white hover:bg-red-600 dark:hover:bg-red-700 hover:scale-105 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                              title="Удалить аватар"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center pt-4">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        {user?.fullname || 'Пользователь'}
                      </h3>
                      <p className="text-base text-slate-600 dark:text-slate-400 mb-6">
                        ID: {user?.id || 'Неизвестно'}
                      </p>
                      
                      {/* User Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="text-center p-4 bg-white/70 dark:bg-slate-800/70 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                          <div className="text-lg font-bold text-slate-900 dark:text-white">1</div>
                          <div className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">Курс</div>
                        </div>
                        <div className="text-center p-4 bg-white/70 dark:bg-slate-800/70 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                          <div className="text-lg font-bold text-slate-900 dark:text-white">
                            {user?.faculty || '---'}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">Факультет</div>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="text-center p-4 bg-white/70 dark:bg-slate-800/70 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                          <div className="text-lg font-bold text-slate-900 dark:text-white truncate">
                            {user?.student_code || '---'}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">Группа</div>
                        </div>
                        <div className="text-center p-4 bg-white/70 dark:bg-slate-800/70 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                          <div className="text-lg font-bold text-slate-900 dark:text-white truncate">
                            {user?.email || 'Не указана'}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">Почта</div>
                        </div>
                      </div>

                      {/* Registration Date */}
                      <div className="text-center p-4 bg-white/70 dark:bg-slate-800/70 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 mb-6">
                        <div className="text-lg font-bold text-slate-900 dark:text-white">
                          {user?.created_at ? new Date(user.created_at * 1000).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          }) : 'Не указана'}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">Дата регистрации</div>
                      </div>
                    </div>
                  </div>

                  {banInfo ? (
                    <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-red-500/20 dark:bg-red-600/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-red-800 dark:text-red-300 mb-2 text-lg">
                            Аккаунт заблокирован
                          </h3>
                          <p className="text-red-700 dark:text-red-400 text-sm mb-3">
                            {banInfo.reason}
                          </p>
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <span className="text-xs font-medium text-red-600 dark:text-red-400">
                              Срок: {banInfo.duration_text}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {errors.general && (
                        <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800 rounded-2xl">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-red-600 dark:text-red-400 text-sm font-medium">{errors.general}</p>
                          </div>
                        </div>
                      )}
                      
                      <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Upload Instructions */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-500/20 dark:bg-blue-600/20 rounded-2xl flex items-center justify-center">
                              <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                              Инструкция по загрузке
                            </h3>
                          </div>
                          <ul className="space-y-2 text-sm text-blue-600 dark:text-blue-400">
                            <li className="flex items-start gap-2">
                              <span className="text-blue-500 mt-0.5">•</span>
                              <span>Нажмите на аватар или баннер для загрузки нового изображения</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-blue-500 mt-0.5">•</span>
                              <span>Поддерживаемые форматы: JPEG, PNG, WebP</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-blue-500 mt-0.5">•</span>
                              <span>Максимальный размер файла: 10MB</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-blue-500 mt-0.5">•</span>
                              <span>Вы можете загрузить только аватар, только баннер или оба вместе</span>
                            </li>
                          </ul>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex gap-4">
                          <button
                            type="submit"
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transform hover:scale-[1.02] disabled:scale-100"
                            disabled={loading || (!avatarFile && !bannerFile)}
                          >
                            {loading ? (
                              <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Загрузка...</span>
                              </>
                            ) : (
                              <>
                                <Save className="w-5 h-5" />
                                <span>Сохранить изменения</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 sm:p-8 shadow-lg">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-orange-500 rounded-2xl flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Безопасность</h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Защита вашего аккаунта</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Password */}
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center">
                            <Lock className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Пароль</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Измените пароль для повышения безопасности</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowPasswordForm(!showPasswordForm)}
                          className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transform hover:scale-[1.02]"
                        >
                          {showPasswordForm ? 'Отмена' : 'Изменить'}
                        </button>
                      </div>

                      {showPasswordForm && (
                        <form onSubmit={handlePasswordChange} className="space-y-4 mt-6">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                              Текущий пароль
                            </label>
                            <div className="relative">
                              <input
                                type={showPasswords.current ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                              >
                                {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                              Новый пароль
                            </label>
                            <div className="relative">
                              <input
                                type={showPasswords.new ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                              >
                                {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                              Подтвердите пароль
                            </label>
                            <div className="relative">
                              <input
                                type={showPasswords.confirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                              >
                                {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>

                          {errors.password && (
                            <div className="p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800 rounded-xl">
                              <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-red-600 dark:text-red-400 text-sm font-medium">{errors.password}</p>
                              </div>
                            </div>
                          )}

                          {successMessage && (
                            <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                              <div className="flex items-start gap-3">
                                <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">{successMessage}</p>
                              </div>
                            </div>
                          )}

                          <button
                            type="submit"
                            className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                            disabled={loading}
                          >
                            {loading ? (
                              <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block mr-2" />
                                Сохранение...
                              </>
                            ) : (
                              'Сохранить пароль'
                            )}
                          </button>
                        </form>
                      )}
                    </div>

                    {/* Telegram Binding */}
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center">
                            <Send className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Привязка Telegram</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Связать аккаунт с Telegram ботом для уведомлений</p>
                          </div>
                        </div>
                        {!telegramBinding?.is_linked && (
                          <button
                            onClick={generateTelegramLink}
                            disabled={loadingTelegram}
                            className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center gap-2"
                          >
                            {loadingTelegram ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Генерация...
                              </>
                            ) : (
                              <>
                                <Link className="w-4 h-4" />
                                Привязать
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      
                      {telegramBinding?.is_linked ? (
                        <div className="mt-4 space-y-4">
                          <div className="flex items-center justify-between p-4 bg-white/70 dark:bg-slate-800/70 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center">
                                <span className="text-lg font-bold text-white">
                                  {telegramBinding.telegram_username ? telegramBinding.telegram_username[0].toUpperCase() : 'T'}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                  @{telegramBinding.telegram_username || telegramBinding.telegram_id}
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">
                                  Привязан {new Date(telegramBinding.linked_at).toLocaleDateString('ru-RU')}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Подключено</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {telegramLink ? (
                            <div className="space-y-3">
                              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Link className="w-4 h-4 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-1">
                                      Ссылка для привязки открыта в новой вкладке
                                    </p>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                      Перейдите в Telegram и нажмите /start для завершения привязки
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <p className="text-xs text-slate-600 dark:text-slate-400 break-all font-mono">
                                  {telegramLink}
                                </p>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                      
                      {errors.telegram && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                          <p className="text-red-600 dark:text-red-400 text-sm">{errors.telegram}</p>
                        </div>
                      )}
                    </div>

                    {/* 2FA */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center">
                            <Smartphone className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Двухфакторная аутентификация</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Дополнительный уровень безопасности</p>
                          </div>
                        </div>
                        <button 
                          onClick={on2FASetupOpen}
                          className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-[1.02] flex items-center gap-2"
                        >
                          <Lock className="w-4 h-4" />
                          Настроить
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Active Sessions */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center">
                            <Globe className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Активные сессии</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Управление активными входами в аккаунт</p>
                          </div>
                        </div>
                        <button 
                          onClick={refreshSessions}
                          disabled={loadingSessions}
                          className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-lg transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transform hover:scale-[1.02] flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                        >
                          <Loader2 className={`w-3 h-3 ${loadingSessions ? 'animate-spin' : ''}`} />
                          Обновить
                        </button>
                      </div>
                      <div className="mt-4 space-y-3">
                        {loadingSessions ? (
                          <div className="flex items-center justify-center p-8">
                            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                            <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">Загрузка сессий...</span>
                          </div>
                        ) : sessions.length === 0 ? (
                          <div className="text-center p-8">
                            <p className="text-sm text-slate-600 dark:text-slate-400">Нет активных сессий</p>
                          </div>
                        ) : (
                          sessions.map((session) => (
                            <div key={session.id} className={`flex items-center justify-between p-4 ${session.is_current ? 'bg-white/70 dark:bg-slate-800/70 border-2 border-emerald-200 dark:border-emerald-800' : 'bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60'} rounded-xl`}>
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 ${session.is_current ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gradient-to-br from-slate-400 to-slate-500'} rounded-xl flex items-center justify-center`}>
                                  <span className="text-sm font-bold text-white">
                                    {session.is_current ? 'Тек' : session.browser?.split(' ')[0]?.substring(0, 3) || 'Web'}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {session.is_current ? 'Это устройство' : `${session.browser} • ${session.os}`}
                                  </div>
                                  <div className="text-xs text-slate-600 dark:text-slate-400">
                                    {session.ip_address} • {formatDateTime(session.last_activity)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 ${session.is_current ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'} rounded-full`}></div>
                                <span className={`text-xs font-medium ${session.is_current ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                  {session.is_current ? 'Активно' : 'Неактивно'}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 sm:p-8 shadow-lg">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center">
                      <Bell className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Уведомления</h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Настройте способ оповещений</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center">
                            <Mail className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Email уведомления</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Получать уведомления на почту</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifications.email}
                            onChange={(e) => setNotifications({...notifications, email: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-emerald-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-6 border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center">
                            <Bell className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Push уведомления</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Уведомления в браузере</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifications.push}
                            onChange={(e) => setNotifications({...notifications, push: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-emerald-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center">
                            <span className="text-2xl">📰</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Новости и обновления</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Информация о новостях платформы</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifications.news}
                            onChange={(e) => setNotifications({...notifications, news: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-emerald-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-2xl p-6 border border-red-200 dark:border-red-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-orange-500 rounded-2xl flex items-center justify-center">
                            <Shield className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Безопасность</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Уведомления о безопасности аккаунта</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifications.security}
                            onChange={(e) => setNotifications({...notifications, security: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-emerald-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <button className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transform hover:scale-[1.02]">
                      Сохранить настройки уведомлений
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 sm:p-8 shadow-lg">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center">
                      <Eye className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Приватность</h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Управление видимостью профиля</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-indigo-200 dark:border-indigo-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center">
                            <Eye className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Видимость профиля</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Показывать профиль другим пользователям</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={privacy.profileVisible}
                            onChange={(e) => setPrivacy({...privacy, profileVisible: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-emerald-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center">
                            <Mail className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Показывать email</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Отображать email в профиле</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={privacy.showEmail}
                            onChange={(e) => setPrivacy({...privacy, showEmail: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-emerald-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center">
                            <span className="text-2xl">🎓</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Показывать код студента</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Отображать номер студенческого билета</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={privacy.showStudentCode}
                            onChange={(e) => setPrivacy({...privacy, showStudentCode: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-emerald-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-6 border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center">
                            <span className="text-2xl">💬</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Разрешить сообщения</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Другие пользователи могут отправлять сообщения</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={privacy.allowMessages}
                            onChange={(e) => setPrivacy({...privacy, allowMessages: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-emerald-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <button className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transform hover:scale-[1.02]">
                      Сохранить настройки приватности
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 sm:p-8 shadow-lg">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-slate-500 rounded-2xl flex items-center justify-center">
                      <Settings2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Дополнительно</h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Расширенные настройки аккаунта</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Logout */}
                    <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-2xl p-6 border border-red-200 dark:border-red-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-orange-500 rounded-2xl flex items-center justify-center">
                            <LogOut className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Выйти из аккаунта</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Завершить текущую сессию</p>
                          </div>
                        </div>
                        <button 
                          onClick={handleLogout}
                          className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl transition-all duration-300 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transform hover:scale-[1.02] flex items-center gap-2"
                        >
                          Выйти
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-8 border border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-red-400 to-red-600 rounded-2xl flex items-center justify-center">
                <Trash2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  Удалить {deleteModal.type === 'avatar' ? 'аватар' : 'баннер'}?
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Это действие нельзя будет отменить
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal({ isOpen: false, type: null })}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-300"
              >
                Отмена
              </button>
              <button
                onClick={confirmDelete}
                disabled={deletingAvatar || deletingBanner}
                className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl transition-all duration-300 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
              >
                {deletingAvatar || deletingBanner ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 2FA Recovery Modal */}
      <TwoFARecoveryModal 
        isOpen={isTwoFARecoveryModalOpen}
        onClose={() => setIsTwoFARecoveryModalOpen(false)}
        darkMode={darkMode}
      />
    </div>
  );
};

export default ProfileSettings;
