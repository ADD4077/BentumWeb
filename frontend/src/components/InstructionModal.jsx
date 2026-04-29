import React from 'react';
import {
  X,
  BookOpen,
  User,
  Lock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

function InstructionModal({ isOpen, onClose, darkMode: _darkMode, onSupportOpen: _onSupportOpen }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="modal-panel custom-scrollbar max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-gray-200 bg-white/95 shadow-2xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/95">
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 p-6 backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/95">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Инструкция по входу
              </h2>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              <X className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-900/20">
            <div className="mb-3 flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Что такое BentumWeb?
              </h3>
            </div>
            <p className="leading-relaxed text-slate-600 dark:text-slate-400">
              BentumWeb — это портал для студентов БНТУ с доступом к расписанию,
              учебным материалам, новостям и личному профилю. Для входа используйте
              ваши университетские данные.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 font-bold text-white">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Найдите свой студенческий билет
              </h3>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20">
                <div className="mb-2 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    Номер студбилета
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Используйте ваш 10-значный номер студенческого билета. Обычно он
                  указан на самом билете или в зачетной книжке.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-4 dark:bg-slate-700/50">
                  <div className="mb-1 text-sm text-slate-500 dark:text-slate-400">
                    Пример формата:
                  </div>
                  <div className="font-mono text-lg text-slate-900 dark:text-white">
                    1070112001
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    10 цифр
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 p-4 dark:bg-slate-700/50">
                  <div className="mb-1 text-sm text-slate-500 dark:text-slate-400">
                    Где найти:
                  </div>
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <li>• На студенческом билете</li>
                    <li>• В зачетной книжке</li>
                    <li>• В деканате</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 font-bold text-white">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Подготовьте пароль
              </h3>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-purple-50 p-4 dark:bg-purple-900/20">
                <div className="mb-2 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                    Стандартный пароль
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Обычно пароль состоит из 7 цифр. Если он был изменен ранее,
                  используйте уже обновленный вариант.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-4 dark:bg-slate-700/50">
                  <div className="mb-1 text-sm text-slate-500 dark:text-slate-400">
                    Пример формата:
                  </div>
                  <div className="font-mono text-lg text-slate-900 dark:text-white">
                    0812020
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    7 цифр
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 p-4 dark:bg-slate-700/50">
                  <div className="mb-1 text-sm text-slate-500 dark:text-slate-400">
                    Если не подходит:
                  </div>
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <li>• Проверьте данные еще раз</li>
                    <li>• Уточните пароль в деканате</li>
                    <li>• При необходимости обратитесь в университет</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 font-bold text-white">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Войдите в систему
              </h3>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-900/20">
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    После входа вы получите:
                  </span>
                </div>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span>Доступ к расписанию</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span>Личный профиль и медиа</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span>Новости и учебные материалы</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span>Уведомления о важных изменениях</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 font-bold text-white">
                ?
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Не получается войти?
              </h3>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-orange-50 p-4 dark:bg-orange-900/20">
                <div className="mb-2 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    Что проверить:
                  </span>
                </div>
                <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                  <li>• Правильно ли введен номер студбилета</li>
                  <li>• Не перепутан ли пароль</li>
                  <li>• Не включена ли неверная раскладка или лишние пробелы</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstructionModal;
