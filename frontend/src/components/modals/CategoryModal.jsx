import React from 'react';
import { Filter, Search } from 'lucide-react';
import { useModal } from '../../contexts/ModalContext.jsx';
import { useLiterature } from '../../hooks/useLiterature.js';

export const CategoryModal = () => {
  const { isCategoryModalOpen, setIsCategoryModalOpen, selectedCategories, setSelectedCategories } = useModal();
  const literature = useLiterature('literature', '', { selectedCategories, setSelectedCategories });
  const filteredCategories = literature.categories.filter((category) =>
    category.name.toLowerCase().includes(literature.categorySearchQuery.toLowerCase()),
  );

  if (!isCategoryModalOpen) return null;

  return (
    <div className="modal-backdrop fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="modal-panel bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-gray-200 dark:border-slate-700 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
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
          <div className="mb-4 flex flex-wrap gap-2">
            {selectedCategories.includes('all') ? (
              <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-300">
                Все категории
              </span>
            ) : (
              selectedCategories.map((categoryId) => {
                const category = literature.categories.find((item) => item.id === categoryId);
                if (!category) {
                  return null;
                }

                return (
                  <span
                    key={category.id}
                    className="inline-flex items-center rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-300"
                  >
                    {category.name}
                  </span>
                );
              })
            )}
          </div>

          <div className="space-y-2">
            {filteredCategories.map((category) => {
              const isSelected = selectedCategories.includes(category.id);

              return (
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
                  className={`flex w-full items-center gap-4 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
                    isSelected
                      ? 'border-emerald-400 bg-emerald-500/12 shadow-lg shadow-emerald-950/10'
                      : 'border-white/50 bg-white/70 hover:border-emerald-300 hover:bg-emerald-50/80 dark:border-slate-700/50 dark:bg-slate-800/40 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-500 text-white'
                        : 'border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-500'
                    }`}
                  >
                    {isSelected ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <Filter className="h-4 w-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-semibold leading-5 ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                      {category.name}
                    </div>
                    {typeof category.count === 'number' ? (
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {category.count} материалов
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}

            {filteredCategories.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300/80 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Ничего не найдено по этому запросу
              </div>
            ) : null}
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
