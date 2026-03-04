import React from 'react';
import { X, BookOpen, User, Lock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

function InstructionModal({ isOpen, onClose, darkMode, onSupportOpen }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-gray-200 dark:border-slate-700 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="sticky top-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-gray-200 dark:border-slate-700 p-6 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Инструкция по входу
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              <X className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Overview */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-6 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Что такое BentumWeb?
              </h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              BentumWeb — это официальный портал для студентов БНТУ с доступом к расписанию, 
              учебным материалам, новостям и многому другому. Для входа используйте ваши 
              университетские данные.
            </p>
          </div>

          {/* Step 1 */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Найдите свои данные
              </h3>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="font-semibold text-blue-600 dark:text-blue-400">Студенческий билет</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Ваш 10-значный номер студенческого билета находится на вашем студенческом билете 
                  или в зачетной книжке. (Чёрный код)
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Пример формата:</div>
                  <div className="font-mono text-lg text-slate-900 dark:text-white">1070112001</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">10 цифр</div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Где найти:</div>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <li>• На студенческом билете</li>
                    <li>• В зачетной книжке</li>
                    <li>• В деканате</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Пароль от системы
              </h3>
            </div>
            
            <div className="space-y-4">
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span className="font-semibold text-purple-600 dark:text-purple-400">Стандартный пароль</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  По умолчанию пароль состоит из 7 цифр. (Красный код)
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Пример формата:</div>
                  <div className="font-mono text-lg text-slate-900 dark:text-white">0812020</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">7 цифр</div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Где найти:</div>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <li>• На студенческом билете (Красный код)</li>
                    <li>• В деканате</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Вход в систему
              </h3>
            </div>
            
            <div className="space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Проверка данных</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Введите ваши данные в форму входа. Система автоматически проверит их 
                  и предоставит доступ к вашему личному кабинету.
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">После входа вы получите:</div>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Доступ к личному расписанию</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Уведомления о парах</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Доступ к учебным материалам</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Новости и объявления</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                ?
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Не получается войти?
              </h3>
            </div>
            
            <div className="space-y-4">
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  <span className="font-semibold text-orange-600 dark:text-orange-400">Что делать:</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Если у вас не получается войти в систему, попробуйте следующие шаги:
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Проверьте:</div>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <li>• Правильность данных</li>
                    <li>• Верность пароля</li>
                  </ul>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Где могут помочь:</div>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <li>• Поддержка сайта</li>
                    <li>• Одногруппники</li>
                  </ul>
                </div>
              </div>
              
              <div className="text-center">
                <button 
                  onClick={onSupportOpen}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Связаться с поддержкой</span>
                </button>
              </div>
            </div>
          </div>

          {/* Success */}
          <div className="text-center bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-slate-700 dark:to-slate-800 rounded-2xl p-6 text-white dark:text-slate-100 border border-emerald-200 dark:border-slate-600">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-100 dark:text-emerald-400" />
            <h3 className="text-xl font-bold mb-2 text-white dark:text-slate-100">Готовы начать!</h3>
            <p className="text-emerald-50 dark:text-slate-300 mb-4">
              Теперь вы знаете как войти в систему. BentumWeb ждет вас!
            </p>
            <button 
              onClick={onClose}
              className="px-6 py-3 bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold hover:bg-emerald-50 dark:hover:bg-slate-500 transition-colors"
            >
              Понятно, спасибо!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstructionModal;
