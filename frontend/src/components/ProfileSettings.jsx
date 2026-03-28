import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api.js';
import { Save, Upload, Camera, User, AlertTriangle, ArrowLeft, Shield, Bell, Palette, HelpCircle, LogOut, Settings2, Key, Smartphone, Mail, Globe, Trash2, Download, Eye, EyeOff, Edit3, Lock, UserCheck, CreditCard, MapPin, Calendar, BookOpen, Award, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { buildMediaUrl } from '../utils/media.js';

const ProfileSettings = ({ darkMode, onBack, user, userMedia, onProfileUpdate, onForceRefresh }) => {
  const { isAuthenticated, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [avatarPreview, setAvatarPreview] = useState(null);
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
      }
    } catch (error) {
      setErrors({ general: 'Ошибка при сохранении профиля' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    if (newPassword !== confirmPassword) {
      setErrors({ password: 'Пароли не совпадают' });
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setErrors({ password: 'Пароль должен содержать минимум 8 символов' });
      setLoading(false);
      return;
    }

    try {
      setTimeout(() => {
        setLoading(false);
        setShowPasswordForm(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 1500);
    } catch (error) {
      setErrors({ password: 'Ошибка смены пароля' });
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
    onBack();
  };

  const handleDeleteAvatar = () => {
    setDeleteModal({ isOpen: true, type: 'avatar' });
  };

  const handleDeleteBanner = () => {
    setDeleteModal({ isOpen: true, type: 'banner' });
  };

  const confirmDelete = async () => {
    if (deleteModal.type === 'avatar') {
      await performDeleteAvatar();
    } else if (deleteModal.type === 'banner') {
      await performDeleteBanner();
    }
    setDeleteModal({ isOpen: false, type: null });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <div className="bg-white/70 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800/60 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={onBack}
                className="group relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-200/30 dark:hover:shadow-black/20 hover:scale-[1.02] transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-0.5 transition-transform duration-200" />
              </button>
              <div className="flex flex-col gap-0.5">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Настройки</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Профиль, безопасность и приватность</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-7">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Sidebar */}
          <div className="lg:w-72">
            <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-2 shadow-sm">
              <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-1 lg:pb-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                      activeTab === tab.id
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 dark:shadow-emerald-900/30'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span className="text-sm">{tab.label}</span>
                  </button>
                );
              })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-4 sm:mb-6">Информация профиля</h2>
                  
                  {/* Profile Preview */}
                  <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200/60 dark:border-slate-800/60 p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm">
                    {/* Banner Container */}
                    <div className="relative h-32 bg-gray-200 dark:bg-slate-700 rounded-2xl mb-16 sm:mb-20">
                      {/* Banner */}
                      <div className="absolute inset-0">
                        {bannerPreview ? (
                          <img 
                            src={bannerPreview} 
                            alt="Banner" 
                            className="w-full h-full object-cover rounded-2xl"
                          />
                        ) : userMedia?.banner_url ? (
                          <img 
                            src={buildMediaUrl(userMedia.banner_url)}
                            alt="Banner" 
                            className="w-full h-full object-cover rounded-2xl"
                          />
                        ) : userMedia?.banner_placeholder ? (
                          <div 
                            className="w-full h-full rounded-2xl bg-gray-200 dark:bg-slate-700"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 dark:bg-slate-700 rounded-2xl" />
                        )}
                      </div>
                      
                      {/* Banner upload button - только для незабаненных */}
                      {!banInfo && (
                        <label className="absolute top-2 sm:top-4 right-2 sm:right-4 w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all cursor-pointer">
                          <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleBannerChange}
                            className="hidden"
                          />
                        </label>
                      )}

                      {/* Delete banner button - только если есть баннер */}
                      {!banInfo && userMedia?.banner_url && (
                        <button
                          onClick={handleDeleteBanner}
                          disabled={deletingBanner}
                          className="absolute top-2 sm:top-4 right-14 sm:right-16 w-8 h-8 sm:w-10 sm:h-10 bg-red-500/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Удалить баннер"
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}

                      {/* Avatar - абсолютно позиционирован как в обычном профиле */}
                      <div className="absolute -bottom-12 sm:-bottom-16 left-1/2 transform -translate-x-1/2 z-10">
                        <div className="relative group">
                          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl sm:rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-800 shadow-lg">
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
                                className="w-full h-full flex items-center justify-center text-white font-semibold bg-gray-200 dark:bg-slate-700"
                                style={{ 
                                  color: 'rgb(156 163 175)', // gray-400
                                  fontSize: userMedia.avatar_placeholder.font_size,
                                  fontWeight: userMedia.avatar_placeholder.font_weight
                                }}
                              >
                                {userMedia.avatar_placeholder.initials}
                              </div>
                            ) : (
                              <div className="w-full h-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center">
                                <User className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 dark:text-slate-500" />
                              </div>
                            )}
                          </div>
                          
                          {/* Avatar upload button - только для незабаненных */}
                          {!banInfo && (
                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl sm:rounded-2xl cursor-pointer">
                              <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                              />
                            </label>
                          )}
                          
                          {/* Delete avatar button - только если есть аватар */}
                          {!banInfo && userMedia?.avatar_url && (
                            <button
                              onClick={handleDeleteAvatar}
                              disabled={deletingAvatar}
                              className="absolute top-1 sm:top-2 right-1 sm:right-2 w-6 h-6 sm:w-8 sm:h-8 bg-red-500/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Удалить аватар"
                            >
                              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        {user?.fullname || 'Пользователь'}
                      </h3>
                      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-6">
                        ID: {user?.id || 'Неизвестно'}
                      </p>
                      
                      {/* User Stats */}
                      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
                        <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                          <div className="text-lg font-semibold text-slate-900 dark:text-white">1</div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">Курс</div>
                        </div>
                        <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                          <div className="text-lg font-semibold text-slate-900 dark:text-white">ИПФ</div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">Факультет</div>
                        </div>
                        <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                          <div className="text-lg font-semibold text-slate-900 dark:text-white">
                            {user?.faculty?.slice(0, 3) || '---'}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">Группа</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {banInfo ? (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="text-left">
                          <h3 className="font-semibold text-red-800 dark:text-red-300 mb-2 text-sm sm:text-base">
                            Аккаунт заблокирован
                          </h3>
                          <p className="text-red-700 dark:text-red-400 text-xs sm:text-sm">
                            {banInfo.reason}
                          </p>
                          <div className="mt-2 text-red-600 dark:text-red-400 text-xs">
                            Срок: {banInfo.duration_text}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {errors.general && (
                        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                          <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm">{errors.general}</p>
                        </div>
                      )}
                      
                      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                        {/* Upload Instructions */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 sm:p-4">
                          <h3 className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
                            Инструкция по загрузке
                          </h3>
                          <ul className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 space-y-1">
                            <li>• Нажмите на аватар или баннер для загрузки нового изображения</li>
                            <li>• Поддерживаемые форматы: JPEG, PNG, WebP</li>
                            <li>• Максимальный размер файла: 10MB</li>
                            <li>• Вы можете загрузить только аватар, только баннер или оба вместе</li>
                          </ul>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex gap-3">
                          <button
                            type="submit"
                            className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg sm:rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                            disabled={loading || (!avatarFile && !bannerFile)}
                          >
                            {loading ? (
                              <>
                                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Загрузка...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                                Сохранить изменения
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
              <div className="space-y-4">
                {/* Password */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                        <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Пароль</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Измените пароль для повышения безопасности</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowPasswordForm(!showPasswordForm)}
                      className="px-3 py-1.5 text-sm bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                    >
                      {showPasswordForm ? 'Отмена' : 'Изменить'}
                    </button>
                  </div>

                  {showPasswordForm && (
                    <form onSubmit={handlePasswordChange} className="space-y-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Текущий пароль
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.current ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          >
                            {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Новый пароль
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.new ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          >
                            {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Подтвердите пароль
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.confirm ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          >
                            {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {errors.password && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <p className="text-red-600 dark:text-red-400 text-sm">{errors.password}</p>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                      >
                        {loading ? 'Сохранение...' : 'Сохранить пароль'}
                      </button>
                    </form>
                  )}
                </div>

                {/* 2FA */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Двухфакторная аутентификация</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Дополнительный уровень безопасности</p>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1">
                      Настроить
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Active Sessions */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">Активные сессии</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Управление активными входами в аккаунт</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Тек</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">Это устройство</div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">Chrome • Windows</div>
                        </div>
                      </div>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">Активно</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-white">Email уведомления</h3>
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                          <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-white">Push уведомления</h3>
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                          <span className="text-lg">📰</span>
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-white">Новости и обновления</h3>
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                          <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-white">Безопасность</h3>
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <button className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors">
                      Сохранить настройки уведомлений
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                          <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-white">Видимость профиля</h3>
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-white">Показывать email</h3>
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                          <span className="text-lg">🎓</span>
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-white">Показывать код студента</h3>
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                          <span className="text-lg">💬</span>
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-white">Разрешить сообщения</h3>
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <button className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors">
                      Сохранить настройки приватности
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="space-y-4">
                {/* Data Export */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Экспорт данных</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Скачать все ваши данные</p>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1">
                      Экспортировать
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Logout */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                        <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Выйти из аккаунта</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Завершить текущую сессию</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-1"
                    >
                      Выйти
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Удалить {deleteModal.type === 'avatar' ? 'аватар' : 'баннер'}?
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Это действие нельзя будет отменить
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal({ isOpen: false, type: null })}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={confirmDelete}
                disabled={deletingAvatar || deletingBanner}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingAvatar || deletingBanner ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSettings;
