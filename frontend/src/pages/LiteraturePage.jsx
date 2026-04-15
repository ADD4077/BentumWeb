import React, { useState, useEffect } from 'react';
import { Search, Filter, BookOpen, Download, ExternalLink } from 'lucide-react';
import { useLiterature } from '../hooks/useLiterature.js';
import { useModal } from '../contexts/ModalContext.jsx';

/**
 * Страница учебной литературы
 */
export const LiteraturePage = ({ searchQuery, setSearchQuery, activeTab }) => {
  const { 
    setIsCategoryModalOpen, setIsSortModalOpen,
    literatureSortBy, setLiteratureSortBy,
    selectedCategories, setSelectedCategories
  } = useModal();
  
  const {
    sortBy,
    setSortBy,
    literatureItems,
    literatureLoading,
    literatureTotal,
    literaturePage,
    setLiteraturePage,
    literatureMaxPage,
    categories,
    categorySearchQuery,
    setCategorySearchQuery
  } = useLiterature(activeTab, searchQuery, {
    sortBy: literatureSortBy,
    setSortBy: setLiteratureSortBy,
    selectedCategories,
    setSelectedCategories
  });
  // Локальный state для input пагинации (чтобы не дергался при быстром вводе)
  const [pageInputValue, setPageInputValue] = useState(literaturePage.toString());

  // Синхронизация локального state с prop при изменении извне
  useEffect(() => {
    setPageInputValue(literaturePage.toString());
  }, [literaturePage]);

  const handlePageInputChange = (e) => {
    // Просто обновляем локальный state, не трогаем родительский
    setPageInputValue(e.target.value);
  };

  const handlePageInputBlur = () => {
    const page = parseInt(pageInputValue);
    if (page >= 1 && page <= literatureMaxPage) {
      setLiteraturePage(page);
    } else {
      // Возвращаем предыдущее значение если некорректное
      setPageInputValue(literaturePage.toString());
    }
  };

  const handlePageInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      const page = parseInt(pageInputValue);
      if (page >= 1 && page <= literatureMaxPage) {
        setLiteraturePage(page);
      } else {
        setPageInputValue(literaturePage.toString());
      }
    }
  };

  const sortOptions = [
    { id: 'title_asc', name: 'А-Я' },
    { id: 'title_desc', name: 'Я-А' },
    { id: 'year_desc', name: 'новые' },
    { id: 'year_asc', name: 'старые' },
    { id: 'category_asc', name: 'категория А-Я' },
    { id: 'category_desc', name: 'категория Я-А' },
    { id: 'size_desc', name: 'большие' },
    { id: 'size_asc', name: 'маленькие' }
  ];

  const getSortName = (id) => {
    const option = sortOptions.find(opt => opt.id === id);
    return option ? option.name : id;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="text-center mb-8 sm:mb-10">
        <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 text-slate-900 dark:text-white tracking-tight">Литература</h2>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto px-4">
          Учебные материалы, пособия и методические указания для студентов БНТУ
        </p>
      </div>
      
      {/* Поиск и фильтры */}
      <div className="flex items-center gap-2 mb-6 sm:mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            placeholder="Поиск по названию, автору или описанию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 sm:pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl sm:rounded-2xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base"
          />
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl sm:rounded-2xl text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex-shrink-0"
            title="Фильтр категорий"
          >
            <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={() => {
              setLiteratureSortBy(sortBy);
              setIsSortModalOpen(true);
            }}
            className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl sm:rounded-2xl text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex-shrink-0"
            title="Сортировка"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Счётчик и активные фильтры */}
      <div className="mb-4 sm:mb-6">
        <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-2 sm:mb-3 px-1">
          Найдено материалов: <span className="font-medium text-slate-900 dark:text-white">{literatureTotal}</span>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {searchQuery && (
            <div className="inline-flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-full text-xs sm:text-sm font-medium">
              <Search className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="truncate max-w-[100px] sm:max-w-none">{searchQuery}</span>
              <button
                onClick={() => setSearchQuery('')}
                className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors flex-shrink-0"
              >
                <svg className="w-2 h-2 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          {selectedCategories.length > 0 && !selectedCategories.includes('all') && (
            <div className="inline-flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs sm:text-sm font-medium">
              <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{selectedCategories.length} {selectedCategories.length === 1 ? 'категория' : selectedCategories.length < 5 ? 'категории' : 'категорий'}</span>
              <button
                onClick={() => {
                  setSelectedCategories(['all']);
                  setLiteraturePage(1);
                }}
                className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors flex-shrink-0"
              >
                <svg className="w-2 h-2 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          {sortBy !== 'default' && (
            <div className="inline-flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full text-xs sm:text-sm font-medium">
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <span className="truncate max-w-[80px] sm:max-w-none">{getSortName(sortBy)}</span>
              <button
                onClick={() => {
                  setSortBy('default');
                  setLiteraturePage(1);
                }}
                className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 transition-colors flex-shrink-0"
              >
                <svg className="w-2 h-2 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          {(searchQuery || (selectedCategories.length > 0 && !selectedCategories.includes('all')) || sortBy !== 'default') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategories(['all']);
                setSortBy('default');
                setLiteraturePage(1);
              }}
              className="px-2 sm:px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs sm:text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Сбросить все
            </button>
          )}
        </div>
      </div>

      {/* Список материалов */}
      {literatureItems.length > 0 ? (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {literatureItems.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between h-full"
              >
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 dark:bg-emerald-900/20 rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded-lg mb-1">
                        {item.category || 'Без категории'}
                      </span>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {item.type === 'textbook' ? 'Учебник' : 'Пособие'} • {item.year}
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white mb-2 line-clamp-2">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1">
                  {item.author}
                </p>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-500 mb-3 sm:mb-4 line-clamp-2 sm:line-clamp-3">
                  {item.description}
                </p>
                <div className="flex gap-2">
                  {(item.downloadUrl || item.download_url) ? (
                    <a
                      href={item.downloadUrl || item.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="flex-1 flex items-center justify-center gap-1 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-colors"
                    >
                      <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                      Скачать
                      {(item.downloadSize || item.size) && (
                        <span className="text-sm text-slate-200 dark:text-slate-300 ml-1">({item.downloadSize || item.size})</span>
                      )}
                    </a>
                  ) : (
                    <button
                      disabled
                      className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-gray-200 text-gray-500 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium"
                    >
                      <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Скачать</span>
                      <span className="sm:hidden">↓</span>
                    </button>
                  )}
                  {(item.downloadUrl || item.download_url) ? (
                    <a
                      href={item.downloadUrl || item.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden sm:flex items-center justify-center px-3 sm:px-4 py-2 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 border border-gray-200 dark:border-slate-600 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-colors"
                    >
                      <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                    </a>
                  ) : (
                    <button
                      disabled
                      className="hidden sm:flex items-center justify-center px-3 sm:px-4 py-2 bg-gray-200 text-gray-500 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium"
                    >
                      <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Пагинация */}
          <div className="flex items-center justify-center mt-8 sm:mt-10">
            <div className="flex items-center gap-1 sm:gap-2 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/50 dark:border-slate-700/50 rounded-xl sm:rounded-2xl p-1 sm:p-2 shadow-lg">
              <button
                onClick={() => setLiteraturePage(1)}
                disabled={literaturePage === 1}
                title="В начало"
                className={`w-10 h-10 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-300 ${
                  literaturePage === 1 
                    ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                }`}
              >
                <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => literaturePage > 1 && setLiteraturePage(literaturePage - 1)}
                disabled={literaturePage === 1}
                title="Предыдущая"
                className={`w-10 h-10 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-300 ${
                  literaturePage === 1 
                    ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                }`}
              >
                <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-0.5 sm:gap-1">
                <input
                  type="number"
                  min="1"
                  max={literatureMaxPage}
                  value={pageInputValue}
                  onChange={handlePageInputChange}
                  onBlur={handlePageInputBlur}
                  onKeyDown={handlePageInputKeyDown}
                  className="w-12 sm:w-12 px-1 sm:px-1.5 py-2 bg-emerald-500 dark:bg-emerald-600 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium shadow-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-400 [-moz-appearance:_textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                />
                <div className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm font-medium px-0.5 sm:px-1">
                  из
                </div>
                <div className="px-2 sm:px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium">
                  {literatureMaxPage}
                </div>
              </div>
              <button
                onClick={() => {
                  if (literaturePage < literatureMaxPage) setLiteraturePage(literaturePage + 1);
                }}
                disabled={literaturePage >= literatureMaxPage}
                title="Следующая"
                className={`w-10 h-10 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-300 ${
                  literaturePage >= literatureMaxPage 
                    ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                }`}
              >
                <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => setLiteraturePage(literatureMaxPage)}
                disabled={literaturePage === literatureMaxPage}
                title="В конец"
                className={`w-10 h-10 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-300 ${
                  literaturePage === literatureMaxPage 
                    ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                }`}
              >
                <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : literatureLoading ? (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin mb-4 sm:mb-6"></div>
          <h3 className="text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Загрузка материалов...
          </h3>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Пожалуйста, подождите немного
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 sm:mb-6">
            <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 dark:text-slate-500" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white mb-2">
            Материалы не найдены
          </h3>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4 sm:mb-6">
            Попробуйте изменить параметры поиска или выбрать другую категорию
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategories(['all']);
              setSortBy('default');
              setLiteraturePage(1);
            }}
            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg sm:rounded-xl font-medium transition-colors text-sm sm:text-base"
          >
            Сбросить фильтры
          </button>
        </div>
      )}
    </div>
  );
};

export default LiteraturePage;
