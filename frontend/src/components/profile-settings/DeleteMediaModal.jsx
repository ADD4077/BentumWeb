import React from 'react';

export default function DeleteMediaModal({ deleteModal, setDeleteModal, confirmDelete }) {
  if (!deleteModal) return null;

  return (
    <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="modal-panel w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl dark:bg-slate-900">
        <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
          Удалить {deleteModal === 'avatar' ? 'аватар' : 'баннер'}?
        </h3>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">Это действие нельзя отменить.</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteModal(null)}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400"
          >
            Отмена
          </button>
          <button
            onClick={confirmDelete}
            className="rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-medium text-white"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}
