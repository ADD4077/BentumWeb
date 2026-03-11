import React, { useState } from 'react';
import { X, Ban, AlertTriangle, User, Calendar } from 'lucide-react';

const BanModal = ({ isOpen, onClose, user, onBan, darkMode }) => {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('7'); // по умолчанию 7 дней
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Валидация
    if (!reason.trim()) {
      setErrors({ reason: 'Укажите причину бана' });
      setLoading(false);
      return;
    }

    if (!duration || duration < 1) {
      setErrors({ duration: 'Укажите корректную длительность' });
      setLoading(false);
      return;
    }

    try {
      await onBan(user.id, reason.trim(), parseInt(duration));
      onClose();
    } catch (error) {
      console.error('Error banning user:', error);
      setErrors({ general: 'Ошибка при блокировке пользователя' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Блокировка пользователя
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* User Info */}
          <div className="bg-gray-50 dark:bg-slate-700/20 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gray-200 dark:bg-slate-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {user?.fullname || 'Пользователь'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Код: {user?.student_code}
                </p>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Причина блокировки
              </div>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Укажите причину блокировки пользователя..."
              className={`w-full px-4 py-3 border rounded-xl resize-none h-24 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all ${
                errors.reason 
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                  : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800'
              }`}
            />
            {errors.reason && (
              <p className="text-red-500 text-sm mt-1">{errors.reason}</p>
            )}
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                Длительность блокировки
              </div>
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all ${
                errors.duration 
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                  : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800'
              }`}
            >
              <option value="1">1 день</option>
              <option value="3">3 дня</option>
              <option value="7">7 дней</option>
              <option value="14">14 дней</option>
              <option value="30">30 дней</option>
              <option value="90">90 дней</option>
              <option value="365">1 год</option>
              <option value="-1">Навсегда</option>
            </select>
            {errors.duration && (
              <p className="text-red-500 text-sm mt-1">{errors.duration}</p>
            )}
          </div>

          {/* Error */}
          {errors.general && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-red-600 dark:text-red-400 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Блокировка...
                </>
              ) : (
                <>
                  <Ban className="w-5 h-5" />
                  Заблокировать
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BanModal;
