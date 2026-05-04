import React, { useState } from 'react';
import { LogIn } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext.jsx';

function LoginModal({ isOpen, onClose, onInstructionOpen }) {
  const [studentCode, setStudentCode] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  if (!isOpen) return null;

  const validateForm = () => {
    const nextErrors = {};

    if (!studentCode) {
      nextErrors.studentCode = 'Это поле обязательно';
    } else if (!/^\d+$/.test(studentCode)) {
      nextErrors.studentCode = 'Некорректные данные';
    } else if (studentCode.length !== 10) {
      nextErrors.studentCode = 'Не менее 10 цифр';
    }

    if (!password) {
      nextErrors.password = 'Это поле обязательно';
    } else if (password.length < 7) {
      nextErrors.password = 'Минимум 7 символов';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(studentCode, password);
      if (result.success) {
        onClose();
      } else {
        setErrors({ general: result.error });
      }
    } catch {
      setErrors({ general: 'Ошибка соединения с сервером' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentCodeChange = (event) => {
    const value = event.target.value;
    if (/^\d*$/.test(value)) {
      setStudentCode(value);
      if (errors.studentCode) {
        setErrors((current) => ({ ...current, studentCode: '' }));
      }
    }
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
    if (errors.password) {
      setErrors((current) => ({ ...current, password: '' }));
    }
  };

  const inputClassName = (hasError) => `w-full rounded-2xl border px-5 py-4 text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition-all duration-300 focus:outline-none focus:ring-2 dark:text-white ${
    hasError
      ? 'border-red-500 focus:ring-red-500 bg-white dark:bg-slate-800/70'
      : 'border-slate-300/70 bg-white/90 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800/70'
  }`;

  return (
    <div className="modal-backdrop fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="modal-panel w-full max-w-md rounded-3xl border border-slate-300/70 bg-white/96 p-8 shadow-2xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/90">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
        >
          ✕
        </button>

        <div className="mb-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-xl shadow-emerald-500/25">
            <LogIn className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Вход
          </h2>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            Войдите в личный кабинет, чтобы получить доступ к функциям платформы.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Номер студенческого
            </label>
            <input
              type="text"
              value={studentCode}
              onChange={handleStudentCodeChange}
              className={inputClassName(Boolean(errors.studentCode))}
              placeholder="1070112023"
              maxLength={10}
            />
            {errors.studentCode ? (
              <p className="mt-2 ml-1 text-sm text-red-500">{errors.studentCode}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={handlePasswordChange}
              className={inputClassName(Boolean(errors.password))}
              placeholder="Минимум 7 символов"
            />
            {errors.password ? (
              <p className="mt-2 ml-1 text-sm text-red-500">{errors.password}</p>
            ) : null}
          </div>

          {errors.general ? (
            <div className="rounded-2xl border border-red-200 bg-red-50/90 p-3 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 py-4 text-lg font-bold text-white shadow-xl shadow-emerald-500/25 transition-all duration-300 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-400 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Вход...
              </>
            ) : (
              'Войти в систему'
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm">
          <span className="text-slate-500 dark:text-slate-400">Как войти? </span>
          <button
            onClick={onInstructionOpen}
            className="font-bold text-emerald-600 transition-colors hover:text-emerald-700 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            Инструкция
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginModal;
