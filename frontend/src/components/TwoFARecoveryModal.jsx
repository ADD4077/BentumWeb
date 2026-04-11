import React, { useState, useEffect } from 'react';
import { X, Mail, Send, Check, AlertCircle, Lock, Smartphone } from 'lucide-react';
import { api } from '../services/api.js';

const TwoFARecoveryModal = ({ isOpen, onClose, darkMode }) => {
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkTelegramLink();
      checkTwoFAStatus();
    }
  }, [isOpen]);

  const checkTelegramLink = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/telegram/binding-status', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setTelegramLinked(data.data?.is_linked || false);
      } else {
        setError('Failed to check Telegram status');
      }
    } catch (error) {
      setError('Error checking Telegram status');
      console.error('Error checking Telegram link:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkTwoFAStatus = async () => {
    try {
      const response = await fetch('/api/2fa/config', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setTwoFAEnabled(data.data?.enabled || false);
      }
    } catch (error) {
      console.error('Error checking 2FA status:', error);
    }
  };

  const toggleTwoFA = async (enabled) => {
    setTwoFALoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/2fa/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          enabled: enabled,
          method: enabled ? 'telegram' : null
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setTwoFAEnabled(enabled);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to update 2FA settings');
      }
    } catch (error) {
      setError('Error updating 2FA settings');
      console.error('Error toggling 2FA:', error);
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleMethodSelect = (method) => {
    if (method === 'email') {
      // Email method - show disabled message
      return;
    } else if (method === 'telegram') {
      if (telegramLinked) {
        // Open Telegram 2FA setup
        onClose();
        // Trigger Telegram 2FA setup
        window.dispatchEvent(new CustomEvent('openTelegram2FA'));
      } else {
        // Generate Telegram binding link via POST
        console.log('Generating Telegram binding link...');

        const popup = window.open('about:blank', '_blank');
        if (!popup) {
          alert('Браузер заблокировал всплывающее окно. Разреши popups для этого сайта и попробуй снова.');
          return;
        }
        popup.document.title = 'Подготовка привязки Telegram...';
        popup.document.body.innerHTML = '<p>Подготавливаем ссылку для привязки Telegram...</p>';
        
        fetch('/api/telegram/generate-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })
        .then(response => {
          console.log('Response status:', response.status);
          console.log('Response ok:', response.ok);
          
          if (response.ok) {
            return response.json();
          }
          throw new Error(`Failed to generate Telegram link: ${response.status} ${response.statusText}`);
        })
        .then(data => {
          console.log('Response data:', data);
          
          if (data.success && data.data?.binding_link) {
            console.log('Opening Telegram link:', data.data.binding_link);
            popup.location.href = data.data.binding_link;
          } else {
            console.error('Failed to generate Telegram link:', data.detail);
            alert(`Failed to generate Telegram link: ${data.detail || 'Unknown error'}`);
            popup.close();
          }
        })
        .catch(error => {
          console.error('Error generating Telegram link:', error);
          alert(`Error generating Telegram link: ${error.message || 'Unknown error'}`);
          popup.close();
        });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-md rounded-3xl shadow-2xl border ${
        darkMode 
          ? 'bg-slate-900 border-slate-800' 
          : 'bg-white border-slate-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          darkMode ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              darkMode 
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                : 'bg-gradient-to-br from-blue-400 to-blue-600'
            }`}>
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}>
                2FA Recovery
              </h2>
              <p className={`text-sm ${
                darkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Choose recovery method
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
              darkMode 
                ? 'hover:bg-slate-800 text-slate-400' 
                : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className={`p-4 rounded-2xl flex items-center gap-3 ${
              darkMode 
                ? 'bg-red-900/20 border border-red-800 text-red-400' 
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Email Option */}
              <button
                onClick={() => handleMethodSelect('email')}
                disabled={true}
                className={`w-full p-4 rounded-2xl border transition-all duration-200 ${
                  darkMode 
                    ? 'bg-slate-800/50 border-slate-700 opacity-50 cursor-not-allowed' 
                    : 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    darkMode 
                      ? 'bg-slate-700' 
                      : 'bg-slate-200'
                  }`}>
                    <Mail className={`w-6 h-6 ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`} />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className={`font-semibold ${
                      darkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}>
                      Email Recovery
                    </h3>
                    <p className={`text-sm ${
                      darkMode ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      Coming soon
                    </p>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    darkMode 
                      ? 'bg-slate-700' 
                      : 'bg-slate-200'
                  }`}>
                    <AlertCircle className={`w-4 h-4 ${
                      darkMode ? 'text-slate-500' : 'text-slate-400'
                    }`} />
                  </div>
                </div>
              </button>

              {/* Telegram Option */}
              <div className={`w-full p-4 rounded-2xl border transition-all duration-200 ${
                telegramLinked
                  ? darkMode
                    ? 'bg-emerald-900/20 border-emerald-700'
                    : 'bg-emerald-50 border-emerald-200'
                  : darkMode
                    ? 'bg-blue-900/20 border-blue-700'
                    : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    telegramLinked
                      ? 'bg-emerald-500'
                      : darkMode
                        ? 'bg-blue-500'
                        : 'bg-blue-600'
                  }`}>
                    <Smartphone className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className={`font-semibold ${
                      telegramLinked
                        ? darkMode
                          ? 'text-emerald-400'
                          : 'text-emerald-700'
                        : darkMode
                          ? 'text-blue-400'
                          : 'text-blue-700'
                    }`}>
                      Telegram Bot
                    </h3>
                    <p className={`text-sm ${
                      telegramLinked
                        ? darkMode
                          ? 'text-emerald-300'
                          : 'text-emerald-600'
                        : darkMode
                          ? 'text-blue-300'
                          : 'text-blue-600'
                    }`}>
                      {telegramLinked ? 'Use linked Telegram account' : 'Link your Telegram account first'}
                    </p>
                  </div>
                  {telegramLinked ? (
                    <div className="flex items-center gap-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={twoFAEnabled}
                          onChange={(e) => toggleTwoFA(e.target.checked)}
                          disabled={twoFALoading}
                          className="sr-only peer"
                        />
                        <div className={`w-11 h-6 rounded-full transition-colors ${
                          twoFAEnabled
                            ? 'bg-emerald-500'
                            : darkMode
                              ? 'bg-slate-600'
                              : 'bg-slate-300'
                        } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                      </label>
                      {twoFALoading && (
                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </div>
                  ) : (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      darkMode
                        ? 'bg-blue-500'
                        : 'bg-blue-600'
                    }`}>
                      <AlertCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                {!telegramLinked && (
                  <button
                    onClick={() => handleMethodSelect('telegram')}
                    className={`w-full mt-3 p-3 rounded-xl border transition-all duration-200 ${
                      darkMode
                        ? 'bg-blue-900/30 border-blue-600 hover:bg-blue-900/40 text-blue-400'
                        : 'bg-blue-100 border-blue-300 hover:bg-blue-200 text-blue-700'
                    }`}
                  >
                    Link Telegram Account
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${
          darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'
        }`}>
          <p className={`text-xs text-center ${
            darkMode ? 'text-slate-500' : 'text-slate-400'
          }`}>
            Choose how you want to recover your 2FA codes
          </p>
        </div>
      </div>
    </div>
  );
};

export default TwoFARecoveryModal;
