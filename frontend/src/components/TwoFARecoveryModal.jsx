import React, { useEffect, useState } from 'react';
import { X, AlertCircle, Lock, Smartphone } from 'lucide-react';

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
    <div className="modal-backdrop fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        className={`modal-panel w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl ${
          darkMode ? 'border-slate-800/60 bg-[#121927]' : 'border-slate-200 bg-white'
        }`}
      >
        <div
          className={`flex items-center justify-between border-b p-6 ${
            darkMode ? 'border-slate-800/60' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                darkMode
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                  : 'bg-gradient-to-br from-emerald-400 to-emerald-600'
              }`}
            >
              <Lock className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Настройка 2FA
              </h2>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Управляйте подтверждением входа через Telegram
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${
              darkMode ? 'text-slate-400 hover:bg-[#17202d]' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            </div>
          ) : error ? (
            <div
              className={`flex items-center gap-3 rounded-2xl border p-4 ${
                darkMode
                  ? 'border-red-800 bg-red-900/20 text-red-400'
                  : 'border-red-200 bg-red-50 text-red-600'
              }`}
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div
                  className={`w-full rounded-2xl border p-4 ${
                    telegramLinked
                      ? darkMode
                        ? 'border-emerald-700 bg-emerald-900/20'
                        : 'border-emerald-200 bg-emerald-50'
                      : darkMode
                        ? 'border-slate-700 bg-[#17202d]'
                        : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                        telegramLinked ? 'bg-emerald-500' : darkMode ? 'bg-slate-600' : 'bg-slate-700'
                      }`}
                    >
                      <Smartphone className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3
                        className={`font-semibold ${
                          telegramLinked
                            ? darkMode
                              ? 'text-emerald-400'
                              : 'text-emerald-700'
                            : darkMode
                              ? 'text-slate-200'
                              : 'text-slate-800'
                        }`}
                      >
                        Telegram Bot
                      </h3>
                      <p
                        className={`text-sm ${
                          telegramLinked
                            ? darkMode
                              ? 'text-emerald-300'
                              : 'text-emerald-600'
                            : darkMode
                              ? 'text-slate-400'
                              : 'text-slate-600'
                        }`}
                      >
                        {telegramLinked
                          ? 'Использовать привязанный Telegram'
                          : 'Сначала привяжите Telegram в профиле'}
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
                          <div
                            className={`h-6 w-11 rounded-full transition-colors ${
                              twoFAEnabled
                                ? 'bg-emerald-500'
                                : darkMode
                                  ? 'bg-slate-600'
                                  : 'bg-slate-300'
                            } peer-checked:after:translate-x-full after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-['']`}
                          />
                        </label>
                        {twoFALoading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                        ) : null}
                      </div>
                    ) : (
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full ${
                          darkMode ? 'bg-slate-600' : 'bg-slate-300'
                        }`}
                      >
                        <AlertCircle className={`h-4 w-4 ${darkMode ? 'text-white' : 'text-slate-700'}`} />
                      </div>
                    )}
                  </div>

                  {!telegramLinked ? (
                    <button
                      onClick={handleTelegramLinking}
                      className={`mt-3 w-full rounded-xl border p-3 transition-all duration-200 ${
                        darkMode
                          ? 'border-slate-700 bg-[#0f1623] text-slate-200 hover:bg-[#182131]'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Привязать Telegram
                    </button>
                  ) : null}
                </div>
              </div>

              <p className={`mt-4 text-center text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Для подтверждения входа сейчас используется только Telegram.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwoFARecoveryModal;
