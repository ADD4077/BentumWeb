import React, { useEffect, useState } from 'react';
import { X, Save, Upload, Camera, User, AlertTriangle } from 'lucide-react';

import { API_ENDPOINTS } from '../config/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { buildCsrfHeaders, ensureCsrfToken } from '../utils/http.js';

const ProfileEditModal = ({
  isOpen,
  onClose,
  user,
  onSave,
  onForceRefresh,
}) => {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [banInfo, setBanInfo] = useState(null);
  const [loadingBanInfo, setLoadingBanInfo] = useState(true);

  useEffect(() => {
    const fetchBanInfo = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.BAN_INFO, {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setBanInfo(data.success ? data.ban_info : null);
          return;
        }

        if (response.status === 404 || response.status === 401) {
          setBanInfo(null);
          return;
        }

        setBanInfo(null);
      } catch {
        setBanInfo(null);
      } finally {
        setLoadingBanInfo(false);
      }
    };

    if (isOpen && user && isAuthenticated) {
      fetchBanInfo();
    } else {
      setBanInfo(null);
      setLoadingBanInfo(false);
    }
  }, [isAuthenticated, isOpen, user]);

  const uploadMedia = async (file, mediaType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('media_type', mediaType);

    try {
      const csrfToken = await ensureCsrfToken();
      const response = await fetch(API_ENDPOINTS.MEDIA_UPLOAD, {
        method: 'POST',
        headers: csrfToken ? { 'X-CSRFToken': csrfToken } : undefined,
        body: formData,
        credentials: 'include',
      });

      return await response.json();
    } catch {
      return { success: false, detail: 'Ошибка сети при загрузке файла' };
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
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
        if (!avatarResult.success) {
          setErrors({ general: 'Ошибка загрузки аватара' });
          setLoading(false);
          return;
        }

        updatedData.avatar_url =
          avatarResult.media?.url
          || avatarResult.media?.sizes?.medium
          || avatarResult.media?.sizes?.large
          || null;
      }

      if (bannerFile) {
        const bannerResult = await uploadMedia(bannerFile, 'banner');
        if (!bannerResult.success) {
          setErrors({ general: 'Ошибка загрузки баннера' });
          setLoading(false);
          return;
        }

        updatedData.banner_url =
          bannerResult.media?.url
          || bannerResult.media?.sizes?.large
          || bannerResult.media?.sizes?.medium
          || null;
      }

      const headers = await buildCsrfHeaders({
        'Content-Type': 'application/json',
      });
      const response = await fetch(API_ENDPOINTS.PROFILE_UPDATE, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(updatedData),
      });

      const result = await response.json();
      if (!result.success) {
        setErrors({ general: result.detail || 'Ошибка сохранения профиля' });
        setLoading(false);
        return;
      }

      try {
        const profileResponse = await fetch(API_ENDPOINTS.PROFILE_UPDATE, {
          method: 'GET',
          credentials: 'include',
        });

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          if (profileData.success && profileData.user) {
            onSave?.(profileData.user);
            if (isAuthenticated) {
              onForceRefresh?.();
            }
            onClose();
            return;
          }
        }
      } catch {
        // Fallback ниже.
      }

      onSave?.(result.user);
      if (isAuthenticated) {
        onForceRefresh?.();
      }
      onClose();
    } catch {
      setErrors({ general: 'Ошибка при сохранении профиля' });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (loadEvent) => setAvatarPreview(loadEvent.target?.result);
    reader.readAsDataURL(file);
  };

  const handleBannerChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setBannerFile(file);
    const reader = new FileReader();
    reader.onload = (loadEvent) => setBannerPreview(loadEvent.target?.result);
    reader.readAsDataURL(file);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white/90 shadow-2xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/90">
        <div className="relative h-32 bg-gray-200 dark:bg-slate-700">
          <div className="absolute inset-0">
            {bannerPreview ? (
              <img
                src={bannerPreview}
                alt="Banner preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gray-200 dark:bg-slate-700" />
            )}
          </div>

          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 transform">
            <div className="group relative">
              <div className="h-32 w-32 overflow-hidden rounded-2xl border-4 border-white bg-white dark:border-slate-800 dark:bg-slate-800">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-200 dark:bg-slate-700">
                    <User className="h-12 w-12 text-gray-400 dark:text-slate-500" />
                  </div>
                )}
              </div>

              {!banInfo && (
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-2xl bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-8 w-8 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {!banInfo && (
            <label className="absolute right-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-all hover:bg-white/30">
              <Upload className="h-5 w-5" />
              <input
                type="file"
                accept="image/*"
                onChange={handleBannerChange}
                className="hidden"
              />
            </label>
          )}

          <button
            onClick={onClose}
            className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-all hover:bg-white/30"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto p-6 pt-20">
          {loadingBanInfo ? (
            <div className="py-8 text-center text-sm text-gray-500 dark:text-slate-400">
              Загружаем информацию о профиле...
            </div>
          ) : banInfo ? (
            <div>
              <h2 className="mb-6 text-center text-2xl font-bold text-slate-900 dark:text-white">
                Информация о профиле
              </h2>

              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                  <div className="text-left">
                    <h3 className="mb-2 font-semibold text-red-800 dark:text-red-300">
                      Аккаунт заблокирован
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-400">
                      {banInfo.reason}
                    </p>
                    <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                      Срок: {banInfo.duration_text}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-700/20">
                <h3 className="mb-4 font-semibold text-gray-800 dark:text-gray-300">
                  Данные профиля
                </h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between gap-4">
                    <span className="font-medium">Имя</span>
                    <span>{user?.fullname || 'Не указано'}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="font-medium">Код студента</span>
                    <span>{user?.student_code || 'Не указан'}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="font-medium">Факультет</span>
                    <span>{user?.faculty || 'Не указан'}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="font-medium">Статус</span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      Заблокирован
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="mb-6 text-center text-2xl font-bold text-slate-900 dark:text-white">
                Настройка внешнего вида
              </h2>

              {errors.general && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.general}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                  <h3 className="mb-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
                    Инструкция по загрузке
                  </h3>
                  <ul className="space-y-1 text-sm text-blue-600 dark:text-blue-400">
                    <li>• Нажмите на аватар или баннер для загрузки нового изображения</li>
                    <li>• Поддерживаемые форматы: JPEG, PNG, WebP</li>
                    <li>• Максимальный размер файла: 10MB</li>
                    <li>• Вы можете загрузить только аватар, только баннер или оба вместе</li>
                  </ul>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 rounded-xl bg-gray-200 px-6 py-3 font-medium text-gray-700 transition-all hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Загрузка...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        Сохранить
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileEditModal;
