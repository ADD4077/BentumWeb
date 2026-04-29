import React from 'react';
import { useModal } from '../../contexts/ModalContext.jsx';

export const SortModal = () => {
  const { isSortModalOpen, setIsSortModalOpen, literatureSortBy, setLiteratureSortBy } = useModal();

  if (!isSortModalOpen) return null;

  const sortOptions = [
    { id: 'default', name: 'По умолчанию', icon: '📋' },
    { id: 'title_asc', name: 'По алфавиту (А-Я)', icon: '🔤' },
    { id: 'title_desc', name: 'По алфавиту (Я-А)', icon: '🔤' },
    { id: 'year_desc', name: 'По году (новые)', icon: '📅' },
    { id: 'year_asc', name: 'По году (старые)', icon: '📅' },
    { id: 'category_asc', name: 'По категории (А-Я)', icon: '📁' },
    { id: 'category_desc', name: 'По категории (Я-А)', icon: '📁' },
    { id: 'size_desc', name: 'По размеру (большие)', icon: '📦' },
    { id: 'size_asc', name: 'По размеру (маленькие)', icon: '📦' }
  ];

  const currentOption = sortOptions.find(opt => opt.id === literatureSortBy) || sortOptions[0];

  return (
    <div className="modal-backdrop fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="modal-panel bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-gray-200 dark:border-slate-700 rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/20 dark:border-slate-700/50">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            Сортировка
          </h2>
          <button
            onClick={() => setIsSortModalOpen(false)}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/10 dark:hover:bg-slate-700/10 transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="space-y-3">
            {sortOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  setLiteratureSortBy(option.id);
                  setIsSortModalOpen(false);
                }}
                className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 text-left hover:scale-105 flex items-center gap-3 ${
                  literatureSortBy === option.id
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : 'border-gray-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="text-xl">{option.icon}</span>
                <div className="flex-1">
                  <div className="font-medium">{option.name}</div>
                </div>
                {literatureSortBy === option.id && (
                  <div className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between p-6 border-t border-white/20 dark:border-slate-700/50">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Текущая: <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {currentOption.name}
            </span>
          </div>
          <button
            onClick={() => setIsSortModalOpen(false)}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-medium transition-all duration-300 hover:scale-105"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default SortModal;
