import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bug,
  HelpCircle,
  Lightbulb,
  ListChecks,
  MessageCircle,
  Search,
  Send,
  X,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext.jsx';
import { API_ENDPOINTS } from '../config/api.js';
import { formatDateTime, formatRelativeTime } from '../utils/dates.js';
import { buildCsrfHeaders } from '../utils/http.js';

const REQUEST_TYPES = [
  { value: 'support', label: 'Поддержка', icon: MessageCircle, color: 'blue' },
  { value: 'bug', label: 'Ошибка', icon: Bug, color: 'red' },
  { value: 'feature', label: 'Предложение', icon: Lightbulb, color: 'yellow' },
  { value: 'question', label: 'Вопрос', icon: HelpCircle, color: 'green' },
];

const COLOR_CLASSES = {
  blue: {
    idle: 'border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    active: 'border-blue-500 bg-blue-500 text-white',
  },
  red: {
    idle: 'border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400',
    active: 'border-red-500 bg-red-500 text-white',
  },
  yellow: {
    idle: 'border-yellow-200 bg-yellow-100 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    active: 'border-yellow-500 bg-yellow-500 text-white',
  },
  green: {
    idle: 'border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400',
    active: 'border-green-500 bg-green-500 text-white',
  },
};

const STATUS_LABELS = {
  open: 'Открыто',
  answered: 'Есть ответ',
  closed: 'Закрыто',
};

const STATUS_BADGES = {
  open: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  answered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  closed: 'bg-slate-200 text-slate-700 dark:bg-slate-700/70 dark:text-slate-300',
};

const TAB_NEW = 'new';
const TAB_THREADS = 'threads';

function ThreadCard({ thread, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        active
          ? 'border-emerald-400 bg-emerald-50/80 dark:border-emerald-500/60 dark:bg-emerald-900/10'
          : 'border-gray-200/70 bg-white/80 hover:border-emerald-300 dark:border-slate-700/50 dark:bg-slate-900/50 dark:hover:border-emerald-500/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-900 dark:text-white">{thread.subject}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {formatDateTime(thread.created_at)}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGES[thread.status] || STATUS_BADGES.closed}`}>
          {STATUS_LABELS[thread.status] || thread.status}
        </span>
      </div>
      {thread.preview ? (
        <p className="mt-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{thread.preview}</p>
      ) : null}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{thread.messages_count} сообщ.</span>
        <span>{formatRelativeTime(thread.last_message_at)}</span>
      </div>
    </button>
  );
}

function MessageBubble({ message }) {
  return (
    <div className={`flex ${message.is_moderator_reply ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] rounded-2xl px-4 py-3 ${
        message.is_moderator_reply
          ? 'bg-emerald-500 text-white'
          : 'bg-gray-100 text-slate-900 dark:bg-slate-800/80 dark:text-slate-100'
      }`}>
        <div className="mb-1 text-xs opacity-80">
          {message.author.fullname} · {formatDateTime(message.created_at, '')}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
      </div>
    </div>
  );
}

