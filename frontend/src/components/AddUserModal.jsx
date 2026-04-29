import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  GraduationCap,
  Shield,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { USER_ROLE_OPTIONS } from '../utils/roles.js';

const FACULTIES = [
  'АТФ',
  'ФГДИЭ',
  'МСФ',
  'МТФ',
  'ФММП',
  'ЭФ',
  'ФИТР',
  'ФТУГ',
  'ИПФ',
  'ФЭС',
  'АФ',
  'СФ',
  'ПСФ',
  'ФТК',
  'ВТФ',
  'СТФ',
  'ФМС',
];

const buildInitialState = () => ({
  fullname: '',
  student_code: '',
  faculty: '',
  role: 'student',
  registration_date: new Date().toISOString().split('T')[0],
  password: '',
  confirm_password: '',
});

function AddUserModal({ isOpen, onClose, onAddUser, darkMode }) {
  const [formData, setFormData] = useState(buildInitialState);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.fullname.trim()) {
      nextErrors.fullname = 'Полное имя обязательно';
    }

    if (!formData.student_code.trim()) {
      nextErrors.student_code = 'Код студента обязателен';
    } else if (!/^\d{10}$/.test(formData.student_code)) {
      nextErrors.student_code = 'Код студента должен содержать 10 цифр';
    }

    if (!formData.faculty) {
      nextErrors.faculty = 'Факультет обязателен';
    }

    if (!formData.role) {
      nextErrors.role = 'Роль обязательна';
    }

    if (!formData.password) {
      nextErrors.password = 'Пароль обязателен';
    } else if (formData.password.length < 7) {
      nextErrors.password = 'Пароль должен содержать минимум 7 символов';
    }

    if (formData.password !== formData.confirm_password) {
      nextErrors.confirm_password = 'Пароли не совпадают';
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
      await onAddUser({
        fullname: formData.fullname,
        student_code: formData.student_code,
        faculty: formData.faculty,
        role: formData.role,
        registration_date: formData.registration_date,
        password: formData.password,
      });

      setFormData(buildInitialState());
      setErrors({});
      onClose();
    } catch {
      setErrors({ submit: 'Ошибка при добавлении пользователя' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(buildInitialState());
    setErrors({});
    onClose();
  };

  const inputClassName = `w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
    darkMode
      ? 'border-slate-600 bg-slate-700 text-white'
      : 'border-gray-300 bg-white text-gray-900'
  }`;

  const modalContent = (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        className={`modal-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border shadow-2xl ${
          darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-300/70 bg-white/96'
        }`}
      >
        <div className={`border-b p-6 ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${darkMode ? 'bg-emerald-900/20' : 'bg-emerald-100'}`}>
                <UserPlus className={`h-5 w-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
              </div>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Добавление пользователя
              </h2>
            </div>

            <button
              onClick={handleClose}
              aria-label="Закрыть модальное окно"
              className={`rounded-lg p-2 transition-colors ${
                darkMode
                  ? 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              }`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {errors.submit ? (
            <div
              className={`rounded-lg border p-4 ${
                darkMode ? 'border-red-800 bg-red-900/20' : 'border-red-200 bg-red-50'
              }`}
            >
              <p className="text-red-600 dark:text-red-400">{errors.submit}</p>
            </div>
          ) : null}

          <section className="space-y-4">
            <h3 className={`flex items-center gap-2 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Основная информация
            </h3>

            <div>
              <label className={`mb-2 block text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                Полное имя *
              </label>
              <input
                type="text"
                name="fullname"
                aria-label="Полное имя *"
                value={formData.fullname}
                onChange={handleInputChange}
                placeholder="Введите полное имя"
                className={`${inputClassName} ${errors.fullname ? 'border-red-500' : ''}`}
              />
              {errors.fullname ? <p className="mt-1 text-sm text-red-500">{errors.fullname}</p> : null}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className={`flex items-center gap-2 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              <GraduationCap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Учебная информация
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={`mb-2 block text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Код студента *
                </label>
                <input
                  type="text"
                  name="student_code"
                  aria-label="Код студента *"
                  value={formData.student_code}
                  onChange={handleInputChange}
                  maxLength={10}
                  placeholder="1234567890"
                  className={`${inputClassName} ${errors.student_code ? 'border-red-500' : ''}`}
                />
                {errors.student_code ? <p className="mt-1 text-sm text-red-500">{errors.student_code}</p> : null}
              </div>

              <div>
                <label className={`mb-2 block text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Факультет *
                </label>
                <select
                  name="faculty"
                  aria-label="Факультет *"
                  value={formData.faculty}
                  onChange={handleInputChange}
                  className={`${inputClassName} ${errors.faculty ? 'border-red-500' : ''}`}
                >
                  <option value="">Выберите факультет</option>
                  {FACULTIES.map((faculty) => (
                    <option key={faculty} value={faculty}>
                      {faculty}
                    </option>
                  ))}
                </select>
                {errors.faculty ? <p className="mt-1 text-sm text-red-500">{errors.faculty}</p> : null}
              </div>

              <div>
                <label className={`mb-2 block text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Роль *
                </label>
                <select
                  name="role"
                  aria-label="Роль *"
                  value={formData.role}
                  onChange={handleInputChange}
                  className={`${inputClassName} ${errors.role ? 'border-red-500' : ''}`}
                >
                  {USER_ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                {errors.role ? <p className="mt-1 text-sm text-red-500">{errors.role}</p> : null}
              </div>

              <div>
                <label className={`mb-2 block text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Дата регистрации
                </label>
                <input
                  type="date"
                  name="registration_date"
                  aria-label="Дата регистрации"
                  value={formData.registration_date}
                  onChange={handleInputChange}
                  className={inputClassName}
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className={`flex items-center gap-2 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Безопасность
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={`mb-2 block text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Пароль *
                </label>
                <input
                  type="password"
                  name="password"
                  aria-label="Пароль *"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Минимум 7 символов"
                  className={`${inputClassName} ${errors.password ? 'border-red-500' : ''}`}
                />
                {errors.password ? <p className="mt-1 text-sm text-red-500">{errors.password}</p> : null}
              </div>

              <div>
                <label className={`mb-2 block text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Подтверждение пароля *
                </label>
                <input
                  type="password"
                  name="confirm_password"
                  aria-label="Подтверждение пароля *"
                  value={formData.confirm_password}
                  onChange={handleInputChange}
                  placeholder="Повторите пароль"
                  className={`${inputClassName} ${errors.confirm_password ? 'border-red-500' : ''}`}
                />
                {errors.confirm_password ? (
                  <p className="mt-1 text-sm text-red-500">{errors.confirm_password}</p>
                ) : null}
              </div>
            </div>
          </section>

          <div className={`flex justify-end gap-3 border-t pt-4 ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className={`rounded-lg px-6 py-2 font-medium transition-colors ${
                darkMode
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Добавление...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Добавить пользователя
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
}

export default AddUserModal;
