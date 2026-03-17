import React, { useState } from 'react';
import { X, ShieldCheck, AlertTriangle, User, CheckCircle } from 'lucide-react';

const UnbanModal = ({ isOpen, onClose, user, onUnban, darkMode }) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onUnban(user.id);
      onClose();
    } catch (error) {
      // Ошибка разбана
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[160] flex items-center justify-center p-4">
      <div className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden ${
        darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
      }`}>
        {/* Header */}
        <div className="relative p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
              }`}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Разблокировать пользователя
                </h2>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Снять блокировку с аккаунта
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                darkMode 
                  ? 'hover:bg-slate-700 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Информация о пользователе */}
          <div className={`mb-6 p-4 rounded-2xl ${
            darkMode ? 'bg-slate-700/50 border border-slate-600' : 'bg-gray-50 border border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                darkMode ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-600'
              }`}>
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className={`font-medium ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {user?.fullname || 'Неизвестный пользователь'}
                </p>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Код: {user?.student_code || 'Не указан'}
                </p>
              </div>
            </div>
          </div>

          {/* Предупреждение */}
          <div className={`mb-6 p-4 rounded-2xl ${
            darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                darkMode ? 'text-blue-400' : 'text-blue-600'
              }`} />
              <div>
                <h3 className={`font-semibold mb-1 ${
                  darkMode ? 'text-blue-300' : 'text-blue-800'
                }`}>
                  Внимание
                </h3>
                <p className={`text-sm ${
                  darkMode ? 'text-blue-200' : 'text-blue-700'
                }`}>
                  Вы собираетесь разблокировать этого пользователя. После разблокировки он сможет снова войти в систему и использовать все функции.
                </p>
              </div>
            </div>
          </div>

          {/* Форма */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Кнопки */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 px-6 py-3 rounded-2xl font-medium transition-colors ${
                  darkMode
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 px-6 py-3 rounded-2xl font-medium transition-all flex items-center justify-center gap-2 ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/25'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Разблокировка...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Разблокировать
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UnbanModal;
