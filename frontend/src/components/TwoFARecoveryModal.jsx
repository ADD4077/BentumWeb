import React, { useEffect, useState } from 'react';
import { X, Mail, AlertCircle, Lock, Smartphone } from 'lucide-react';

import { buildCsrfHeaders } from '../utils/http.js';

const TwoFARecoveryModal = ({ isOpen, onClose, darkMode }) => {
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    checkTelegramLink();
    checkTwoFAStatus();
  }, [isOpen]);

  const checkTelegramLink = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/telegram/binding-status', {
        credentials: 'include',
      });

      if (!response.ok) {
        setError('Не удалось проверить статус Telegram');
        return;
      }

      const data = await response.json();
      setTelegramLinked(Boolean(data.data?.is_linked));
    } catch (fetchError) {
      setError('Ошибка при проверке статуса Telegram');
      console.error('Error checking Telegram link:', fetchError);
    } finally {
      setLoading(false);
    }
  };

  const checkTwoFAStatus = async () => {
    try {
      const response = await fetch('/api/2fa/config', {
        credentials: 'include',
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setTwoFAEnabled(Boolean(data.data?.enabled));
    } catch (fetchError) {
      console.error('Error checking 2FA status:', fetchError);
    }
  };

  const toggleTwoFA = async (enabled) => {
    setTwoFALoading(true);
    setError('');

    try {
      const headers = await buildCsrfHeaders({
        'Content-Type': 'application/json',
      });
      const response = await fetch('/api/2fa/config', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          enabled,
          method: enabled ? 'telegram' : null,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.detail || 'Не удалось обновить настройки 2FA');
        return;
      }

      setTwoFAEnabled(enabled);
    } catch (fetchError) {
      setError('Ошибка при обновлении настроек 2FA');
      console.error('Error toggling 2FA:', fetchError);
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleTelegramLinking = async () => {
    const popup = window.open('about:blank', '_blank');
    if (!popup) {
      setError('Браузер заблокировал всплывающее окно. Разрешите popup для этого сайта и попробуйте снова.');
      return;
    }

    popup.document.title = 'Подготовка привязки Telegram...';
    popup.document.body.innerHTML = '<p>Подготавливаем ссылку для привязки Telegram...</p>';

    try {
      const headers = await buildCsrfHeaders({
        'Content-Type': 'application/json',
      });
      const response = await fetch('/api/telegram/generate-link', {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.success || !data.data?.binding_link) {
        popup.close();
        setError(data.detail || 'Не удалось создать ссылку для Telegram');
        return;
      }

      popup.location.href = data.data.binding_link;
    } catch (fetchError) {
      popup.close();
      setError('Ошибка при создании ссылки для Telegram');
      console.error('Error generating Telegram link:', fetchError);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-3xl border shadow-2xl ${
        darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
      }`}>
        <div className={`flex items-center justify-between border-b p-6 ${
          darkMode ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
              darkMode
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                : 'bg-gradient-to-br from-blue-400 to-blue-600'
            }`}>
              <Lock className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Восстановление 2FA
              </h2>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Выберите способ восстановления
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${
              darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : error ? (
            <div className={`flex items-center gap-3 rounded-2xl border p-4 ${
              darkMode
                ? 'border-red-800 bg-red-900/20 text-red-400'
                : 'border-red-200 bg-red-50 text-red-600'
            }`}>
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className={`w-full rounded-2xl border p-4 ${
                telegramLinked
                  ? darkMode
                    ? 'border-emerald-700 bg-emerald-900/20'
                    : 'border-emerald-200 bg-emerald-50'
                  : darkMode
                    ? 'border-blue-700 bg-blue-900/20'
                    : 'border-blue-200 bg-blue-50'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    telegramLinked ? 'bg-emerald-500' : darkMode ? 'bg-blue-500' : 'bg-blue-600'
                  }`}>
                    <Smartphone className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className={`font-semibold ${
                      telegramLinked
                        ? darkMode ? 'text-emerald-400' : 'text-emerald-700'
                        : darkMode ? 'text-blue-400' : 'text-blue-700'
                    }`}>
                      Telegram Bot
                    </h3>
                    <p className={`text-sm ${
                      telegramLinked
                        ? darkMode ? 'text-emerald-300' : 'text-emerald-600'
                        : darkMode ? 'text-blue-300' : 'text-blue-600'
                    }`}>
                      {telegramLinked ? 'Использовать привязанный Telegram' : 'Сначала привяжите Telegram'}
                    </p>
                  </div>

                  {telegramLinked ? (
                    <div className="flex items-center gap-2">
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={twoFAEnabled}
                          onChange={(event) => toggleTwoFA(event.target.checked)}
                          disabled={twoFALoading}
                          className="peer sr-only"
                        />
                        <div className={`h-6 w-11 rounded-full transition-colors ${
                          twoFAEnabled
                            ? 'bg-emerald-500'
                            : darkMode ? 'bg-slate-600' : 'bg-slate-300'
                        } peer-checked:after:translate-x-full after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-['']`} />
                      </label>
                      {twoFALoading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                      ) : null}
                    </div>
                  ) : (
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
                      darkMode ? 'bg-blue-500' : 'bg-blue-600'
                    }`}>
                      <AlertCircle className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>

                {!telegramLinked ? (
                  <button
                    onClick={handleTelegramLinking}
                    className={`mt-3 w-full rounded-xl border p-3 transition-all duration-200 ${
                      darkMode
                        ? 'border-blue-600 bg-blue-900/30 text-blue-400 hover:bg-blue-900/40'
                        : 'border-blue-300 bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    Привязать Telegram
                  </button>
                ) : null}
              </div>

              <button
                disabled
                className={`w-full cursor-not-allowed rounded-2xl border p-4 opacity-50 ${
                  darkMode
                    ? 'border-slate-700 bg-slate-800/50'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    darkMode ? 'bg-slate-700' : 'bg-slate-200'
                  }`}>
                    <Mail className={`h-6 w-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className={`font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      Email
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      Скоро появится
                    </p>
                  </div>
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    darkMode ? 'bg-slate-700' : 'bg-slate-200'
                  }`}>
                    <AlertCircle className={`h-4 w-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>

        <div className={`border-t px-6 py-4 ${
          darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'
        }`}>
          <p className={`text-center text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Выберите способ, который поможет восстановить доступ к кодам 2FA
          </p>
        </div>
      </div>
    </div>
  );
};

export default TwoFARecoveryModal;
