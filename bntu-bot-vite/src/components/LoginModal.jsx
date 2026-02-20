// LoginModal компонент - модальное окно входа
import React from 'react';

function LoginModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-slate-700 rounded-3xl w-full max-w-md p-8 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          ✕
        </button>
        
        <div className="text-center mb-8">
          <div className="inline-flex justify-center items-center w-16 h-16 bg-gradient-to-tr from-emerald-400 to-teal-600 rounded-2xl text-white mb-6 shadow-lg shadow-emerald-500/30">
            🔐
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Вход</h2>
          <p className="text-slate-500 text-sm mt-3">Синхронизируйте расписание между устройствами</p>
        </div>

        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Номер студенческого</label>
            <input 
              type="text" 
              className="w-full px-5 py-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:text-white transition-all font-medium"
              placeholder="10701120"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Пароль</label>
            <input 
              type="password" 
              className="w-full px-5 py-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:text-white transition-all font-medium"
              placeholder="••••••••"
            />
          </div>
          
          <button className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 mt-2">
            Войти в систему
          </button>
        </form>

        <div className="mt-8 text-center text-sm">
          <span className="text-slate-500">Нет аккаунта? </span>
          <a href="#" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">Создать аккаунт</a>
        </div>
      </div>
    </div>
  );
}

export default LoginModal;
