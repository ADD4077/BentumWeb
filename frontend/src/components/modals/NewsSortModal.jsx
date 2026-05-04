import React from 'react';
import { useModal } from '../../contexts/ModalContext.jsx';

export const NewsSortModal = () => {
  const { isNewsSortModalOpen, setIsNewsSortModalOpen, newsSortBy, setNewsSortBy } = useModal();

  if (!isNewsSortModalOpen) return null;

  const sortOptions = [
    { id: 'date_desc', name: 'Свежие', icon: '🕒' },
    { id: 'date_asc', name: 'Старые', icon: '🕒' },
    { id: 'title_asc', name: 'По алфавиту (А-Я)', icon: '🔤' },
    { id: 'title_desc', name: 'По алфавиту (Я-А)', icon: '🔤' },
  ];

  return (
    <div className="modal-backdrop fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="modal-panel flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white/90 shadow-2xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/90">
        <div className="flex items-center justify-between border-b border-white/20 p-6 dark:border-slate-700/50">
          <h2 className="flex items-center gap-3 text-xl font-bold text-slate-900 dark:text-white">
            <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            Сортировка
          </h2>
          <button
            onClick={() => setIsNewsSortModalOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-400 transition-all duration-300 hover:bg-white/10 hover:text-slate-600 dark:hover:bg-slate-700/10 dark:hover:text-slate-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {sortOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  setNewsSortBy(option.id);
                  setIsNewsSortModalOpen(false);
                }}
                className={`flex w-full items-center gap-4 rounded-2xl p-4 transition-all duration-200 ${
                  newsSortBy === option.id
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'border border-transparent bg-white/50 text-slate-700 hover:border-gray-200 hover:bg-white/80 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/80'
                }`}
              >
                <span className="text-2xl">{option.icon}</span>
                <span className="font-medium">{option.name}</span>
                {newsSortBy === option.id && (
                  <svg className="ml-auto h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsSortModal;
