import React, { useMemo } from 'react';
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  RefreshCw,
  Send,
  Shield,
  Smartphone,
  X,
} from 'lucide-react';

function formatSessionDate(value) {
  if (!value) return 'Неизвестно';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Неизвестно';

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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
  closeSession,
  closingSessionId,
}) {
  const canCloseOtherSessions = useMemo(() => {
    const currentSession = sessions.find((session) => session.is_current);
    if (!currentSession?.created_at) return false;

    const createdAt = new Date(currentSession.created_at);
    if (Number.isNaN(createdAt.getTime())) return false;

    return Date.now() - createdAt.getTime() >= 24 * 60 * 60 * 1000;
  }, [sessions]);

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
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Активные сессии</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Другие устройства можно завершать только если текущей сессии больше 24 часов.
            </p>
          </div>
          <button
            onClick={refreshSessions}
            disabled={loadingSessions}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200/70 bg-gray-100/50 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50 dark:border-slate-800/60 dark:bg-[#17202d] dark:text-slate-300"
          >
            {loadingSessions ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Обновить
          </button>
        </div>

        {!canCloseOtherSessions && sessions.some((session) => !session.is_current) ? (
          <div className="mb-4 rounded-2xl border border-amber-300/70 bg-amber-50/90 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            Для завершения других сессий текущая сессия должна существовать не меньше 24 часов.
          </div>
        ) : null}

        {loadingSessions ? (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin" />
            Загрузка...
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.length ? (
              sessions.map((session, index) => {
                const title = [session.device, session.browser, session.os]
                  .filter(Boolean)
                  .filter((value, position, array) => array.indexOf(value) === position)
                  .join(' • ') || 'Устройство';
                const canClose = Boolean(session.is_current || canCloseOtherSessions);
                const isClosing = closingSessionId === session.id;

                return (
                  <div
                    key={session.id || index}
                    className="rounded-2xl border border-gray-200/70 bg-white/82 px-4 py-4 dark:border-slate-800/60 dark:bg-[#17202d]"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium text-slate-900 dark:text-white">{title}</div>
                          {session.is_current ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                              Текущая
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 grid gap-1 text-sm text-slate-600 dark:text-slate-400">
                          <div className="inline-flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            <span>{session.ip_address || 'IP не определён'}</span>
                          </div>
                          <div className="inline-flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            <span>Создана: {formatSessionDate(session.created_at)}</span>
                          </div>
                          <div className="inline-flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            <span>Активность: {formatSessionDate(session.last_activity)}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!canClose || isClosing}
                        onClick={() => closeSession(session.id, { isCurrent: session.is_current })}
                        className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                          canClose
                            ? 'bg-rose-500/12 text-rose-600 hover:bg-rose-500/18 dark:text-rose-300'
                            : 'cursor-not-allowed bg-slate-200/70 text-slate-400 dark:bg-slate-800/70 dark:text-slate-500'
                        }`}
                        title={
                          canClose
                            ? session.is_current
                              ? 'Завершить текущую сессию'
                              : 'Завершить эту сессию'
                            : 'Другие сессии можно закрывать только спустя 24 часа'
                        }
                      >
                        {isClosing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                        {session.is_current ? 'Выйти' : 'Закрыть'}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-slate-600 dark:text-slate-400">Сессии не найдены.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
