import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Camera,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  RefreshCw,
  Save,
  Send,
  Settings2,
  Shield,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import { API_ENDPOINTS } from '../config/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { buildCsrfHeaders, ensureCsrfToken } from '../utils/http.js';
import { buildMediaUrl } from '../utils/media.js';
import { showError, showSuccess } from '../utils/notifications.js';
import TwoFARecoveryModal from './TwoFARecoveryModal.jsx';

const TABS = [
  { id: 'profile', label: 'Профиль', icon: User },
  { id: 'security', label: 'Безопасность', icon: Shield },
  { id: 'notifications', label: 'Уведомления', icon: Bell },
  { id: 'privacy', label: 'Приватность', icon: Eye },
  { id: 'advanced', label: 'Дополнительно', icon: Settings2 },
];

function ProfileSettings({ darkMode, onBack, user, userMedia, onProfileUpdate, onForceRefresh, onLogout }) {
  const { isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [telegramBinding, setTelegramBinding] = useState(null);
  const [telegramLink, setTelegramLink] = useState(null);
  const [loadingTelegram, setLoadingTelegram] = useState(false);
  const [banInfo, setBanInfo] = useState(null);
  const [isTwoFARecoveryModalOpen, setIsTwoFARecoveryModalOpen] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const isTelegramLinked = Boolean(telegramBinding?.is_linked);

  const getTelegramDisplayName = () => {
    if (!telegramBinding) return null;

    if (telegramBinding.telegram_username) {
      return `@${telegramBinding.telegram_username}`;
    }

    const fullName = [telegramBinding.telegram_first_name, telegramBinding.telegram_last_name]
      .filter(Boolean)
      .join(' ')
      .trim();

    return fullName || 'Аккаунт Telegram привязан';
  };

  const formatTelegramLinkedAt = (value) => {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const refreshBanInfo = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.BAN_INFO, { credentials: 'include' });
      if (!response.ok) return setBanInfo(null);
      const data = await response.json();
      setBanInfo(data.success ? data.ban_info : null);
    } catch {
      setBanInfo(null);
    }
  };

  const refreshSessions = async () => {
    if (!user || !isAuthenticated) return;
    setLoadingSessions(true);
    try {
      const response = await fetch(API_ENDPOINTS.SESSIONS, { credentials: 'include' });
      if (!response.ok) return;
      const data = await response.json();
      if (data.success) setSessions(data.sessions || []);
    } finally {
      setLoadingSessions(false);
    }
  };

  const refreshTelegramBinding = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.TELEGRAM_BINDING_STATUS, { credentials: 'include' });
      if (!response.ok) {
        setTelegramBinding(null);
        return false;
      }
      const data = await response.json();
      if (data.success) {
        const bindingData = data.data || null;
        setTelegramBinding(bindingData);
        return Boolean(bindingData?.is_linked);
      }
      setTelegramBinding(null);
      return false;
    } catch {
      setTelegramBinding(null);
      return false;
    }
  };

  useEffect(() => {
    if (user && isAuthenticated) {
      refreshBanInfo();
      refreshSessions();
      refreshTelegramBinding();
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    if (!telegramLink || isTelegramLinked) return undefined;

    const pollBindingStatus = async () => {
      const linked = await refreshTelegramBinding();
      if (linked) {
        setTelegramLink(null);
        setErrors((current) => ({ ...current, telegram: null }));
      }
    };

    const intervalId = window.setInterval(pollBindingStatus, 3000);
    const handleFocus = () => {
      pollBindingStatus();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [telegramLink, isTelegramLinked]);

  const handleLogout = () => {
    if (onLogout) onLogout();
    else logout();
  };

  const uploadMedia = async (file, mediaType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('media_type', mediaType);
    const csrfToken = await ensureCsrfToken();
    const response = await fetch(API_ENDPOINTS.MEDIA_UPLOAD, {
      method: 'POST',
      headers: csrfToken ? { 'X-CSRFToken': csrfToken } : undefined,
      body: formData,
      credentials: 'include',
    });
    return response.json();
  };

  const fetchUpdatedProfile = async () => {
    const response = await fetch(API_ENDPOINTS.PROFILE_UPDATE, { credentials: 'include' });
    if (!response.ok) return;
    const data = await response.json();
    if (data.success && data.user) onProfileUpdate?.(data.user);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      if (!avatarFile && !bannerFile) {
        setErrors({ general: 'Выберите хотя бы один файл для загрузки' });
        return;
      }
      const payload = {};
      if (avatarFile) {
        const result = await uploadMedia(avatarFile, 'avatar');
        if (!result.success) throw new Error('avatar');
        payload.avatar_url = result.media?.url || result.media?.sizes?.medium || result.media?.sizes?.large || null;
      }
      if (bannerFile) {
        const result = await uploadMedia(bannerFile, 'banner');
        if (!result.success) throw new Error('banner');
        payload.banner_url = result.media?.url || result.media?.sizes?.large || result.media?.sizes?.medium || null;
      }
      const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' });
      const response = await fetch(API_ENDPOINTS.PROFILE_UPDATE, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.detail || 'save');
      onForceRefresh?.({
        avatar_url: payload.avatar_url,
        banner_url: payload.banner_url,
        avatar_placeholder: userMedia?.avatar_placeholder,
        banner_placeholder: userMedia?.banner_placeholder,
      });
      await fetchUpdatedProfile();
      setAvatarFile(null);
      setBannerFile(null);
      setAvatarPreview(null);
      setBannerPreview(null);
      showSuccess('Профиль успешно обновлён');
    } catch {
      setErrors({ general: 'Не удалось сохранить изменения профиля' });
      showError('Не удалось сохранить изменения профиля');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrors({});
    if (newPassword !== confirmPassword) {
      setErrors({ password: 'Пароли не совпадают' });
      setLoading(false);
      return;
    }
    try {
      const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' });
      const response = await fetch(API_ENDPOINTS.CHANGE_PASSWORD, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error();
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showSuccess('Пароль успешно изменён');
    } catch {
      setErrors({ password: 'Не удалось изменить пароль' });
      showError('Не удалось изменить пароль');
    } finally {
      setLoading(false);
    }
  };

  const generateTelegramLink = async () => {
    setLoadingTelegram(true);
    try {
      setErrors((current) => ({ ...current, telegram: null }));
      const popup = window.open('about:blank', '_blank');
      const headers = await buildCsrfHeaders();
      const response = await fetch(API_ENDPOINTS.TELEGRAM_GENERATE_LINK, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      const data = await response.json();
      if (!data.success || !data.data?.binding_link) throw new Error();
      setTelegramLink(data.data.binding_link);
      popup.location.href = data.data.binding_link;
    } catch {
      setErrors({ telegram: 'Не удалось создать ссылку привязки Telegram' });
    } finally {
      setLoadingTelegram(false);
    }
  };

  const deleteMedia = async (mediaType) => {
    const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' });
    const response = await fetch(API_ENDPOINTS.MEDIA_DELETE, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ media_type: mediaType }),
    });
    const data = await response.json();
    if (!data.success) throw new Error();
    onForceRefresh?.({
      avatar_url: mediaType === 'avatar' ? null : userMedia?.avatar_url,
      banner_url: mediaType === 'banner' ? null : userMedia?.banner_url,
      avatar_placeholder: userMedia?.avatar_placeholder,
      banner_placeholder: userMedia?.banner_placeholder,
    });
  };

  const confirmDelete = async () => {
    try {
      await deleteMedia(deleteModal);
      setDeleteModal(null);
      showSuccess(deleteModal === 'avatar' ? 'Аватар удалён' : 'Баннер удалён');
    } catch {
      setErrors({ general: 'Не удалось удалить файл' });
    }
  };

  const content = activeTab === 'profile' ? (
    <div className="space-y-6">
      {banInfo ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {banInfo.reason || 'Для аккаунта действуют ограничения, часть действий может быть недоступна.'}
        </div>
      ) : null}
      <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/60 sm:p-8">
        <div className="relative mb-16 h-36 rounded-2xl bg-slate-200 dark:bg-slate-800 sm:h-44">
          {(bannerPreview || userMedia?.banner_url) ? (
            <img src={bannerPreview || buildMediaUrl(userMedia.banner_url)} alt="Banner" className="h-full w-full rounded-2xl object-cover" />
          ) : null}
          {!banInfo ? (
            <label className="absolute right-3 top-3 flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl bg-white/90 text-slate-700 shadow-lg dark:bg-slate-800/90 dark:text-slate-300">
              <Upload className="h-5 w-5" />
              <input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBannerFile(file);
                const reader = new FileReader();
                reader.onload = (evt) => setBannerPreview(evt.target?.result || null);
                reader.readAsDataURL(file);
              }} className="hidden" />
            </label>
          ) : null}
          {userMedia?.banner_url && !banInfo ? (
            <button onClick={() => setDeleteModal('banner')} className="absolute right-16 top-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/90 text-white shadow-lg">
              <Trash2 className="h-5 w-5" />
            </button>
          ) : null}
          <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2">
            <div className="group relative h-24 w-24 overflow-hidden rounded-3xl border-4 border-white bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-800 sm:h-32 sm:w-32">
              {(avatarPreview || userMedia?.avatar_url) ? (
                <img src={avatarPreview || buildMediaUrl(userMedia.avatar_url)} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-200 dark:bg-slate-700">
                  <User className="h-10 w-10 text-slate-400" />
                </div>
              )}
              {!banInfo ? (
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                  <Camera className="h-7 w-7 text-white" />
                  <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setAvatarFile(file);
                    const reader = new FileReader();
                    reader.onload = (evt) => setAvatarPreview(evt.target?.result || null);
                    reader.readAsDataURL(file);
                  }} className="hidden" />
                </label>
              ) : null}
            </div>
            {userMedia?.avatar_url && !banInfo ? (
              <button onClick={() => setDeleteModal('avatar')} className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-red-500/90 text-white shadow-lg transition hover:scale-105 hover:bg-red-600" title="Удалить аватар">
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
        <div className="pt-4 text-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user?.fullname || 'Пользователь'}</h2>
          <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">ID: {user?.id || 'Неизвестно'}</p>
          {errors.general ? <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{errors.general}</div> : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button onClick={handleSubmit} disabled={loading || (!avatarFile && !bannerFile) || Boolean(banInfo)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-50">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Сохранить изменения
            </button>
            <button onClick={() => { setAvatarFile(null); setBannerFile(null); setAvatarPreview(null); setBannerPreview(null); }} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Сбросить выбор
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : activeTab === 'security' ? (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/60 sm:p-8">
        <div className="mb-0 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Пароль и защита</h2>
          <button onClick={() => setShowPasswordForm((v) => !v)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {showPasswordForm ? 'Скрыть' : 'Сменить пароль'}
          </button>
        </div>
        {showPasswordForm ? (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {[
              ['current', 'Текущий пароль', currentPassword, setCurrentPassword],
              ['new', 'Новый пароль', newPassword, setNewPassword],
              ['confirm', 'Подтвердите пароль', confirmPassword, setConfirmPassword],
            ].map(([key, label, value, setter]) => (
              <div key={key}>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
                <div className="relative">
                  <input type={showPasswords[key] ? 'text' : 'password'} value={value} onChange={(e) => setter(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  <button type="button" onClick={() => setShowPasswords((curr) => ({ ...curr, [key]: !curr[key] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                    {showPasswords[key] ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            ))}
            {errors.password ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{errors.password}</div> : null}
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-50">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
              Обновить пароль
            </button>
          </form>
        ) : null}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/60">
          <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">Двухфакторная аутентификация</h3>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">Усильте защиту аккаунта через дополнительное подтверждение входа.</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => setIsTwoFARecoveryModalOpen(true)} className="rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 font-semibold text-white">Открыть настройки 2FA</button>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/60">
          <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">Telegram</h3>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            {isTelegramLinked ? 'Telegram уже привязан к вашему профилю.' : 'Привяжите Telegram для уведомлений и восстановления доступа.'}
          </p>
          {errors.telegram ? <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{errors.telegram}</div> : null}
          {telegramLink && !isTelegramLinked ? (
            <div className="mb-4 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-700 dark:bg-sky-900/20 dark:text-sky-300">
              Ссылка для привязки создана. После подтверждения в Telegram этот блок обновится автоматически.
            </div>
          ) : null}
          {isTelegramLinked ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 dark:border-emerald-900/40 dark:bg-emerald-900/20">
              <div className="mt-1 text-base text-emerald-900 dark:text-emerald-100">{getTelegramDisplayName()}</div>
              {telegramBinding?.linked_at ? (
                <div className="mt-2 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                  Привязано: {formatTelegramLinkedAt(telegramBinding.linked_at)}
                </div>
              ) : null}
            </div>
          ) : (
            <button onClick={generateTelegramLink} disabled={loadingTelegram} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-600 px-5 py-3 font-semibold text-white disabled:opacity-50">
              {loadingTelegram ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              Привязать Telegram
            </button>
          )}
        </div>
      </div>
      <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/60">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Активные сессии</h3>
          <button onClick={refreshSessions} disabled={loadingSessions} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {loadingSessions ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Обновить
          </button>
        </div>
        {loadingSessions ? <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><Loader2 className="h-5 w-5 animate-spin" />Загрузка...</div> : (
          <div className="space-y-3">
            {sessions.length ? sessions.map((session, index) => (
              <div key={session.session_key || index} className="rounded-2xl border border-slate-200/60 bg-slate-50/80 px-4 py-3 text-sm dark:border-slate-700/60 dark:bg-slate-800/60">
                <div className="font-medium text-slate-900 dark:text-white">{session.device || 'Устройство'}</div>
                <div className="text-slate-600 dark:text-slate-400">{session.ip_address || 'IP не определён'}</div>
              </div>
            )) : <div className="text-sm text-slate-600 dark:text-slate-400">Сессии не найдены.</div>}
          </div>
        )}
      </div>
    </div>
  ) : activeTab === 'advanced' ? (
    <div className="rounded-3xl border border-red-200 bg-white/80 p-6 shadow-lg backdrop-blur-xl dark:border-red-900/40 dark:bg-slate-900/60 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Выйти из аккаунта</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Завершить текущую пользовательскую сессию.</p>
        </div>
        <button onClick={handleLogout} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-medium text-white">
          Выйти
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  ) : (
    <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/60 sm:p-8">
      <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">{activeTab === 'notifications' ? 'Уведомления' : 'Приватность'}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">Этот раздел переведён в более компактный вид. Базовая структура уже выровнена, дальше его можно безопасно наращивать без старых дубликатов и битой разметки.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/70">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
          <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/60 bg-white/80 text-slate-700 dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-300">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Настройки профиля</h1>
            <p className="hidden text-sm text-slate-500 dark:text-slate-400 sm:block">Управление аккаунтом и персонализация</p>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 xl:flex-row xl:gap-8">
        <aside className="xl:w-80">
          <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-3 shadow-lg backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/60">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Разделы настроек</h2>
            <nav className="flex gap-2 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible xl:pb-0">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-shrink-0 items-center gap-3 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-medium ${active ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60'}`}>
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>
        <main className="flex-1">{content}</main>
      </div>
      {deleteModal ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl dark:bg-slate-900">
            <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">Удалить {deleteModal === 'avatar' ? 'аватар' : 'баннер'}?</h3>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">Это действие нельзя отменить.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteModal(null)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400">Отмена</button>
              <button onClick={confirmDelete} className="rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-medium text-white">Удалить</button>
            </div>
          </div>
        </div>
      ) : null}
      <TwoFARecoveryModal isOpen={isTwoFARecoveryModalOpen} onClose={() => setIsTwoFARecoveryModalOpen(false)} darkMode={darkMode} />
    </div>
  );
}

export default ProfileSettings;
