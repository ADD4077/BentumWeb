// LoginModal компонент - модальное окно входа
import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

function LoginModal({ isOpen, onClose }) {
  const [studentCode, setStudentCode] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors = {};

    // Валидация студенческого кода
    if (!studentCode) {
      newErrors.studentCode = 'Это поле обязательно';
    } else if (!/^\d+$/.test(studentCode)) {
      newErrors.studentCode = 'Некорректные данные';
    } else if (studentCode.length !== 10) {
      newErrors.studentCode = 'Не менее 10 цифр';
    }

    // Валидация пароля
    if (!password) {
      newErrors.password = 'Это поле обязательно';
    } else if (!/^\d+$/.test(password)) {
      newErrors.password = 'Некорректные данные';
    } else if (password.length !== 7) {
      newErrors.password = 'Не менее 7 цифр';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    console.log('LoginModal: handleSubmit called');
    e.preventDefault();
    console.log('LoginModal: form validation starting');
    if (validateForm()) {
      console.log('LoginModal: validation passed');
      setIsLoading(true);
      try {
        console.log('Attempting login with:', { studentCode, password: '***' });
        const result = await login(studentCode, password);
        console.log('Login result:', result);
        if (result.success) {
          console.log('LoginModal: login successful, closing modal');
          onClose();
        } else {
          console.log('LoginModal: login failed:', result.error);
          setErrors({ general: result.error });
        }
      } catch (error) {
        console.error('Login error:', error);
        setErrors({ general: 'Ошибка соединения с сервером' });
      } finally {
        setIsLoading(false);
      }
    } else {
      console.log('LoginModal: validation failed');
    }
  };

  const handleStudentCodeChange = (e) => {
    const value = e.target.value;
    // Разрешаем только цифры
    if (/^\d*$/.test(value)) {
      setStudentCode(value);
      // Очищаем ошибку при вводе
      if (errors.studentCode) {
        setErrors({ ...errors, studentCode: '' });
      }
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    // Разрешаем только цифры
    if (/^\d*$/.test(value)) {
      setPassword(value);
      // Очищаем ошибку при вводе
      if (errors.password) {
        setErrors({ ...errors, password: '' });
      }
    }
  };
  
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
          <div className="inline-flex justify-center items-center w-16 h-16 bg-gradient-to-tr from-emerald-400 to-teal-600 rounded-3xl text-white mb-6 shadow-lg shadow-emerald-500/30">
            <LogIn className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Вход</h2>
          <p className="text-slate-500 text-sm mt-3">Войдите в личный кабинет, чтобы получить доступ к функционалу</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Номер студенческого</label>
            <input 
              type="text" 
              value={studentCode}
              onChange={handleStudentCodeChange}
              className={`w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:text-white transition-all font-medium ${
                errors.studentCode 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-200 dark:border-slate-700'
              }`}
              placeholder="10701120"
              maxLength={10}
            />
            {errors.studentCode && (
              <p className="text-red-500 text-sm mt-2 ml-1">{errors.studentCode}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Пароль</label>
            <input 
              type="password" 
              value={password}
              onChange={handlePasswordChange}
              className={`w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:text-white transition-all font-medium ${
                errors.password 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-200 dark:border-slate-700'
              }`}
              placeholder="••••••••"
              maxLength={7}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-2 ml-1">{errors.password}</p>
            )}
          </div>
          
          {errors.general && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-3">
              <p className="text-red-600 dark:text-red-400 text-sm">{errors.general}</p>
            </div>
          )}
          
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Вход...
              </>
            ) : (
              'Войти в систему'
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm">
          <span className="text-slate-500">Как войти? </span>
          <a href="#" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">Инструкция</a>
        </div>
      </div>
    </div>
  );
}

export default LoginModal;
