import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Eye, LogOut, Shield, User } from 'lucide-react';

import { API_ENDPOINTS } from '../config/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { buildCsrfHeaders, ensureCsrfToken } from '../utils/http.js';
import { showError, showSuccess } from '../utils/notifications.js';
import TwoFARecoveryModal from './TwoFARecoveryModal.jsx';
import DeleteMediaModal from './profile-settings/DeleteMediaModal.jsx';
import PreferenceSettingsSection from './profile-settings/PreferenceSettingsSection.jsx';
import ProfileOverviewSection from './profile-settings/ProfileOverviewSection.jsx';
import ProfileSettingsShell from './profile-settings/ProfileSettingsShell.jsx';
import SecuritySettingsSection from './profile-settings/SecuritySettingsSection.jsx';

function ProfileSettings({ darkMode, onBack, user, userMedia, onProfileUpdate, onForceRefresh, onLogout }) {
  const { isAuthenticated, logout, checkAuth } = useAuth();
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
  const [notificationSettings, setNotificationSettings] = useState({
    importantUpdates: true,
    newsDigest: true,
    sessionAlerts: Boolean(user?.notify_successful_login ?? true),
  });
  const [privacySettings, setPrivacySettings] = useState({
    showProfileInCommunity: true,
    showFaculty: true,
    allowTelegramDiscovery: false,
  });
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

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
      if (!response.ok) {
        setBanInfo(null);
        return;
      }
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
      if (data.success) {
        setSessions(data.sessions || []);
      }
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
    setNotificationSettings((current) => ({
      ...current,
      sessionAlerts: Boolean(user?.notify_successful_login ?? true),
    }));
  }, [user?.notify_successful_login]);

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

  const tabs = useMemo(
    () => [
      { id: 'profile', label: 'Профиль', icon: User },
      { id: 'security', label: 'Безопасность', icon: Shield },
      { id: 'notifications', label: 'Уведомления', icon: Bell },
      { id: 'privacy', label: 'Приватность', icon: Eye },
      {
        id: 'logout',
        label: 'Выйти',
        icon: LogOut,
        tone: 'danger',
        onClick: handleLogout,
      },
    ],
    [onLogout, logout]
  );

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
    if (data.success && data.user) {
      onProfileUpdate?.(data.user);
    }
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
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      if (bannerInputRef.current) bannerInputRef.current.value = '';
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
      if (!response.ok || !data.success) {
        throw new Error(data.detail || 'Не удалось изменить пароль');
      }

      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showSuccess('Пароль успешно изменён');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось изменить пароль';
      setErrors({ password: message });
      showError(message);
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
      if (!data.success || !data.data?.binding_link) {
        throw new Error();
      }
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

    if (mediaType === 'avatar') {
      setAvatarFile(null);
      setAvatarPreview(null);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      return;
    }

    setBannerFile(null);
    setBannerPreview(null);
    if (bannerInputRef.current) bannerInputRef.current.value = '';
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

  const resetSelection = () => {
    setAvatarFile(null);
    setBannerFile(null);
    setAvatarPreview(null);
    setBannerPreview(null);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
    if (bannerInputRef.current) bannerInputRef.current.value = '';
  };

  const toggleNotificationSetting = async (key) => {
    const nextValue = !notificationSettings[key];
    setNotificationSettings((current) => ({ ...current, [key]: nextValue }));

    if (key !== 'sessionAlerts') {
      return;
    }

    try {
      const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' });
      const response = await fetch(API_ENDPOINTS.PROFILE_PREFERENCES, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ notify_successful_login: nextValue }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || 'Не удалось сохранить настройки уведомлений');
      }

      onProfileUpdate?.({
        ...user,
        notify_successful_login: nextValue,
      });
      await checkAuth();
      showSuccess(nextValue ? 'Уведомления о входе включены' : 'Уведомления о входе отключены');
    } catch (error) {
      setNotificationSettings((current) => ({ ...current, [key]: !nextValue }));
      showError(error instanceof Error ? error.message : 'Не удалось сохранить настройки уведомлений');
    }
  };

  const togglePrivacySetting = (key) => {
    setPrivacySettings((current) => ({ ...current, [key]: !current[key] }));
  };

  const content = activeTab === 'profile' ? (
    <ProfileOverviewSection
      banInfo={banInfo}
      bannerPreview={bannerPreview}
      userMedia={userMedia}
      setBannerFile={setBannerFile}
      setBannerPreview={setBannerPreview}
      bannerInputRef={bannerInputRef}
      setDeleteModal={setDeleteModal}
      avatarPreview={avatarPreview}
      setAvatarFile={setAvatarFile}
      setAvatarPreview={setAvatarPreview}
      avatarInputRef={avatarInputRef}
      user={user}
      errors={errors}
      handleSubmit={handleSubmit}
      loading={loading}
      avatarFile={avatarFile}
      bannerFile={bannerFile}
      resetSelection={resetSelection}
    />
  ) : activeTab === 'security' ? (
    <SecuritySettingsSection
      showPasswordForm={showPasswordForm}
      setShowPasswordForm={setShowPasswordForm}
      handlePasswordChange={handlePasswordChange}
      showPasswords={showPasswords}
      setShowPasswords={setShowPasswords}
      currentPassword={currentPassword}
      setCurrentPassword={setCurrentPassword}
      newPassword={newPassword}
      setNewPassword={setNewPassword}
      confirmPassword={confirmPassword}
      setConfirmPassword={setConfirmPassword}
      errors={errors}
      loading={loading}
      setIsTwoFARecoveryModalOpen={setIsTwoFARecoveryModalOpen}
      isTelegramLinked={isTelegramLinked}
      generateTelegramLink={generateTelegramLink}
      loadingTelegram={loadingTelegram}
      telegramLink={telegramLink}
      telegramBinding={telegramBinding}
      formatTelegramLinkedAt={formatTelegramLinkedAt}
      getTelegramDisplayName={getTelegramDisplayName}
      refreshSessions={refreshSessions}
      loadingSessions={loadingSessions}
      sessions={sessions}
    />
  ) : activeTab === 'notifications' ? (
    <PreferenceSettingsSection
      title="Уведомления"
      description="Настройте, какие уведомления Bentum будет показывать вам в интерфейсе."
      items={[
        {
          key: 'importantUpdates',
          label: 'Важные обновления',
          description: 'Сообщения о ключевых изменениях в сервисе и аккаунте.',
        },
        {
          key: 'newsDigest',
          label: 'Новости и объявления',
          description: 'Подборка новых материалов и важных публикаций.',
        },
        {
          key: 'sessionAlerts',
          label: 'Успешный вход в аккаунт',
          description: 'Telegram-уведомление после успешного входа, если у вас включена двухфакторная аутентификация.',
        },
      ]}
      values={notificationSettings}
      onToggle={toggleNotificationSetting}
    />
  ) : (
    <PreferenceSettingsSection
      title="Приватность"
      description="Управляйте тем, какая информация о вашем профиле может быть видна в интерфейсе."
      items={[
        {
          key: 'showProfileInCommunity',
          label: 'Показывать профиль в сообществе',
          description: 'Разрешить отображение карточки профиля в общих списках.',
        },
        {
          key: 'showFaculty',
          label: 'Показывать факультет',
          description: 'Отображать факультет в публичных карточках профиля.',
        },
        {
          key: 'allowTelegramDiscovery',
          label: 'Разрешить поиск через Telegram',
          description: 'Показывать, что к аккаунту привязан Telegram-профиль.',
        },
      ]}
      values={privacySettings}
      onToggle={togglePrivacySetting}
    />
  );

  return (
    <ProfileSettingsShell
      onBack={onBack}
      tabs={tabs}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      content={content}
    >
      <DeleteMediaModal
        deleteModal={deleteModal}
        setDeleteModal={setDeleteModal}
        confirmDelete={confirmDelete}
      />
      <TwoFARecoveryModal
        isOpen={isTwoFARecoveryModalOpen}
        onClose={() => setIsTwoFARecoveryModalOpen(false)}
        darkMode={darkMode}
      />
    </ProfileSettingsShell>
  );
}

export default ProfileSettings;
