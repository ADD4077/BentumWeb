import React, { useState } from 'react';
import { UserPlus, X, User, GraduationCap, Building, Calendar, Shield } from 'lucide-react';

function AddUserModal({ isOpen, onClose, onAddUser, darkMode }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    student_code: '',
    faculty: '',
    registration_date: new Date().toISOString().split('T')[0],
    password: '',
    confirm_password: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const faculties = [
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
    'ФМС'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Очищаем ошибку при изменении поля
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'Имя обязательно';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Фамилия обязательна';
    }

    if (!formData.student_code.trim()) {
      newErrors.student_code = 'Код студента обязателен';
    } else if (!/^\d{10}$/.test(formData.student_code)) {
      newErrors.student_code = 'Код студента должен содержать 10 цифр';
    }

    if (!formData.faculty) {
      newErrors.faculty = 'Факультет обязателен';
    }

    if (!formData.password) {
      newErrors.password = 'Пароль обязателен';
    } else if (formData.password.length < 7) {
      newErrors.password = 'Пароль должен содержать минимум 7 символов';
    }

    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Пароли не совпадают';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const userData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        student_code: formData.student_code,
        faculty: formData.faculty,
        registration_date: formData.registration_date,
        password: formData.password
      };

      await onAddUser(userData);
      
      // Сброс формы после успешного добавления
      setFormData({
        first_name: '',
        last_name: '',
        student_code: '',
        faculty: '',
        registration_date: new Date().toISOString().split('T')[0],
        password: '',
        confirm_password: ''
      });
      
      onClose();
    } catch (error) {
      setErrors({ submit: 'Ошибка при добавлении пользователя' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      first_name: '',
      last_name: '',
      student_code: '',
      faculty: '',
      registration_date: new Date().toISOString().split('T')[0],
      password: '',
      confirm_password: ''
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
        darkMode ? 'bg-slate-800' : 'bg-white'
      } border ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
        
        {/* Заголовок */}
        <div className={`p-6 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-emerald-900/20' : 'bg-emerald-100'}`}>
                <UserPlus className={`w-5 h-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
              </div>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Добавление пользователя
              </h2>
            </div>
            <button
              onClick={handleClose}
              className={`p-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'hover:bg-slate-700 text-slate-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.submit && (
            <div className={`p-4 rounded-lg ${
              darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'
            } border`}>
              <p className="text-red-600 dark:text-red-400">{errors.submit}</p>
            </div>
          )}

          {/* Основная информация */}
          <div className="space-y-4">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
              <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Основная информация
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Имя *
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.first_name ? 'border-red-500' : ''
                  }`}
                  placeholder="Введите имя"
                />
                {errors.first_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Фамилия *
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.last_name ? 'border-red-500' : ''
                  }`}
                  placeholder="Введите фамилию"
                />
                {errors.last_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.last_name}</p>
                )}
              </div>
            </div>
          </div>

          {/* Учебная информация */}
          <div className="space-y-4">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
              <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Учебная информация
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Код студента *
                </label>
                <input
                  type="text"
                  name="student_code"
                  value={formData.student_code}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.student_code ? 'border-red-500' : ''
                  }`}
                  placeholder="1234567890"
                  maxLength="10"
                />
                {errors.student_code && (
                  <p className="text-red-500 text-sm mt-1">{errors.student_code}</p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Факультет *
                </label>
                <select
                  name="faculty"
                  value={formData.faculty}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.faculty ? 'border-red-500' : ''
                  }`}
                >
                  <option value="">Выберите факультет</option>
                  {faculties.map(faculty => (
                    <option key={faculty} value={faculty}>{faculty}</option>
                  ))}
                </select>
                {errors.faculty && (
                  <p className="text-red-500 text-sm mt-1">{errors.faculty}</p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Дата регистрации
                </label>
                <input
                  type="date"
                  name="registration_date"
                  value={formData.registration_date}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                />
              </div>
            </div>
          </div>

          {/* Пароль */}
          <div className="space-y-4">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
              <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Безопасность
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Пароль *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.password ? 'border-red-500' : ''
                  }`}
                  placeholder="Минимум 7 символов"
                />
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Подтверждение пароля *
                </label>
                <input
                  type="password"
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.confirm_password ? 'border-red-500' : ''
                  }`}
                  placeholder="Повторите пароль"
                />
                {errors.confirm_password && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirm_password}</p>
                )}
              </div>
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                darkMode 
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Добавление...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Добавить пользователя
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddUserModal;
