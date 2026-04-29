import React from 'react';
import { X, CheckCircle, Calendar, AlertTriangle, User } from 'lucide-react';

const formatDuration = (duration, durationLabel) => {
  if (durationLabel) {
    return durationLabel;
  }

  const numericDuration = Number(duration);
  if (numericDuration === -1) return 'Навсегда';
  if (numericDuration === 1) return '1 день';
  if (numericDuration === 7) return '7 дней';
  if (numericDuration === 30) return '30 дней';
  if (numericDuration === 365) return '1 год';
  return `${numericDuration} дней`;
};

const BanSuccessModal = ({ isOpen, onClose, user, reason, duration, durationLabel, darkMode: _darkMode }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="modal-panel w-full max-w-md rounded-3xl bg-white shadow-2xl dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Пользователь заблокирован
              </h2>
              <p className="text-sm text-green-600 dark:text-green-400">
                Блокировка выполнена успешно
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-700/20">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-slate-600">
                <User className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  {user?.fullname || 'Пользователь'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Код: {user?.student_code}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="mb-1 text-sm font-medium text-red-600 dark:text-red-400">
                    Причина блокировки
                  </p>
                  <p className="text-red-700 dark:text-red-300">{reason}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
                <div>
                  <p className="mb-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                    Длительность блокировки
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    {formatDuration(duration, durationLabel)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white transition-all hover:bg-emerald-500"
            >
              <CheckCircle className="h-5 w-5" />
              Понятно
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BanSuccessModal;
