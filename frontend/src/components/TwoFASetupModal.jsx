import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, Mail, Shield, Smartphone, X } from 'lucide-react';

import { api } from '../services/api.js';
import { buildCsrfHeaders } from '../utils/http.js';

function TwoFASetupModal({ isOpen, onClose, darkMode, onSuccess }) {
  const [selectedMethod, setSelectedMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentConfig, setCurrentConfig] = useState(null);
  const [telegramBinding, setTelegramBinding] = useState(null);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailBinding, setEmailBinding] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadCurrentConfig();
    }
  }, [isOpen]);

  const loadCurrentConfig = async () => {
    try {
      const configResponse = await api.get2FAConfig();
      if (configResponse.ok && configResponse.success) {
        setCurrentConfig(configResponse.data);
        setSelectedMethod(configResponse.data.method || '');
      }

      const telegramResponse = await fetch('/api/telegram/binding-status', {
        credentials: 'include',
      });
      if (telegramResponse.ok) {
        const telegramData = await telegramResponse.json();
        if (telegramData.success) {
          setTelegramBinding(telegramData.data);
        }
      }

      const emailResponse = await fetch('/api/email/binding-status', {
        credentials: 'include',
      });
      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        if (emailData.success) {
          setEmailBinding(emailData.data);
        }
      }
    } catch (loadError) {
      console.error('Error loading 2FA config:', loadError);
    }
  };

  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
    setError('');
    setShowEmailInput(method === 'email' && (!emailBinding || !emailBinding.is_linked));
  };

  const handleEmailBind = async () => {
    if (!emailInput || !emailInput.includes('@')) {
      setError('Введите корректный email');
      return;
    }

    setLoading(true);
    try {
      const headers = await buildCsrfHeaders({
        'Content-Type': 'application/json',
      });
      const response = await fetch('/api/email/bind', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ email: emailInput }),
      });

      const data = await response.json();
      if (!data.success) {
        setError(data.detail || 'Ошибка привязки email');
        return;
      }

      setEmailBinding({ is_linked: true, email: emailInput });
      setShowEmailInput(false);
      setError('');
    } catch {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMethod) {
      setError('Выберите метод двухфакторной аутентификации');
      return;
    }

    if (selectedMethod === 'telegram' && (!telegramBinding || !telegramBinding.is_linked)) {
      setError('Сначала привяжите Telegram в профиле');
      return;
    }

    if (selectedMethod === 'email' && (!emailBinding || !emailBinding.is_linked)) {
      setError('Сначала привяжите email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.set2FAConfig(true, selectedMethod);

      if (!response.ok || !response.success) {
        setError(response.detail || 'Ошибка настройки 2FA');
        return;
      }

      onSuccess?.(response.message);
      onClose();
    } catch {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.set2FAConfig(false, null);

      if (!response.ok || !response.success) {
        setError(response.detail || 'Ошибка отключения 2FA');
        return;
      }

      onSuccess?.('Двухфакторная аутентификация отключена');
      onClose();
    } catch {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const panelClass = darkMode
    ? 'border-slate-700 bg-slate-900'
    : 'border-slate-200 bg-white';

  const mutedTextClass = darkMode ? 'text-slate-400' : 'text-slate-600';
  const titleTextClass = darkMode ? 'text-white' : 'text-slate-900';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-lg rounded-2xl border shadow-2xl ${panelClass}`}>
        <div className={`flex items-center justify-between border-b p-6 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${titleTextClass}`}>Двухфакторная аутентификация</h2>
              <p className={`text-sm ${mutedTextClass}`}>Выберите способ подтверждения входа</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`rounded-lg p-2 transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {currentConfig ? (
            <div
              className={`mb-6 rounded-lg p-4 ${
                currentConfig.enabled
                  ? 'border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20'
                  : 'border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2">
                {currentConfig.enabled ? (
                  <>
                    <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-medium text-emerald-800 dark:text-emerald-200">
                      2FA включена ({currentConfig.method === 'telegram' ? 'Telegram' : currentConfig.method})
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    <span className={`font-medium ${titleTextClass}`}>2FA отключена</span>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : null}

          <div className="space-y-4">
            <button
              onClick={() => handleMethodSelect('telegram')}
              disabled={!telegramBinding?.is_linked}
              className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                selectedMethod === 'telegram'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : darkMode
                    ? 'border-slate-600 bg-slate-800 hover:border-slate-500'
                    : 'border-slate-300 bg-white hover:border-slate-400'
              } ${!telegramBinding?.is_linked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      selectedMethod === 'telegram'
                        ? 'bg-emerald-500'
                        : darkMode
                          ? 'bg-slate-600'
                          : 'bg-slate-200'
                    }`}
                  >
                    <Smartphone
                      className={`h-5 w-5 ${
                        selectedMethod === 'telegram'
                          ? 'text-white'
                          : darkMode
                            ? 'text-slate-300'
                            : 'text-slate-600'
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${titleTextClass}`}>Telegram</h3>
                    <p className={`text-sm ${mutedTextClass}`}>Код подтверждения придёт в Telegram</p>
                  </div>
                </div>
                {telegramBinding?.is_linked ? (
                  <Check className="h-5 w-5 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-slate-400" />
                )}
              </div>
              {!telegramBinding?.is_linked ? (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  Сначала привяжите Telegram в настройках профиля
                </p>
              ) : null}
            </button>

            <button
              onClick={() => handleMethodSelect('email')}
              className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                selectedMethod === 'email'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : darkMode
                    ? 'border-slate-600 bg-slate-800 hover:border-slate-500'
                    : 'border-slate-300 bg-white hover:border-slate-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      selectedMethod === 'email'
                        ? 'bg-emerald-500'
                        : darkMode
                          ? 'bg-slate-600'
                          : 'bg-slate-200'
                    }`}
                  >
                    <Mail
                      className={`h-5 w-5 ${
                        selectedMethod === 'email'
                          ? 'text-white'
                          : darkMode
                            ? 'text-slate-300'
                            : 'text-slate-600'
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${titleTextClass}`}>Email</h3>
                    <p className={`text-sm ${mutedTextClass}`}>Код подтверждения придёт на почту</p>
                  </div>
                </div>
                {emailBinding?.is_linked ? (
                  <Check className="h-5 w-5 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-slate-400" />
                )}
              </div>
              {!emailBinding?.is_linked ? (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  Укажите email для привязки
                </p>
              ) : null}
            </button>

            {showEmailInput ? (
              <div className={`rounded-xl border-2 p-4 ${darkMode ? 'border-slate-600 bg-slate-800' : 'border-slate-300 bg-white'}`}>
                <p className={`mb-3 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Введите email для привязки:
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(event) => setEmailInput(event.target.value)}
                    placeholder="your@email.com"
                    className={`flex-1 rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      darkMode
                        ? 'border-slate-600 bg-slate-700 text-white placeholder-slate-400'
                        : 'border-slate-300 bg-white text-slate-900 placeholder-slate-500'
                    }`}
                  />
                  <button
                    onClick={handleEmailBind}
                    disabled={loading}
                    className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                      loading
                        ? 'cursor-not-allowed bg-slate-300 text-slate-500'
                        : 'bg-emerald-500 text-white hover:bg-emerald-600'
                    }`}
                  >
                    {loading ? '...' : 'Привязать'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div
          className={`flex justify-between border-t px-6 py-4 ${
            darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
          }`}
        >
          {currentConfig?.enabled ? (
            <button
              onClick={handleDisable}
              disabled={loading}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                loading
                  ? 'cursor-not-allowed bg-slate-300 text-slate-500'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              {loading ? 'Отключение...' : 'Отключить 2FA'}
            </button>
          ) : (
            <span />
          )}

          {!currentConfig?.enabled ? (
            <button
              onClick={handleSubmit}
              disabled={loading || !selectedMethod}
              className={`rounded-lg px-6 py-2 text-sm font-medium transition-all ${
                loading || !selectedMethod
                  ? 'cursor-not-allowed bg-slate-300 text-slate-500'
                  : 'bg-emerald-500 text-white shadow-lg hover:scale-[1.02] hover:bg-emerald-600 hover:shadow-emerald-500/40'
              }`}
            >
              {loading ? 'Включение...' : 'Включить 2FA'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default TwoFASetupModal;
