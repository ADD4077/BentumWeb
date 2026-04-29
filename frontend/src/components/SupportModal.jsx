import React, { useState } from 'react';
import {
  AlertTriangle,
  Bug,
  HelpCircle,
  Lightbulb,
  MessageCircle,
  Send,
  X,
} from 'lucide-react';

import { API_ENDPOINTS } from '../config/api.js';
import { buildCsrfHeaders } from '../utils/http.js';

const REQUEST_TYPES = [
  { value: 'support', label: 'Поддержка', icon: MessageCircle, color: 'blue' },
  { value: 'bug', label: 'Ошибка', icon: Bug, color: 'red' },
  { value: 'feature', label: 'Предложение', icon: Lightbulb, color: 'yellow' },
  { value: 'question', label: 'Вопрос', icon: HelpCircle, color: 'green' },
];

const COLOR_CLASSES = {
  blue: {
    idle: 'border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    active: 'border-blue-500 bg-blue-500 text-white',
  },
  red: {
    idle: 'border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400',
    active: 'border-red-500 bg-red-500 text-white',
  },
  yellow: {
    idle: 'border-yellow-200 bg-yellow-100 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    active: 'border-yellow-500 bg-yellow-500 text-white',
  },
  green: {
    idle: 'border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400',
    active: 'border-green-500 bg-green-500 text-white',
  },
};

function SupportModal({ isOpen, onClose, onSuccess }) {
  const [message, setMessage] = useState('');
  const [requestType, setRequestType] = useState('support');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const maxMessageLength = 512;

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!message.trim()) {
      setSubmitStatus({
        type: 'error',
        message: 'Пожалуйста, опишите проблему или вопрос.',
      });
      return;
    }

    if (message.trim().length > maxMessageLength) {
      setSubmitStatus({
        type: 'error',
        message: `Максимальная длина обращения ${maxMessageLength} символов.`,
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const headers = await buildCsrfHeaders({
        'Content-Type': 'application/json',
      });
      const response = await fetch(API_ENDPOINTS.SUPPORT_SUBMIT, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          message: message.trim(),
          type: requestType,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setSubmitStatus({
          type: 'error',
          message: data.detail || 'Не удалось отправить обращение.',
        });
        return;
      }

      setSubmitStatus({
        type: 'success',
        message: data.message || 'Обращение отправлено.',
      });
      setMessage('');
      onSuccess?.();
      onClose();
    } catch {
      setSubmitStatus({
        type: 'error',
        message: 'Ошибка соединения с сервером.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="modal-panel w-full max-w-lg rounded-3xl border border-gray-200 bg-white/90 shadow-2xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/90">
        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Поддержка</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            <X className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Тип обращения
            </label>
            <div className="grid grid-cols-2 gap-2">
              {REQUEST_TYPES.map((type) => {
                const Icon = type.icon;
                const palette = COLOR_CLASSES[type.color];
                const isSelected = requestType === type.value;

                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setRequestType(type.value)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      isSelected ? palette.active : palette.idle
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Сообщение
            </label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              maxLength={maxMessageLength}
              required
              placeholder="Опишите проблему, вопрос или предложение..."
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
            />
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {message.length}/{maxMessageLength} символов
            </div>
          </div>

          {submitStatus ? (
            <div
              className={`rounded-xl border p-4 text-sm font-medium ${
                submitStatus.type === 'success'
                  ? 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 dark:border-emerald-800 dark:from-emerald-900/20 dark:to-green-900/20 dark:text-emerald-400'
                  : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
              }`}
            >
              {submitStatus.type === 'success' ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold">Обращение отправлено</div>
                    <div className="mt-0.5 text-xs opacity-90">{submitStatus.message}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold">Ошибка</div>
                    <div className="mt-0.5 text-xs opacity-90">{submitStatus.message}</div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-medium text-white transition-all duration-300 hover:scale-[1.02] hover:bg-emerald-600 hover:shadow-lg disabled:scale-100 disabled:bg-emerald-300 disabled:shadow-none"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Отправка...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Отправить заявку
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-gray-100 px-4 py-3 font-medium text-slate-700 transition-colors hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
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
