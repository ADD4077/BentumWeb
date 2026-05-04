import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

function buildPageItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 'ellipsis-right', totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'ellipsis-left', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'ellipsis-left', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-right', totalPages];
}

export default function AdminPagination({ currentPage, totalPages, setCurrentPage }) {
  if (totalPages <= 1) return null;

  const items = buildPageItems(currentPage, totalPages);

  return (
    <div className="flex flex-col gap-4 border-t border-slate-200/70 px-4 py-4 dark:border-slate-800/80 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="text-center text-sm text-slate-500 dark:text-slate-400 sm:text-left">
        Страница {currentPage} из {totalPages}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
        <button
          aria-label="Предыдущая страница"
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50/90 text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {items.map((item) => (
          typeof item === 'number' ? (
            <button
              key={item}
              type="button"
              onClick={() => setCurrentPage(item)}
              className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-medium transition ${
                item === currentPage
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'border border-slate-200/80 bg-slate-50/90 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white'
              }`}
            >
              {item}
            </button>
          ) : (
            <span
              key={item}
              className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl border border-slate-200/70 bg-slate-50/70 px-2 text-slate-400 dark:border-slate-700/80 dark:bg-slate-900/60"
            >
              <MoreHorizontal className="h-4 w-4" />
            </span>
          )
        ))}

        <button
          aria-label="Следующая страница"
          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50/90 text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
