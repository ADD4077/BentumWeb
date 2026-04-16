import React, { useState, useEffect } from 'react';
import { X, Smartphone, Mail, Shield, Check, AlertCircle } from 'lucide-react';
import { api } from '../services/api.js';

const TwoFASetupModal = ({ isOpen, onClose, darkMode, onSuccess }) => {
  const [selectedMethod, setSelectedMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentConfig, setCurrentConfig] = useState(null);
  const [telegramBinding, setTelegramBinding] = useState(null);
  const [emailBinding, setEmailBinding] = useState(null);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCurrentConfig();
    }
  }, [isOpen]);

  const loadCurrentConfig = async () => {
    try {
      // Загружаем текущую конфигурацию 2FA
      const configResponse = await api.get2FAConfig();
      if (configResponse.ok && configResponse.success) {
        setCurrentConfig(configResponse.data);
        setSelectedMethod(configResponse.data.method || '');
      }

      // Загружаем статус привязки Telegram
      const telegramResponse = await fetch('/api/telegram/binding-status', {
        credentials: 'include',
      });
      if (telegramResponse.ok) {
        const telegramData = await telegramResponse.json();
        if (telegramData.success) {
          setTelegramBinding(telegramData.data);
        }
      }

      // Загружаем статус привязки Email
      const emailResponse = await fetch('/api/email/binding-status', {
        credentials: 'include',
      });
      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        if (emailData.success) {
          setEmailBinding(emailData.data);
        }
      }
    } catch (error) {
      console.error('Error loading 2FA config:', error);
    }
  };

  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
    setError('');
    if (method === 'email' && (!emailBinding || !emailBinding.is_linked)) {
      setShowEmailInput(true);
    } else {
      setShowEmailInput(false);
    }
  };

  const handleEmailBind = async () => {
    if (!emailInput || !emailInput.includes('@')) {
      setError('Введите корректный email');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/email/bind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: emailInput }),
      });

      const data = await response.json();
      if (data.success) {
        setEmailBinding({ is_linked: true, email: emailInput });
        setShowEmailInput(false);
        setError('');
      } else {
        setError(data.detail || 'Ошибка привязки email');
      }
    } catch (error) {
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
      setError('Сначала привяжите Telegram аккаунт');
      return;
    }

    if (selectedMethod === 'email' && (!emailBinding || !emailBinding.is_linked)) {
      setError('Сначала привяжите Email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.set2FAConfig(true, selectedMethod);
      
      if (response.ok && response.success) {
        onSuccess(response.message);
        onClose();
      } else {
        setError(response.detail || 'Ошибка настройки 2FA');
      }
    } catch (error) {
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
      
      if (response.ok && response.success) {
        onSuccess('Двухфакторная аутентификация отключена');
        onClose();
      } else {
        setError(response.detail || 'Ошибка отключения 2FA');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className={`w-full max-w-lg ${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-2xl shadow-2xl border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Двухфакторная аутентификация
              </h2>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Выберите метод подтверждения входа
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Current Status */}
          {currentConfig && (
            <div className={`mb-6 p-4 rounded-lg ${currentConfig.enabled ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
              <div className="flex items-center gap-2">
                {currentConfig.enabled ? (
                  <>
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-800 dark:text-emerald-200 font-medium">
                      2FA включена ({currentConfig.method === 'telegram' ? 'Telegram' : currentConfig.method})
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                      2FA отключена
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Method Selection */}
          <div className="space-y-4">
            {/* Telegram Method */}
            <button
              onClick={() => handleMethodSelect('telegram')}
              disabled={!telegramBinding?.is_linked}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                selectedMethod === 'telegram'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : darkMode 
                    ? 'border-slate-600 bg-slate-800 hover:border-slate-500'
                    : 'border-slate-300 bg-white hover:border-slate-400'
              } ${!telegramBinding?.is_linked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedMethod === 'telegram'
                      ? 'bg-emerald-500'
                      : darkMode
                        ? 'bg-slate-600'
                        : 'bg-slate-200'
                  }`}>
                    <Smartphone className={`w-5 h-5 ${selectedMethod === 'telegram' ? 'text-white' : darkMode ? 'text-slate-300' : 'text-slate-600'}`} />
                  </div>
                  <div className="text-left">
                    <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      Telegram
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Код подтверждения будет отправлен в Telegram
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {telegramBinding?.is_linked ? (
                    <Check className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>
              {!telegramBinding?.is_linked && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Сначала привяжите Telegram аккаунт в настройках профиля
                </p>
              )}
            </button>

            {/* Email Method */}
            <button
              onClick={() => handleMethodSelect('email')}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                selectedMethod === 'email'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : darkMode 
                    ? 'border-slate-600 bg-slate-800 hover:border-slate-500'
                    : 'border-slate-300 bg-white hover:border-slate-400'
              } cursor-pointer`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedMethod === 'email'
                      ? 'bg-emerald-500'
                      : darkMode
                        ? 'bg-slate-600'
                        : 'bg-slate-200'
                  }`}>
                    <Mail className={`w-5 h-5 ${selectedMethod === 'email' ? 'text-white' : darkMode ? 'text-slate-300' : 'text-slate-600'}`} />
                  </div>
                  <div className="text-left">
                    <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      Email
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Код подтверждения будет отправлен на почту
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {emailBinding?.is_linked ? (
                    <Check className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>
              {!emailBinding?.is_linked && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Нажмите чтобы привязать Email
                </p>
              )}
            </button>

            {/* Email Input Form */}
            {showEmailInput && (
              <div className={`p-4 rounded-xl border-2 ${darkMode ? 'border-slate-600 bg-slate-800' : 'border-slate-300 bg-white'}`}>
                <p className={`text-sm mb-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Введите ваш email для привязки:
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="your@email.com"
                    className={`flex-1 px-3 py-2 rounded-lg border ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  />
                  <button
                    onClick={handleEmailBind}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      loading
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-100'
                    }`}
                  >
                    {loading ? '...' : 'Привязать'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'} flex justify-between`}>
          {/* Disable 2FA button */}
          {currentConfig?.enabled && (
            <button
              onClick={handleDisable}
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                loading
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {loading ? 'Отключение...' : 'Отключить 2FA'}
            </button>
          )}

          {/* Enable/Save button */}
          {!currentConfig?.enabled && (
            <button
              onClick={handleSubmit}
              disabled={loading || !selectedMethod}
              className={`px-6 py-2 text-sm font-medium rounded-lg transition-all ${
                loading || !selectedMethod
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg hover:shadow-emerald-500/40 transform hover:scale-[1.02]'
              }`}
            >
              {loading ? 'Включение...' : 'Включить 2FA'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwoFASetupModal;
