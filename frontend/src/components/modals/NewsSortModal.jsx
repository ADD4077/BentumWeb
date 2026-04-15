import React from 'react';
import { useModal } from '../../contexts/ModalContext.jsx';
import { useNews } from '../../hooks/useNews.js';

export const NewsSortModal = () => {
  const { isNewsSortModalOpen, setIsNewsSortModalOpen } = useModal();
  const { newsSortBy, setNewsSortBy } = useNews('news');

  if (!isNewsSortModalOpen) return null;

  const sortOptions = [
    { id: 'date_desc', name: 'Свежие', icon: '📅' },
    { id: 'date_asc', name: 'Старые', icon: '📅' },
    { id: 'title_asc', name: 'По алфавиту (А-Я)', icon: '🔤' },
    { id: 'title_desc', name: 'По алфавиту (Я-А)', icon: '🔤' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-gray-200 dark:border-slate-700 rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/20 dark:border-slate-700/50">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            Сортировка
          </h2>
          <button
            onClick={() => setIsNewsSortModalOpen(false)}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/10 dark:hover:bg-slate-700/10 transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-3">
            {sortOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  setNewsSortBy(option.id);
                  setIsNewsSortModalOpen(false);
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 ${
                  newsSortBy === option.id
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-white/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-transparent hover:border-gray-200 dark:hover:border-slate-600'
                }`}
              >
                <span className="text-2xl">{option.icon}</span>
                <span className="font-medium">{option.name}</span>
                {newsSortBy === option.id && (
                  <svg className="w-5 h-5 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
