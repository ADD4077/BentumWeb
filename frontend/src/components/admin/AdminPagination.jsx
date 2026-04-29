import React from 'react';

export default function AdminPagination({ currentPage, totalPages, setCurrentPage }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-200/70 bg-gray-100/50 p-4 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20">
      <div className="text-sm text-slate-600 dark:text-slate-400">
        Страница {currentPage} из {totalPages}
      </div>
      <div className="flex gap-2">
        <button
          aria-label="Предыдущая страница"
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="rounded-lg border border-gray-200 px-3 py-2 dark:border-slate-600"
        >
          ←
        </button>
        <button
          aria-label="Следующая страница"
          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          className="rounded-lg border border-gray-200 px-3 py-2 dark:border-slate-600"
        >
          →
        </button>
      </div>
    </div>
  );
}
