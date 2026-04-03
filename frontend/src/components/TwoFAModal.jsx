import React, { useState, useEffect } from 'react';
import { X, Shield, Smartphone, Mail, RefreshCw } from 'lucide-react';
import { api } from '../services/api.js';

const TwoFAModal = ({ isOpen, onClose, onSuccess, darkMode }) => {
  const [code, setCode] = useState(['', '', '', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 минут в секундах
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Сбрасываем состояние при закрытии модального окна
      setCode(['', '', '', '', '', '', '', '']);
      setError('');
      setTimeLeft(300);
      setCanResend(false);
      return;
    }

    // Таймер обратного отсчета
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const handleInputChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);
      
      // Автоматический переход к следующему полю
      if (value && index < 5) {
        const nextInput = document.getElementById(`code-${index + 1}`);
        if (nextInput) {
          nextInput.focus();
        }
      }
      
      // Автоматическая отправка при заполнении всех полей
      if (index === 5 && value) {
        const fullCode = newCode.join('');
        if (fullCode.length === 6) {
          handleSubmit(fullCode);
        }
      }
    }
  };

  const handleKeyDown = (index, e) => {
    // Обработка Backspace для перехода к предыдущему полю
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);
    
    if (digits.length === 6) {
      const newCode = digits.split('');
      setCode(newCode);
      
      // Фокус на последнее поле
      setTimeout(() => {
        const lastInput = document.getElementById('code-5');
        if (lastInput) {
          lastInput.focus();
        }
      }, 0);
      
      // Автоматическая отправка
      handleSubmit(digits);
    }
  };

  const handleSubmit = async (fullCode) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await api.verify2FACode(fullCode);
      
      if (response.ok && response.success) {
        onSuccess();
        onClose();
      } else {
        setError(response.detail || 'Неверный код');
        // Очищаем поля при ошибке
        setCode(['', '', '', '', '', '', '']);
        // Фокус на первое поле
        setTimeout(() => {
          const firstInput = document.getElementById('code-0');
          if (firstInput) {
            firstInput.focus();
          }
        }, 0);
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await api.resend2FACode();
      
      if (response.ok && response.success) {
        setTimeLeft(300);
        setCanResend(false);
        setCode(['', '', '', '', '', '', '']);
        // Фокус на первое поле
        setTimeout(() => {
          const firstInput = document.getElementById('code-0');
          if (firstInput) {
            firstInput.focus();
          }
        }, 0);
      } else {
        setError(response.detail || 'Ошибка отправки кода');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-md ${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-2xl shadow-2xl border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
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
                Введите 6-значный код из Telegram
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
          <div className="flex justify-center gap-2 mb-6">
            {code.map((digit, index) => (
              <input
                key={index}
                id={`code-${index}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={`w-12 h-14 text-center text-xl font-bold rounded-lg border-2 transition-all ${
                  darkMode 
                    ? 'bg-slate-800 border-slate-600 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' 
                    : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                } ${error ? 'border-red-500' : ''}`}
                disabled={loading}
              />
            ))}
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Resend button */}
          <div className="flex items-center justify-between">
            <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {timeLeft > 0 ? (
                <span>Код действителен еще {formatTime(timeLeft)}</span>
              ) : (
                <span>Код истек. Запросите новый.</span>
              )}
            </div>
            
            {canResend && (
              <button
                onClick={handleResend}
                disabled={loading}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                  loading
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Отправка...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Отправить повторно
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-2 text-sm">
            <Smartphone className="w-4 h-4 text-emerald-500" />
            <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
              Код отправлен в ваш Telegram аккаунт
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwoFAModal;
