import React from 'react';
import { Filter, Search } from 'lucide-react';
import { useModal } from '../../contexts/ModalContext.jsx';
import { useLiterature } from '../../hooks/useLiterature.js';

export const CategoryModal = () => {
  const { isCategoryModalOpen, setIsCategoryModalOpen, selectedCategories, setSelectedCategories } = useModal();
  const literature = useLiterature('literature', '', { selectedCategories, setSelectedCategories });

  if (!isCategoryModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-gray-200 dark:border-slate-700 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/20 dark:border-slate-700/50">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Filter className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Выбор категории
          </h2>
          <button
            onClick={() => setIsCategoryModalOpen(false)}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/10 dark:hover:bg-slate-700/10 transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 pt-3 pb-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 opacity-60" />
            <input
              type="text"
              placeholder="Быстрый поиск категории..."
              value={literature.categorySearchQuery}
              onChange={(e) => literature.setCategorySearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="px-6 pt-1 pb-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {literature.categories
              .filter(cat => cat.name.toLowerCase().includes(literature.categorySearchQuery.toLowerCase()))
              .map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    if (category.id === 'all') {
                      setSelectedCategories(['all']);
                    } else {
                      const newSelected = selectedCategories.includes('all')
                        ? [category.id]
                        : selectedCategories.includes(category.id)
                          ? selectedCategories.filter(id => id !== category.id)
                          : [...selectedCategories, category.id];
                      setSelectedCategories(newSelected.length > 0 ? newSelected : ['all']);
                    }
                  }}
                  className={`p-4 rounded-2xl border-2 transition-all duration-200 text-left hover:scale-105 relative ${
                    selectedCategories.includes(category.id)
                      ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      : 'border-white/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/40 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {selectedCategories.includes(category.id) && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-white text-emerald-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <div className="w-full">
                    <div className="font-medium text-slate-900 dark:text-white break-words text-center">{category.name}</div>
                  </div>
                </button>
              ))}
          </div>
        </div>
        <div className="flex items-center justify-between p-6 border-t border-white/20 dark:border-slate-700/50 mb-0">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Выбрано: <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {selectedCategories.includes('all')
                ? 'Все категории'
                : `${selectedCategories.length} ${selectedCategories.length === 1 ? 'категория' : selectedCategories.length < 5 ? 'категории' : 'категорий'}`}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setSelectedCategories(['all']);
                literature.setCategorySearchQuery('');
              }}
              className="px-6 py-3 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl font-medium transition-all duration-300"
            >
              Сбросить
            </button>
            <button
              onClick={() => {
                setIsCategoryModalOpen(false);
                literature.setLiteraturePage(1);
                literature.fetchLiterature(1);
              }}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-medium transition-all duration-300 hover:scale-105"
            >
              Применить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryModal;