function SupportModal({ isOpen, onClose, onSuccess }) {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState(TAB_NEW);
  const [message, setMessage] = useState('');
  const [requestType, setRequestType] = useState('support');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const [threads, setThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadsPage, setThreadsPage] = useState(1);
  const [threadsTotalPages, setThreadsTotalPages] = useState(1);
  const [threadsStatus, setThreadsStatus] = useState('open');
  const [threadsSearch, setThreadsSearch] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const maxMessageLength = 512;

  const resetForm = () => {
    setMessage('');
    setRequestType('support');
    setSubmitStatus(null);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveTab(TAB_NEW);
    setThreadsStatus('open');
    setThreadsSearch('');
    setThreadsPage(1);
    setSelectedThreadId(null);
    setSelectedThread(null);
    resetForm();
  }, [isOpen]);

  const loadThreads = async (page = threadsPage, status = threadsStatus, search = threadsSearch) => {
    if (!isAuthenticated) {
      return;
    }

    setThreadsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '10',
        status,
      });
      if (search.trim()) {
        params.set('search', search.trim());
      }

      const response = await fetch(`${API_ENDPOINTS.SUPPORT_MY_THREADS}?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setSubmitStatus({ type: 'error', message: data.detail || 'Не удалось загрузить обращения.' });
        return;
      }

      setThreads(data.threads || []);
      setThreadsTotalPages(Math.max(1, data.total_pages || 1));
      const fallbackId = data.threads?.[0]?.id ?? null;
      setSelectedThreadId((prev) => (prev && data.threads?.some((item) => item.id === prev) ? prev : fallbackId));
    } catch {
      setSubmitStatus({ type: 'error', message: 'Ошибка соединения с сервером.' });
    } finally {
      setThreadsLoading(false);
    }
  };

  const loadThreadDetail = async (threadId) => {
    if (!threadId || !isAuthenticated) {
      setSelectedThread(null);
      return;
    }

    setThreadLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.SUPPORT_MY_THREAD_DETAIL(threadId), {
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setSubmitStatus({ type: 'error', message: data.detail || 'Не удалось открыть обращение.' });
        return;
      }
      setSelectedThread(data.thread);
    } catch {
      setSubmitStatus({ type: 'error', message: 'Ошибка загрузки переписки.' });
    } finally {
      setThreadLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAuthenticated && activeTab === TAB_THREADS) {
      loadThreads(threadsPage, threadsStatus, threadsSearch);
    }
  }, [isOpen, isAuthenticated, activeTab, threadsPage, threadsStatus, threadsSearch]);

  useEffect(() => {
    if (isOpen && isAuthenticated && activeTab === TAB_THREADS) {
      loadThreadDetail(selectedThreadId);
    }
  }, [isOpen, isAuthenticated, activeTab, selectedThreadId]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!message.trim()) {
      setSubmitStatus({
        type: 'error',
        message: 'Пожалуйста, опишите проблему или вопрос.',
      });
      return;
    }

    if (message.trim().length > maxMessageLength) {
      setSubmitStatus({
        type: 'error',
        message: `Максимальная длина обращения ${maxMessageLength} символов.`,
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const headers = await buildCsrfHeaders({
        'Content-Type': 'application/json',
      });
      const response = await fetch(API_ENDPOINTS.SUPPORT_SUBMIT, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          message: message.trim(),
          type: requestType,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setSubmitStatus({
          type: 'error',
          message: data.detail || 'Не удалось отправить обращение.',
        });
        return;
      }

      resetForm();
      onSuccess?.();
      onClose();
    } catch {
      setSubmitStatus({
        type: 'error',
        message: 'Ошибка соединения с сервером.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const threadsCountText = threadsStatus === 'closed'
    ? 'Закрытые обращения'
    : 'Открытые и с ответом';

  return (
    <div className="modal-backdrop fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="modal-panel w-full max-w-6xl rounded-3xl border border-gray-200 bg-white/95 shadow-2xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/95">
        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Поддержка</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Форма обращения и история ваших заявок</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            <X className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <div className="border-b border-gray-200 px-6 py-4 dark:border-slate-700">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab(TAB_NEW)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === TAB_NEW
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-slate-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              Новое обращение
            </button>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => setActiveTab(TAB_THREADS)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeTab === TAB_THREADS
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-slate-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                <ListChecks className="h-4 w-4" />
                Мои обращения
              </button>
            ) : null}
          </div>
        </div>

        {activeTab === TAB_NEW ? (
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <div>
              <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Тип обращения
              </label>
              <div className="grid grid-cols-2 gap-2">
                {REQUEST_TYPES.map((type) => {
                  const Icon = type.icon;
                  const palette = COLOR_CLASSES[type.color];
                  const isSelected = requestType === type.value;

                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setRequestType(type.value)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                        isSelected ? palette.active : palette.idle
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Сообщение
              </label>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={6}
                maxLength={maxMessageLength}
                required
                placeholder="Опишите проблему, вопрос или предложение..."
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
              />
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {message.length}/{maxMessageLength} символов
              </div>
            </div>

            {submitStatus ? (
              <div
                className={`rounded-xl border p-4 text-sm font-medium ${
                  submitStatus.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>{submitStatus.message}</div>
                </div>
              </div>
            ) : null}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-medium text-white transition-all duration-300 hover:scale-[1.02] hover:bg-emerald-600 hover:shadow-lg disabled:scale-100 disabled:bg-emerald-300 disabled:shadow-none"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Отправить заявку
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-gray-100 px-4 py-3 font-medium text-slate-700 transition-colors hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              >
                Отмена
              </button>
            </div>
          </form>
        ) : (
          <div className="grid gap-0 xl:grid-cols-[360px_minmax(0,1fr)]">
            <section className="border-b border-gray-200 p-6 xl:border-b-0 xl:border-r dark:border-slate-700">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setThreadsPage(1);
                    setThreadsStatus('open');
                  }}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    threadsStatus === 'open'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  Не закрытые
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setThreadsPage(1);
                    setThreadsStatus('closed');
                  }}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    threadsStatus === 'closed'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  Закрытые
                </button>
              </div>

              <label className="relative mt-4 block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={threadsSearch}
                  onChange={(event) => {
                    setThreadsPage(1);
                    setThreadsSearch(event.target.value);
                  }}
                  placeholder="Поиск по обращениям"
                  className="w-full rounded-2xl border border-gray-200/70 bg-white/80 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400 dark:border-slate-700/50 dark:bg-slate-900/70 dark:text-slate-100"
                />
              </label>

              <div className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                {threadsCountText}
              </div>

              <div className="mt-4 space-y-3">
                {threadsLoading ? (
                  <div className="rounded-2xl border border-dashed border-gray-300/70 px-4 py-10 text-center text-slate-500 dark:border-slate-700/60 dark:text-slate-400">
                    Загрузка обращений...
                  </div>
                ) : threads.length ? (
                  threads.map((thread) => (
                    <ThreadCard
                      key={thread.id}
                      thread={thread}
                      active={thread.id === selectedThreadId}
                      onClick={() => setSelectedThreadId(thread.id)}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-300/70 px-4 py-10 text-center text-slate-500 dark:border-slate-700/60 dark:text-slate-400">
                    Обращений пока нет
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  disabled={threadsPage <= 1}
                  onClick={() => setThreadsPage((value) => Math.max(1, value - 1))}
                  className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-300"
                >
                  Назад
                </button>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {threadsPage} / {threadsTotalPages}
                </div>
                <button
                  type="button"
                  disabled={threadsPage >= threadsTotalPages}
                  onClick={() => setThreadsPage((value) => Math.min(threadsTotalPages, value + 1))}
                  className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-300"
                >
                  Далее
                </button>
              </div>
            </section>

            <section className="p-6">
              {threadLoading ? (
                <div className="rounded-2xl border border-dashed border-gray-300/70 px-4 py-16 text-center text-slate-500 dark:border-slate-700/60 dark:text-slate-400">
                  Загрузка переписки...
                </div>
              ) : selectedThread ? (
                <>
                  <div className="border-b border-gray-200 pb-4 dark:border-slate-700">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{selectedThread.subject}</h3>
                        <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-500 dark:text-slate-400">
                          <span>{formatDateTime(selectedThread.created_at)}</span>
                          {selectedThread.assigned_moderator ? (
                            <span>Модератор: {selectedThread.assigned_moderator.fullname}</span>
                          ) : null}
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGES[selectedThread.status] || STATUS_BADGES.closed}`}>
                        {STATUS_LABELS[selectedThread.status] || selectedThread.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {selectedThread.messages?.length ? (
                      selectedThread.messages.map((item) => <MessageBubble key={item.id} message={item} />)
                    ) : (
                      <div className="rounded-2xl border border-dashed border-gray-300/70 px-4 py-10 text-center text-slate-500 dark:border-slate-700/60 dark:text-slate-400">
                        В обращении пока нет сообщений
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300/70 px-4 py-16 text-center text-slate-500 dark:border-slate-700/60 dark:text-slate-400">
                  Выберите обращение слева, чтобы посмотреть переписку
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default SupportModal;
