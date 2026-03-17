import React, { useState } from 'react';
import { API_ENDPOINTS } from '../config/api.js';
import { X, Send, MessageCircle, AlertTriangle, Lightbulb, HelpCircle, Bug } from 'lucide-react';

function SupportModal({ isOpen, onClose, darkMode, onSuccess }) {
  const [message, setMessage] = useState('');
  const [requestType, setRequestType] = useState('support');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const requestTypes = [
    { value: 'support', label: 'Поддержка', icon: MessageCircle, color: 'blue' },
    { value: 'bug', label: 'Ошибка', icon: Bug, color: 'red' },
    { value: 'feature', label: 'Предложение', icon: Lightbulb, color: 'yellow' },
    { value: 'question', label: 'Вопрос', icon: HelpCircle, color: 'green' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setSubmitStatus({ type: 'error', message: 'Пожалуйста, напишите сообщение' });
      return;
    }
    
    setIsSubmitting(true);
    setSubmitStatus(null);
    
    try {
      const response = await fetch(API_ENDPOINTS.SUPPORT_SUBMIT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: message.trim(),
          type: requestType
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSubmitStatus({ type: 'success', message: data.message });
        setMessage('');
        // Вызываем callback для открытия окна успеха
        if (onSuccess) {
          onSuccess();
        }
        // Закрываем текущее модальное окно
        onClose();
        setSubmitStatus(null);
      } else {
        setSubmitStatus({ type: 'error', message: data.detail || 'Ошибка при отправке заявки' });
      }
    } catch (error) {
      setSubmitStatus({ type: 'error', message: 'Ошибка соединения с сервером' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const getColorClasses = (color) => {
    const colorMap = {
      blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      red: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800',
      yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
      green: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800'
    };
    return colorMap[color] || colorMap.blue;
  };

  const getSelectedColorClasses = (color) => {
    const colorMap = {
      blue: 'bg-blue-500 text-white border-blue-500',
      red: 'bg-red-500 text-white border-red-500',
      yellow: 'bg-yellow-500 text-white border-yellow-500',
      green: 'bg-green-500 text-white border-green-500'
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-gray-200 dark:border-slate-700 rounded-3xl shadow-2xl max-w-lg w-full custom-scrollbar">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Поддержка
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            <X className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Выбор типа обращения */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Тип обращения
            </label>
            <div className="grid grid-cols-2 gap-2">
              {requestTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = requestType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setRequestType(type.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      isSelected 
                        ? getSelectedColorClasses(type.color)
                        : getColorClasses(type.color)
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Сообщение */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Сообщение
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              maxLength={2000}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none custom-scrollbar"
              placeholder="Опишите вашу проблему, вопрос или предложение..."
            />
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {message.length}/2000 символов
            </div>
          </div>

          {/* Статус отправки */}
          {submitStatus && (
            <div className={`p-4 rounded-xl text-sm font-medium ${
              submitStatus.type === 'success'
                ? 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
            }`}>
              {submitStatus.type === 'success' ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold">Заявка отправлена!</div>
                    <div className="text-xs opacity-90 mt-0.5">{submitStatus.message}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-4 flex-shrink-0" />
                  <div>
                    <div className="font-semibold">Ошибка</div>
                    <div className="text-xs opacity-90 mt-0.5">{submitStatus.message}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Кнопки */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-medium rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg disabled:scale-100 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Отправка...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Отправить заявку
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-colors"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SupportModal;
