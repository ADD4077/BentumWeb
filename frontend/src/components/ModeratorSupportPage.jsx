import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  MessageSquareText,
  Search,
  Send,
  Shield,
} from 'lucide-react';

import { API_ENDPOINTS } from '../config/api.js';
import { formatDateTime, formatRelativeTime } from '../utils/dates.js';
import { buildCsrfHeaders } from '../utils/http.js';
import { showError, showSuccess } from '../utils/notifications.js';

const STATUS_LABELS = {
  open: 'Открыто',
  answered: 'Есть ответ',
  closed: 'Закрыто',
};

const TYPE_LABELS = {
  support: 'Поддержка',
  bug: 'Ошибка',
  feature: 'Предложение',
  question: 'Вопрос',
};

const STATUS_BADGES = {
  open: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  answered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  closed: 'bg-slate-200 text-slate-700 dark:bg-slate-700/70 dark:text-slate-300',
};

function ThreadCard({ thread, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[24px] border p-4 text-left transition ${
        active
          ? 'border-emerald-400 bg-emerald-50/80 dark:border-emerald-500/60 dark:bg-emerald-900/10'
          : 'border-gray-200/70 bg-gray-100/70 hover:border-emerald-300 dark:border-slate-700/50 dark:bg-slate-800/70 dark:hover:border-emerald-500/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-950 dark:text-white">{thread.subject}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{thread.created_by.fullname}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGES[thread.status] || STATUS_BADGES.closed}`}>
          {STATUS_LABELS[thread.status] || thread.status}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="rounded-full bg-slate-200/70 px-2.5 py-1 dark:bg-slate-700/70">
          {TYPE_LABELS[thread.request_type] || thread.request_type}
        </span>
        <span className="rounded-full bg-slate-200/70 px-2.5 py-1 dark:bg-slate-700/70">
          Код: {thread.created_by.student_code}
        </span>
        <span className="rounded-full bg-slate-200/70 px-2.5 py-1 dark:bg-slate-700/70">
          {thread.messages_count} сообщ.
        </span>
      </div>
      {thread.preview ? (
        <p className="mt-3 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{thread.preview}</p>
      ) : null}
      <div className="mt-3 text-xs text-slate-400 dark:text-slate-500">
        {formatRelativeTime(thread.last_message_at)}
      </div>
    </button>
  );
}

function MessageBubble({ message }) {
  const isModeratorReply = message.is_moderator_reply;
  return (
    <div className={`flex ${isModeratorReply ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-[24px] px-4 py-3 ${
          isModeratorReply
            ? 'bg-emerald-500 text-white'
            : 'bg-gray-100 text-slate-900 dark:bg-slate-800/80 dark:text-slate-100'
        }`}
      >
        <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
          {isModeratorReply ? <Shield className="h-3.5 w-3.5" /> : null}
          <span>{message.author.fullname}</span>
          <span>{formatDateTime(message.created_at, '')}</span>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
      </div>
    </div>
  );
}

function Pager({ page, totalPages, onChange }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
        className="rounded-xl bg-slate-200/80 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-300"
      >
        Назад
      </button>
      <div className="text-sm text-slate-500 dark:text-slate-400">
        {page} / {totalPages}
      </div>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        className="rounded-xl bg-slate-200/80 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-300"
      >
        Далее
      </button>
    </div>
  );
}

