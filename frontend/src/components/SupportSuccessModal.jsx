import React from 'react';
import { CheckCircle, X } from 'lucide-react';

function SupportSuccessModal({ isOpen, onClose, darkMode: _darkMode }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop fixed inset-0 bg-black/50 backdrop-blur-sm z-[160] flex items-center justify-center p-4">
      <div className="modal-panel bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-8 relative">
        {/* Кнопка закрытия */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
        >
          <X className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>

        {/* Контент */}
        <div className="text-center">
          {/* Иконка успеха */}
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>

          {/* Заголовок */}
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            Заявка отправлена!
          </h2>

          {/* Описание */}
          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
            Ваша заявка успешно отправлена в службу поддержки. 
            Мы свяжемся с вами в ближайшее время.
          </p>

          {/* Кнопка */}
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
          >
            Отлично
          </button>
        </div>
      </div>
    </div>
  );
}

export default SupportSuccessModal;
