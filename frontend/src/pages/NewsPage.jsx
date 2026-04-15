import React, { useState, useEffect } from 'react';
import { Search, Calendar, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { TagsContainer } from '../components/TagsContainer.jsx';
import { useNews } from '../hooks/useNews.js';
import { useModal } from '../contexts/ModalContext.jsx';
import { useNavigation } from '../hooks/useNavigation.js';

/**
 * Страница новостей
 */
export const NewsPage = ({ activeTab }) => {
  const {
    newsSearchQuery,
    setNewsSearchQuery,
    selectedNewsCategory,
    setSelectedNewsCategory,
    newsSortBy,
    newsCategories,
    filteredNews,
    newsPage,
    newsMaxPage,
    setNewsPage,
    newsLoading,
    newsTotal
  } = useNews(activeTab);

  const { setIsNewsSortModalOpen } = useModal();
  const { setSearchQuery, setActiveTab } = useNavigation();

  // Форматирование даты
  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    const options = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    let formatted = date.toLocaleDateString('ru-RU', options);
    return formatted.replace(' г. в', '');
  };

  // Обработчик клика по тегу
  const onTagClick = (tag) => {
    setSearchQuery(tag);
    setActiveTab('news');
  };
  // Локальный state для input пагинации (чтобы не дергался при быстром вводе)
  const [pageInputValue, setPageInputValue] = useState(newsPage.toString());

  // Синхронизация локального state с prop при изменении извне
  useEffect(() => {
    setPageInputValue(newsPage.toString());
  }, [newsPage]);

  const handlePageInputChange = (e) => {
    setPageInputValue(e.target.value);
  };

  const handlePageInputBlur = () => {
    const page = parseInt(pageInputValue);
    if (page >= 1 && page <= newsMaxPage) {
      setNewsPage(page);
    } else {
      setPageInputValue(newsPage.toString());
    }
  };

  const handlePageInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      const page = parseInt(pageInputValue);
      if (page >= 1 && page <= newsMaxPage) {
        setNewsPage(page);
      } else {
        setPageInputValue(newsPage.toString());
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="text-center mb-8 sm:mb-10">
        <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 text-slate-900 dark:text-white tracking-tight">Новости</h2>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto px-4">
          Актуальные события, достижения и важные объявления БНТУ
        </p>
      </div>

      {/* Поиск */}
      <div className="max-w-2xl mx-auto mb-6 sm:mb-8">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск новостей..."
              value={newsSearchQuery}
              onChange={(e) => setNewsSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl sm:rounded-2xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-sm sm:text-base"
            />
          </div>
          <button
            onClick={() => setIsNewsSortModalOpen(true)}
            className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl sm:rounded-2xl text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex-shrink-0"
            title="Сортировка"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Категории */}
      <div className="flex overflow-x-auto gap-2 sm:gap-3 mb-6 sm:mb-8 pb-2 px-1 sm:px-0 sm:justify-center" style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitScrollbar: 'display: none'
      }}>
        {newsCategories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedNewsCategory(category.id)}
            className={`px-3 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
              selectedNewsCategory === category.id
                ? 'bg-emerald-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:text-emerald-600 dark:hover:text-emerald-400'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Последние новости (только на первой странице без фильтров) */}
      {newsPage === 1 && filteredNews.length > 0 && !newsSearchQuery && selectedNewsCategory === 'all' && newsSortBy === 'date_desc' && (
        <div className="mb-8 sm:mb-12">
          <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-slate-900 dark:text-white">Последние новости</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {filteredNews.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl sm:rounded-2xl border border-emerald-200 dark:border-emerald-800/30 p-4 sm:p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex flex-col h-full">
                  {item.imageUrl && (
                    <div className="relative h-36 sm:h-48 rounded-lg sm:rounded-xl overflow-hidden mb-3 sm:mb-4">
                      <img 
                        src={item.imageUrl} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                      {formatDate(item.timestamp)}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.readTime}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg sm:text-xl text-slate-900 dark:text-white mb-2 sm:mb-3 line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-3 sm:mb-4 line-clamp-2 sm:line-clamp-3 flex-grow">
                    {item.excerpt}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex-1 mr-2 sm:mr-3 min-w-0">
                      <TagsContainer tags={item.tags} onTagClick={onTagClick} />
                    </div>
                    <button 
                      onClick={() => item.link && window.open(item.link, '_blank')}
                      className="flex items-center gap-1 sm:gap-2 px-3 sm:px-3 py-2.5 sm:py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg sm:rounded-xl font-medium text-sm sm:text-sm transition-all duration-300 hover:scale-105 hover:shadow-lg flex-shrink-0"
                    >
                      <span className="hidden sm:inline">Читать</span>
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Список всех новостей */}
      <div>
        <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-slate-900 dark:text-white">
          {newsSearchQuery ? 'Результаты поиска' : 'Все новости'}
        </h3>
        
        {newsLoading ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24">
            <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-500 animate-spin mb-4" />
            <p className="text-slate-500 dark:text-slate-400">Загрузка новостей...</p>
          </div>
        ) : filteredNews.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {(newsPage === 1 && !newsSearchQuery && selectedNewsCategory === 'all' && newsSortBy === 'date_desc' 
                ? filteredNews.slice(2) 
                : filteredNews
              ).map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
                >
                  {item.imageUrl && (
                    <div className="relative h-32 sm:h-40 rounded-lg sm:rounded-xl overflow-hidden mb-3 sm:mb-4">
                      <img 
                        src={item.imageUrl} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                      {formatDate(item.timestamp)}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.readTime}
                    </span>
                  </div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white mb-2 line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2 sm:line-clamp-3 flex-grow">
                    {item.excerpt}
                  </p>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-slate-700">
                    <div className="flex-1 mr-2 min-w-0">
                      <TagsContainer tags={item.tags} onTagClick={onTagClick} />
                    </div>
                    <button 
                      onClick={() => item.link && window.open(item.link, '_blank')}
                      className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium text-xs sm:text-sm transition-all duration-300 hover:scale-105 flex-shrink-0"
                    >
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Пагинация */}
            {newsTotal > 6 && (
              <div className="flex items-center justify-center mt-8 sm:mt-10">
                <div className="flex items-center gap-1 sm:gap-2 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/50 dark:border-slate-700/50 rounded-xl sm:rounded-2xl p-1 sm:p-2 shadow-lg">
                  <button
                    onClick={() => setNewsPage(1)}
                    disabled={newsPage === 1}
                    title="В начало"
                    className={`w-10 h-10 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-300 ${
                      newsPage === 1 
                        ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' 
                        : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                    }`}
                  >
                    <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => newsPage > 1 && setNewsPage(newsPage - 1)}
                    disabled={newsPage === 1}
                    title="Предыдущая"
                    className={`w-10 h-10 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-300 ${
                      newsPage === 1 
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
                      max={newsMaxPage}
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
                      {newsMaxPage}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (newsPage < newsMaxPage) setNewsPage(newsPage + 1);
                    }}
                    disabled={newsPage >= newsMaxPage}
                    title="Следующая"
                    className={`w-10 h-10 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-300 ${
                      newsPage >= newsMaxPage 
                        ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' 
                        : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                    }`}
                  >
                    <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setNewsPage(newsMaxPage)}
                    disabled={newsPage === newsMaxPage}
                    title="В конец"
                    className={`w-10 h-10 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-300 ${
                      newsPage === newsMaxPage 
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
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-400 dark:text-slate-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
              Новости не найдены
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Попробуйте изменить параметры поиска
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsPage;