export default function ModeratorSupportPage() {
  const threadMessagesRef = useRef(null);
  const [threads, setThreads] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [threadsPage, setThreadsPage] = useState(1);
  const [threadsTotalPages, setThreadsTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);

  const loadThreads = async (page = threadsPage) => {
    setLoadingThreads(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '10',
      });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (search.trim()) params.set('search', search.trim());

      const response = await fetch(`${API_ENDPOINTS.SUPPORT_MODER_THREADS}?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        showError(data.detail || 'Не удалось загрузить обращения');
        return;
      }

      const nextThreads = data.threads || [];
      setThreads(nextThreads);
      setThreadsTotalPages(Math.max(1, data.total_pages || 1));
      setSelectedThreadId((prev) => (prev && nextThreads.some((thread) => thread.id === prev) ? prev : null));
    } catch {
      showError('Ошибка загрузки обращений');
    } finally {
      setLoadingThreads(false);
    }
  };

  const loadThreadDetail = async (threadId) => {
    if (!threadId) {
      setSelectedThread(null);
      return;
    }

    setLoadingThread(true);
    try {
      const response = await fetch(API_ENDPOINTS.SUPPORT_MODER_THREAD_DETAIL(threadId), {
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        showError(data.detail || 'Не удалось открыть обращение');
        return;
      }

      setSelectedThread(data.thread);
    } catch {
      showError('Ошибка загрузки переписки');
    } finally {
      setLoadingThread(false);
    }
  };

  useEffect(() => {
    loadThreads(threadsPage);
  }, [threadsPage, statusFilter, typeFilter, search]);

  useEffect(() => {
    loadThreadDetail(selectedThreadId);
  }, [selectedThreadId]);

  useEffect(() => {
    if (!selectedThreadId) {
      setMobileThreadOpen(false);
    }
  }, [selectedThreadId]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const isMobileViewport = window.matchMedia('(max-width: 1279px)').matches;
    if (!mobileThreadOpen || !isMobileViewport) {
      return undefined;
    }

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [mobileThreadOpen]);

  useEffect(() => {
    if (!selectedThreadId) {
      return;
    }

    requestAnimationFrame(() => {
      if (threadMessagesRef.current) {
        threadMessagesRef.current.scrollTop = 0;
      }
    });
  }, [selectedThreadId, selectedThread?.messages?.length]);

  const handleReply = async (event) => {
    event.preventDefault();
    if (!selectedThreadId || !replyText.trim()) return;

    setSendingReply(true);
    try {
      const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' });
      const response = await fetch(API_ENDPOINTS.SUPPORT_MODER_THREAD_REPLY(selectedThreadId), {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ message: replyText.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        showError(data.detail || 'Не удалось отправить ответ');
        return;
      }

      setReplyText('');
      showSuccess('Ответ отправлен');
      await loadThreads(threadsPage);
      await loadThreadDetail(selectedThreadId);
    } catch {
      showError('Ошибка отправки ответа');
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusChange = async (nextStatus) => {
    if (!selectedThreadId) return;

    setUpdatingStatus(true);
    try {
      const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' });
      const response = await fetch(API_ENDPOINTS.SUPPORT_MODER_THREAD_STATUS(selectedThreadId), {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        showError(data.detail || 'Не удалось обновить статус');
        return;
      }

      setSelectedThread(data.thread);
      showSuccess(nextStatus === 'closed' ? 'Обращение закрыто' : 'Обращение снова открыто');
      await loadThreads(threadsPage);
    } catch {
      showError('Ошибка обновления статуса');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const threadsCountText = useMemo(() => `${threads.length} на странице`, [threads.length]);

  const openThread = (threadId, event) => {
    event?.currentTarget?.blur?.();
    setSelectedThreadId(threadId);
    setMobileThreadOpen(true);
  };

  return (
    <div className={`min-h-screen ${mobileThreadOpen ? 'px-0 pb-3 pt-1 sm:p-6' : 'p-3 sm:p-6'}`}>
      <div className={`mx-auto max-w-[1560px] ${mobileThreadOpen ? 'space-y-3 sm:space-y-6' : 'space-y-6'}`}>
        <section className={`rounded-[30px] border border-gray-200/70 bg-gray-100/50 p-5 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20 ${mobileThreadOpen ? 'hidden xl:block' : ''}`}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">Форум обращений</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Модераторский раздел для обработки обращений и ответов пользователям
              </p>
            </div>
            <div className="self-start rounded-full bg-slate-200/70 px-4 py-2 text-sm text-slate-600 dark:bg-slate-700/70 dark:text-slate-300">
              {threadsCountText}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_220px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => {
                  setThreadsPage(1);
                  setSearch(event.target.value);
                  setMobileThreadOpen(false);
                }}
                placeholder="Поиск по теме, пользователю, коду или тексту"
                className="w-full rounded-2xl border border-gray-200/70 bg-white/80 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400 dark:border-slate-700/50 dark:bg-slate-900/70 dark:text-slate-100"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => {
                setThreadsPage(1);
                setStatusFilter(event.target.value);
                setMobileThreadOpen(false);
              }}
              className="rounded-2xl border border-gray-200/70 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 dark:border-slate-700/50 dark:bg-slate-900/70 dark:text-slate-100"
            >
              <option value="all">Все статусы</option>
              <option value="open">Открыто</option>
              <option value="answered">Есть ответ</option>
              <option value="closed">Закрыто</option>
            </select>

            <select
              value={typeFilter}
              onChange={(event) => {
                setThreadsPage(1);
                setTypeFilter(event.target.value);
                setMobileThreadOpen(false);
              }}
              className="rounded-2xl border border-gray-200/70 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 dark:border-slate-700/50 dark:bg-slate-900/70 dark:text-slate-100"
            >
              <option value="all">Все типы</option>
              <option value="support">Поддержка</option>
              <option value="bug">Ошибка</option>
              <option value="feature">Предложение</option>
              <option value="question">Вопрос</option>
            </select>
          </div>
        </section>

        <div className="grid gap-4 sm:gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className={`p-0 xl:rounded-[30px] xl:border xl:border-gray-200/70 xl:bg-gray-100/50 xl:p-4 xl:shadow-lg xl:shadow-gray-900/10 xl:backdrop-blur-md dark:xl:border-slate-700/50 dark:xl:bg-slate-800/50 dark:xl:shadow-black/20 ${mobileThreadOpen ? 'hidden xl:block' : ''}`}>
            <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1 sm:max-h-[760px]">
              {loadingThreads ? (
                <div className="py-16 text-center text-slate-500 dark:text-slate-400">Загрузка обращений...</div>
              ) : threads.length ? (
                threads.map((thread) => (
                  <ThreadCard
                    key={thread.id}
                    thread={thread}
                    active={thread.id === selectedThreadId}
                    onClick={(event) => openThread(thread.id, event)}
                  />
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-gray-300/70 px-4 py-12 text-center text-slate-500 dark:border-slate-700/60 dark:text-slate-400">
                  Обращений пока нет
                </div>
              )}
            </div>

            <Pager page={threadsPage} totalPages={threadsTotalPages} onChange={setThreadsPage} />
          </section>

          <section className={`flex h-[calc(100dvh-7rem)] min-h-[calc(100dvh-7rem)] flex-col overflow-hidden xl:h-auto xl:min-h-0 xl:rounded-[30px] xl:border xl:border-gray-200/70 xl:bg-gray-100/50 xl:shadow-lg xl:shadow-gray-900/10 xl:backdrop-blur-md dark:xl:border-slate-700/50 dark:xl:bg-slate-800/50 dark:xl:shadow-black/20 ${mobileThreadOpen ? '' : 'hidden xl:block'}`}>
            <div className="border-b border-gray-200/70 px-4 py-4 sm:px-5 dark:border-slate-700/50">
              <div className="mb-3 xl:hidden">
                <button
                  type="button"
                  onClick={() => setMobileThreadOpen(false)}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-200/80 px-3 py-2 text-sm font-medium text-slate-700 dark:bg-slate-700/70 dark:text-slate-300"
                >
                  <ArrowLeft className="h-4 w-4" />
                  К списку
                </button>
              </div>

              {selectedThread ? (
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{selectedThread.subject}</h2>
                    <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <span>{selectedThread.created_by.fullname}</span>
                      <span>Код: {selectedThread.created_by.student_code}</span>
                      <span>{selectedThread.created_by.faculty}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGES[selectedThread.status] || STATUS_BADGES.closed}`}>
                      {STATUS_LABELS[selectedThread.status] || selectedThread.status}
                    </span>
                    <span className="rounded-full bg-slate-200/70 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700/70 dark:text-slate-300">
                      {TYPE_LABELS[selectedThread.request_type] || selectedThread.request_type}
                    </span>
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => handleStatusChange(selectedThread.status === 'closed' ? 'open' : 'closed')}
                      className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                    >
                      {updatingStatus
                        ? 'Сохранение...'
                        : selectedThread.status === 'closed'
                          ? 'Открыть снова'
                          : 'Закрыть'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Выберите обращение, чтобы открыть чат
                </div>
              )}
            </div>

            {loadingThread ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">Загрузка переписки...</div>
            ) : selectedThread ? (
              <>
                <div ref={threadMessagesRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-5 sm:px-5">
                  <div className="space-y-4">
                  {selectedThread.messages?.length ? (
                    selectedThread.messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-gray-300/70 px-4 py-10 text-center text-slate-500 dark:border-slate-700/60 dark:text-slate-400">
                      В переписке пока нет сообщений
                    </div>
                  )}
                  </div>
                </div>

                <form onSubmit={handleReply} className="mt-auto border-t border-gray-200/70 px-4 py-4 sm:px-5 dark:border-slate-700/50">
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Ответ модератора
                  </label>
                  <textarea
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    rows={4}
                    placeholder="Введите ответ пользователю..."
                    className="w-full resize-none rounded-2xl border border-gray-200/70 bg-white/90 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400 dark:border-slate-700/50 dark:bg-slate-900/70 dark:text-slate-100"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={sendingReply || !replyText.trim()}
                      className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition ${
                        sendingReply || !replyText.trim()
                          ? 'cursor-not-allowed bg-slate-300 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                          : 'bg-emerald-500 hover:bg-emerald-600'
                      }`}
                    >
                      <Send className="h-4 w-4" />
                      {sendingReply ? 'Отправка...' : 'Ответить'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex min-h-[500px] flex-col items-center justify-center gap-3 p-8 text-center text-slate-500 dark:text-slate-400">
                <MessageSquareText className="h-10 w-10" />
                <div className="text-lg font-medium text-slate-700 dark:text-slate-300">Выберите обращение</div>
                <div className="max-w-sm text-sm">
                  Откройте любое обращение из списка, чтобы прочитать переписку и ответить пользователю.
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
