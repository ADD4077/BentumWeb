import React from 'react';
import { X, CheckCircle, Ban, Calendar, AlertTriangle, User } from 'lucide-react';

const BanSuccessModal = ({ isOpen, onClose, user, reason, duration, darkMode }) => {
  if (!isOpen) return null;

  const formatDuration = (days) => {
    if (days === -1) return 'навсегда';
    if (days === 1) return '1 день';
    if (days === 7) return '7 дней';
    if (days === 30) return '30 дней';
    if (days === 365) return '1 год';
    return `${days} дней`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
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
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* User Info */}
          <div className="bg-gray-50 dark:bg-slate-700/20 border border-gray-200 dark:border-slate-700 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 dark:bg-slate-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-gray-500 dark:text-gray-400" />
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

          {/* Ban Details */}
          <div className="space-y-4">
            {/* Reason */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                    Причина блокировки
                  </p>
                  <p className="text-red-700 dark:text-red-300">
                    {reason}
                  </p>
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                    Длительность блокировки
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    {formatDuration(parseInt(duration))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="pt-4">
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Понятно
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BanSuccessModal;
