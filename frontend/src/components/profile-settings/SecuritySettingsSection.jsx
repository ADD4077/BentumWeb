import React from 'react';
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  RefreshCw,
  Send,
} from 'lucide-react';

export default function SecuritySettingsSection({
  showPasswordForm,
  setShowPasswordForm,
  handlePasswordChange,
  showPasswords,
  setShowPasswords,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  errors,
  loading,
  setIsTwoFARecoveryModalOpen,
  isTelegramLinked,
  generateTelegramLink,
  loadingTelegram,
  telegramLink,
  telegramBinding,
  formatTelegramLinkedAt,
  getTelegramDisplayName,
  refreshSessions,
  loadingSessions,
  sessions,
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200/70 bg-gray-100/50 p-6 shadow-lg shadow-gray-900/10 dark:border-slate-800/60 dark:bg-[#121927] dark:shadow-black/20 sm:p-8">
        <div className="mb-0 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Пароль и защита</h2>
          <button
            onClick={() => setShowPasswordForm((value) => !value)}
            className="rounded-xl border border-gray-200/70 bg-gray-100/50 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-800/60 dark:bg-[#17202d] dark:text-slate-300"
          >
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
                  <input
                    type={showPasswords[key] ? 'text' : 'password'}
                    value={value}
                    onChange={(event) => setter(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200/70 bg-white/90 px-4 py-3 pr-12 dark:border-slate-800/60 dark:bg-[#0f1623] dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((current) => ({ ...current, [key]: !current[key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  >
                    {showPasswords[key] ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            ))}
            {errors.password ? (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                {errors.password}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
              Обновить пароль
            </button>
          </form>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-200/70 bg-gray-100/50 p-6 shadow-lg shadow-gray-900/10 dark:border-slate-800/60 dark:bg-[#121927] dark:shadow-black/20">
          <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">Двухфакторная аутентификация</h3>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Усильте защиту аккаунта через дополнительное подтверждение входа.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setIsTwoFARecoveryModalOpen(true)}
              className="rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 font-semibold text-white"
            >
              Открыть настройки 2FA
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200/70 bg-gray-100/50 p-6 shadow-lg shadow-gray-900/10 dark:border-slate-800/60 dark:bg-[#121927] dark:shadow-black/20">
          <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">Telegram</h3>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            {isTelegramLinked
              ? 'Telegram уже привязан к вашему профилю.'
              : 'Привяжите Telegram для уведомлений и восстановления доступа.'}
          </p>
          {errors.telegram ? (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
              {errors.telegram}
            </div>
          ) : null}
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
            <button
              onClick={generateTelegramLink}
              disabled={loadingTelegram}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#229ED9] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#1b8fc4] disabled:opacity-50"
            >
              {loadingTelegram ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              Привязать Telegram
            </button>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200/70 bg-gray-100/50 p-6 shadow-lg shadow-gray-900/10 dark:border-slate-800/60 dark:bg-[#121927] dark:shadow-black/20">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Активные сессии</h3>
          <button
            onClick={refreshSessions}
            disabled={loadingSessions}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200/70 bg-gray-100/50 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50 dark:border-slate-800/60 dark:bg-[#17202d] dark:text-slate-300"
          >
            {loadingSessions ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Обновить
          </button>
        </div>
        {loadingSessions ? (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin" />
            Загрузка...
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.length ? (
              sessions.map((session, index) => (
                <div
                  key={session.session_key || index}
                  className="rounded-2xl border border-gray-200/70 bg-white/82 px-4 py-3 text-sm dark:border-slate-800/60 dark:bg-[#17202d]"
                >
                  <div className="font-medium text-slate-900 dark:text-white">
                    {[session.device, session.browser, session.os]
                      .filter(Boolean)
                      .filter((value, position, array) => array.indexOf(value) === position)
                      .join(' • ') || 'Устройство'}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">{session.ip_address || 'IP не определён'}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-600 dark:text-slate-400">Сессии не найдены.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
