import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Calendar, Clock, Loader2, Search } from 'lucide-react';

import { TagsContainer } from '../components/TagsContainer.jsx';
import { useModal } from '../contexts/ModalContext.jsx';
import { useNavigation } from '../hooks/useNavigation.js';
import { useNews } from '../hooks/useNews.js';

function formatDate(timestamp) {
  const date = new Date(timestamp * 1000);
  const formatted = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return formatted.replace(' г. в', '');
}

function Pagination({ page, maxPage, onChange }) {
  const [pageInputValue, setPageInputValue] = useState(String(page));

  useEffect(() => {
    setPageInputValue(String(page));
  }, [page]);

  const applyPageValue = () => {
    const nextPage = Number.parseInt(pageInputValue, 10);
    if (nextPage >= 1 && nextPage <= maxPage) {
      onChange(nextPage);
      return;
    }
    setPageInputValue(String(page));
  };

  return (
    <div className="mt-8 flex items-center justify-center sm:mt-10">
      <div className="flex items-center gap-1 rounded-xl border border-white/50 bg-white/40 p-1 shadow-lg backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/40 sm:gap-2 sm:rounded-2xl sm:p-2">
        <button
          onClick={() => onChange(1)}
          disabled={page === 1}
          title="В начало"
          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300 sm:rounded-xl ${
            page === 1
              ? 'cursor-not-allowed text-slate-400 dark:text-slate-500'
              : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 dark:text-slate-300 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400'
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={() => page > 1 && onChange(page - 1)}
          disabled={page === 1}
          title="Предыдущая"
          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300 sm:rounded-xl ${
            page === 1
              ? 'cursor-not-allowed text-slate-400 dark:text-slate-500'
              : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 dark:text-slate-300 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400'
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-1">
          <input
            type="number"
            min="1"
            max={maxPage}
            value={pageInputValue}
            onChange={(event) => setPageInputValue(event.target.value)}
            onBlur={applyPageValue}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                applyPageValue();
              }
            }}
            className="w-12 rounded-lg bg-emerald-500 px-1 py-2 text-center text-xs font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-emerald-600 [-moz-appearance:_textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none sm:rounded-xl"
          />
          <div className="px-0.5 text-xs font-medium text-slate-400 dark:text-slate-500 sm:px-1 sm:text-sm">
            из
          </div>
          <div className="rounded-lg bg-slate-100 px-2 py-2 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300 sm:rounded-xl sm:px-3 sm:text-sm">
            {maxPage}
          </div>
        </div>

        <button
          onClick={() => {
            if (page < maxPage) {
              onChange(page + 1);
            }
          }}
          disabled={page >= maxPage}
          title="Следующая"
          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300 sm:rounded-xl ${
            page >= maxPage
              ? 'cursor-not-allowed text-slate-400 dark:text-slate-500'
              : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 dark:text-slate-300 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400'
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={() => onChange(maxPage)}
          disabled={page === maxPage}
          title="В конец"
          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300 sm:rounded-xl ${
            page === maxPage
              ? 'cursor-not-allowed text-slate-400 dark:text-slate-500'
              : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 dark:text-slate-300 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400'
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function NewsCard({ item, compact = false, onTagClick }) {
  return (
    <article
      className={`flex h-full flex-col ${
        compact
          ? 'rounded-xl border border-gray-200/70 bg-gray-100/50 p-4 shadow-lg shadow-gray-900/10 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20 sm:rounded-2xl sm:p-6'
          : 'rounded-xl border border-gray-200/70 bg-gray-100/50 p-4 shadow-lg shadow-gray-900/10 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20 sm:rounded-2xl sm:p-6'
      }`}
    >
      {item.imageUrl ? (
        <div className={`relative overflow-hidden rounded-lg ${compact ? 'mb-3 h-32 sm:mb-4 sm:h-40' : 'mb-3 h-36 sm:mb-4 sm:h-48'}`}>
          <img
            src={item.imageUrl}
            alt={item.title}
            className="h-full w-full object-cover"
            onError={(event) => {
              event.target.style.display = 'none';
              if (event.target.parentElement) {
                event.target.parentElement.style.display = 'none';
              }
            }}
          />
        </div>
      ) : null}

      <div className="mb-3 flex items-start justify-between sm:mb-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
          <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
          {formatDate(item.timestamp)}
        </div>
        <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <Clock className="h-3 w-3" />
          {item.readTime}
        </span>
      </div>

      <h3 className={`mb-2 font-bold text-slate-900 dark:text-white ${compact ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'}`}>
        {item.title}
      </h3>

      <p className={`mb-3 flex-grow text-slate-600 dark:text-slate-400 ${compact ? 'line-clamp-2 text-sm sm:line-clamp-3' : 'line-clamp-2 text-sm sm:line-clamp-3 sm:text-base'}`}>
        {item.excerpt}
      </p>

      <div className={`mt-auto flex items-center justify-between ${compact ? 'border-t border-gray-100 pt-3 dark:border-slate-700' : ''}`}>
        <div className="mr-2 min-w-0 flex-1 sm:mr-3">
          <TagsContainer tags={item.tags} onTagClick={onTagClick} />
        </div>
        <button
          onClick={() => item.link && window.open(item.link, '_blank')}
          className="flex flex-shrink-0 items-center gap-1 rounded-lg bg-emerald-500 px-2 py-1.5 text-xs font-medium text-white transition-all duration-300 hover:scale-105 hover:bg-emerald-600 sm:px-3 sm:py-2 sm:text-sm"
        >
          {!compact ? <span className="hidden sm:inline">Читать</span> : null}
          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>
      </div>
    </article>
  );
}

export function NewsPage({ activeTab }) {
  const { setIsNewsSortModalOpen, newsSortBy, setNewsSortBy } = useModal();
  const { setSearchQuery, setActiveTab } = useNavigation();
  const {
    newsSearchQuery,
    setNewsSearchQuery,
    selectedNewsCategory,
    setSelectedNewsCategory,
    newsCategories,
    filteredNews,
    newsPage,
    newsMaxPage,
    setNewsPage,
    newsLoading,
    newsTotal,
  } = useNews(activeTab, {
    sortBy: newsSortBy,
    setSortBy: setNewsSortBy,
  });

  const onTagClick = (tag) => {
    setSearchQuery(tag);
    setActiveTab('news');
  };

  const showLatestSection =
    newsPage === 1 &&
    filteredNews.length > 0 &&
    !newsSearchQuery &&
    selectedNewsCategory === 'all' &&
    newsSortBy === 'date_desc';

  const featuredNews = useMemo(
    () => (showLatestSection ? filteredNews.slice(0, 2) : []),
    [filteredNews, showLatestSection]
  );

  const listNews = useMemo(
    () => (showLatestSection ? filteredNews.slice(2) : filteredNews),
    [filteredNews, showLatestSection]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="mb-8 text-center sm:mb-10">
        <h2 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:mb-4 sm:text-4xl">
          Новости
        </h2>
        <p className="mx-auto max-w-2xl px-4 text-base text-slate-600 dark:text-slate-400 sm:text-lg">
          Актуальные события, достижения и важные объявления БНТУ.
        </p>
      </div>

      <div className="mx-auto mb-6 flex max-w-2xl items-center gap-2 sm:mb-8 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:left-4 sm:h-5 sm:w-5" />
          <input
            type="text"
            placeholder="Поиск новостей..."
            value={newsSearchQuery}
            onChange={(event) => setNewsSearchQuery(event.target.value)}
            className="w-full rounded-xl border border-gray-200/70 bg-gray-100/50 py-3 pl-9 pr-4 text-sm text-slate-900 shadow-lg shadow-gray-900/10 backdrop-blur-md placeholder-slate-500 transition-all duration-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:placeholder-slate-400 dark:shadow-black/20 sm:rounded-2xl sm:pl-12 sm:text-base"
          />
        </div>
        <button
          onClick={() => setIsNewsSortModalOpen(true)}
          title="Сортировка"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200/70 bg-gray-100/50 text-slate-600 shadow-lg shadow-gray-900/10 backdrop-blur-md transition-colors hover:bg-emerald-50/80 hover:text-emerald-600 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-300 dark:shadow-black/20 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 sm:h-12 sm:w-12 sm:rounded-2xl"
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      <div
        className="mb-6 flex gap-2 overflow-x-auto px-1 pb-2 sm:mb-8 sm:justify-center sm:gap-3 sm:px-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitScrollbar: 'display: none' }}
      >
        {newsCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedNewsCategory(category.id)}
            className={`flex-shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-all duration-300 sm:px-6 sm:py-2.5 sm:text-sm ${
              selectedNewsCategory === category.id
                ? 'bg-emerald-500 text-white'
                : 'border border-gray-200/70 bg-gray-100/50 text-slate-600 shadow-lg shadow-gray-900/10 backdrop-blur-md hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-400 dark:shadow-black/20 dark:hover:border-emerald-600 dark:hover:text-emerald-400'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {showLatestSection ? (
        <section className="mb-8 sm:mb-12">
          <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-white sm:mb-6 sm:text-2xl">
            Последние новости
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            {featuredNews.map((item) => (
              <NewsCard key={item.id} item={item} onTagClick={onTagClick} />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-white sm:mb-6 sm:text-2xl">
          {newsSearchQuery ? 'Результаты поиска' : 'Все новости'}
        </h3>

        {newsLoading ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-emerald-500 sm:h-12 sm:w-12" />
            <p className="text-slate-500 dark:text-slate-400">Загрузка новостей...</p>
          </div>
        ) : listNews.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {listNews.map((item) => (
                <NewsCard key={item.id} item={item} compact onTagClick={onTagClick} />
              ))}
            </div>

            {newsTotal > 6 ? (
              <Pagination page={newsPage} maxPage={newsMaxPage} onChange={setNewsPage} />
            ) : null}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 sm:h-20 sm:w-20">
              <Search className="h-8 w-8 text-gray-400 dark:text-slate-500" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-800 dark:text-white">
              Новости не найдены
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Попробуйте изменить параметры поиска или выбрать другую категорию.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default NewsPage;
