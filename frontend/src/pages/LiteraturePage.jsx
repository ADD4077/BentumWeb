import React, { useEffect, useState } from 'react';
import { BookOpen, Download, ExternalLink, Filter, Search } from 'lucide-react';

import { useModal } from '../contexts/ModalContext.jsx';
import { useLiterature } from '../hooks/useLiterature.js';
import { sanitizeExternalUrl } from '../utils/url.js';

const SORT_OPTIONS = [
  { id: 'title_asc', name: 'А-Я' },
  { id: 'title_desc', name: 'Я-А' },
  { id: 'year_desc', name: 'Сначала новые' },
  { id: 'year_asc', name: 'Сначала старые' },
  { id: 'category_asc', name: 'Категория А-Я' },
  { id: 'category_desc', name: 'Категория Я-А' },
  { id: 'size_desc', name: 'Сначала большие' },
  { id: 'size_asc', name: 'Сначала маленькие' },
];

function getSortName(id) {
  return SORT_OPTIONS.find((option) => option.id === id)?.name || id;
}

function CategoryBadge({ count, onClear }) {
  const label =
    count === 1 ? 'категория' : count < 5 ? 'категории' : 'категорий';

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-2 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 sm:px-3 sm:text-sm">
      <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
      <span>
        {count} {label}
      </span>
      <button
        onClick={onClear}
        className="flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 sm:h-4 sm:w-4"
      >
        <svg className="h-2 w-2 sm:h-3 sm:w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function LiteratureCard({ item }) {
  const fileUrl = item.downloadUrl || item.download_url;
  const safeFileUrl = sanitizeExternalUrl(fileUrl);
  const fileSize = item.downloadSize || item.size;

  return (
    <article className="glass-card interactive-lift shimmer-surface flex h-full flex-col justify-between rounded-xl border border-gray-200/70 bg-gray-100/50 p-4 shadow-lg shadow-gray-900/10 backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20 sm:rounded-2xl sm:p-6">
      <div>
        <div className="mb-3 flex items-start justify-between sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-emerald-100 dark:bg-emerald-900/20 sm:h-10 sm:w-10">
              {item.image_url ? (
                <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
              ) : (
                <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400 sm:h-6 sm:w-6" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="mb-1 inline-block rounded-lg bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 sm:px-2 sm:py-1">
                {item.category || 'Без категории'}
              </span>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {item.type === 'textbook' ? 'Учебник' : 'Пособие'} • {item.year}
              </div>
            </div>
          </div>
        </div>

        <h3 className="mb-2 line-clamp-2 text-base font-bold text-slate-900 dark:text-white sm:text-lg">
          {item.title}
        </h3>
        <p className="mb-1 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
          {item.author}
        </p>
        <p className="mb-3 line-clamp-2 text-xs text-slate-500 dark:text-slate-500 sm:mb-4 sm:line-clamp-3 sm:text-sm">
          {item.description}
        </p>
      </div>

      <div className="flex gap-2">
        {safeFileUrl ? (
          <a
            href={safeFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-500 sm:gap-2 sm:rounded-xl sm:px-4 sm:text-sm"
          >
            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
            Скачать
            {fileSize ? (
              <span className="ml-1 text-slate-200 dark:text-slate-300">({fileSize})</span>
            ) : null}
          </a>
        ) : (
          <button
            disabled
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-gray-200 px-3 py-2 text-xs font-medium text-gray-500 sm:gap-2 sm:rounded-xl sm:px-4 sm:text-sm"
          >
            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
            Скачать
          </button>
        )}

        {safeFileUrl ? (
          <a
            href={safeFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 sm:flex sm:rounded-xl sm:px-4 sm:text-sm"
          >
            <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
          </a>
        ) : (
          <button
            disabled
            className="hidden items-center justify-center rounded-lg bg-gray-200 px-3 py-2 text-xs font-medium text-gray-500 sm:flex sm:rounded-xl sm:px-4 sm:text-sm"
          >
            <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
        )}
      </div>
    </article>
  );
}

export function LiteraturePage({ searchQuery, setSearchQuery, activeTab }) {
  const {
    setIsCategoryModalOpen,
    setIsSortModalOpen,
    literatureSortBy,
    setLiteratureSortBy,
    selectedCategories,
    setSelectedCategories,
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
  } = useLiterature(activeTab, searchQuery, {
    sortBy: literatureSortBy,
    setSortBy: setLiteratureSortBy,
    selectedCategories,
    setSelectedCategories,
  });

  const [pageInputValue, setPageInputValue] = useState(String(literaturePage));

  useEffect(() => {
    setPageInputValue(String(literaturePage));
  }, [literaturePage]);

  const applyPageValue = () => {
    const page = Number.parseInt(pageInputValue, 10);

    if (page >= 1 && page <= literatureMaxPage) {
      setLiteraturePage(page);
      return;
    }

    setPageInputValue(String(literaturePage));
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategories(['all']);
    setSortBy('default');
    setLiteraturePage(1);
  };

  const hasCategoryFilter =
    selectedCategories.length > 0 && !selectedCategories.includes('all');
  const hasCustomSort = sortBy !== 'default';
  const hasAnyFilters = Boolean(searchQuery) || hasCategoryFilter || hasCustomSort;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="section-reveal mb-8 text-center sm:mb-10">
        <h2 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:mb-4 sm:text-4xl">
          Литература
        </h2>
        <p className="mx-auto max-w-2xl px-4 text-base text-slate-600 dark:text-slate-400 sm:text-lg">
          Учебные материалы, пособия и методические указания для студентов БНТУ
          в одном каталоге.
        </p>
      </div>

      <div className="section-reveal mb-6 flex items-center gap-2 sm:mb-8">
        <div className="relative flex-1 overflow-hidden rounded-xl sm:rounded-2xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400 sm:left-4 sm:h-5 sm:w-5" />
          <input
            type="text"
            placeholder="Поиск по названию, автору или описанию..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-xl border border-gray-200/70 bg-gray-100/50 py-3 pl-10 pr-4 text-sm text-slate-900 shadow-lg shadow-gray-900/10 backdrop-blur-md placeholder-slate-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:placeholder-slate-400 dark:shadow-black/20 sm:rounded-2xl sm:pl-12 sm:text-base"
          />
        </div>

        <div className="flex flex-shrink-0 gap-2">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            title="Фильтр категорий"
            className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200/70 bg-gray-100/50 text-slate-600 transition-colors hover:bg-emerald-50/80 hover:text-emerald-600 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 sm:h-12 sm:w-12 sm:rounded-2xl"
          >
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          <button
            onClick={() => {
              setLiteratureSortBy(sortBy);
              setIsSortModalOpen(true);
            }}
            title="Сортировка"
            className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200/70 bg-gray-100/50 text-slate-600 transition-colors hover:bg-emerald-50/80 hover:text-emerald-600 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 sm:h-12 sm:w-12 sm:rounded-2xl"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="section-reveal mb-4 sm:mb-6">
        <div className="mb-2 px-1 text-xs text-slate-600 dark:text-slate-400 sm:mb-3 sm:text-sm">
          Найдено материалов:{' '}
          <span className="font-medium text-slate-900 dark:text-white">
            {literatureTotal}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {searchQuery ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-2 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 sm:px-3 sm:text-sm">
              <Search className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="max-w-[100px] truncate sm:max-w-none">{searchQuery}</span>
              <button
                onClick={() => setSearchQuery('')}
                className="flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-700 sm:h-4 sm:w-4"
              >
                <svg className="h-2 w-2 sm:h-3 sm:w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : null}

          {hasCategoryFilter ? (
            <CategoryBadge
              count={selectedCategories.length}
              onClear={() => {
                setSelectedCategories(['all']);
                setLiteraturePage(1);
              }}
            />
          ) : null}

          {hasCustomSort ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-2 py-1.5 text-xs font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 sm:px-3 sm:text-sm">
              <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <span className="max-w-[100px] truncate sm:max-w-none">{getSortName(sortBy)}</span>
              <button
                onClick={() => {
                  setSortBy('default');
                  setLiteraturePage(1);
                }}
                className="flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-white transition-colors hover:bg-purple-700 sm:h-4 sm:w-4"
              >
                <svg className="h-2 w-2 sm:h-3 sm:w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : null}

          {hasAnyFilters ? (
            <button
              onClick={resetFilters}
              className="rounded-full bg-gray-200 px-2 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 sm:px-3 sm:text-sm"
            >
              Сбросить все
            </button>
          ) : null}
        </div>
      </div>

      {literatureItems.length > 0 ? (
        <div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {literatureItems.map((item) => (
              <LiteratureCard key={item.id} item={item} />
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center sm:mt-10">
            <div className="glass-card shimmer-surface flex items-center gap-1 rounded-xl border border-white/50 bg-white/40 p-1 shadow-lg backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/40 sm:gap-2 sm:rounded-2xl sm:p-2">
              <button
                onClick={() => setLiteraturePage(1)}
                disabled={literaturePage === 1}
                title="В начало"
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300 sm:rounded-xl ${
                  literaturePage === 1
                    ? 'cursor-not-allowed text-slate-400 dark:text-slate-500'
                    : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 dark:text-slate-300 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400'
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>

              <button
                onClick={() => literaturePage > 1 && setLiteraturePage(literaturePage - 1)}
                disabled={literaturePage === 1}
                title="Предыдущая"
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300 sm:rounded-xl ${
                  literaturePage === 1
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
                  max={literatureMaxPage}
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
                  {literatureMaxPage}
                </div>
              </div>

              <button
                onClick={() => {
                  if (literaturePage < literatureMaxPage) {
                    setLiteraturePage(literaturePage + 1);
                  }
                }}
                disabled={literaturePage >= literatureMaxPage}
                title="Следующая"
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300 sm:rounded-xl ${
                  literaturePage >= literatureMaxPage
                    ? 'cursor-not-allowed text-slate-400 dark:text-slate-500'
                    : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 dark:text-slate-300 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400'
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={() => setLiteraturePage(literatureMaxPage)}
                disabled={literaturePage === literatureMaxPage}
                title="В конец"
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300 sm:rounded-xl ${
                  literaturePage === literatureMaxPage
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
        </div>
      ) : literatureLoading ? (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600 dark:border-emerald-800 dark:border-t-emerald-400 sm:mb-6 sm:h-16 sm:w-16" />
          <h3 className="mb-2 text-lg font-semibold text-slate-700 dark:text-slate-300 sm:text-xl">
            Загружаем материалы...
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 sm:text-base">
            Это займёт всего несколько секунд.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 sm:mb-6 sm:h-20 sm:w-20">
            <BookOpen className="h-8 w-8 text-gray-400 dark:text-slate-500 sm:h-10 sm:w-10" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-slate-800 dark:text-white sm:text-2xl">
            Материалы не найдены
          </h3>
          <p className="mb-4 max-w-md text-sm text-slate-500 dark:text-slate-400 sm:mb-6 sm:text-base">
            Попробуйте изменить запрос, категорию или сортировку, чтобы увидеть
            больше результатов.
          </p>
          <button
            onClick={resetFilters}
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 sm:rounded-xl sm:px-6 sm:py-3 sm:text-base"
          >
            Сбросить фильтры
          </button>
        </div>
      )}
    </div>
  );
}

export default LiteraturePage;
