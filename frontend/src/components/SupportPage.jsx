import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bug,
  HelpCircle,
  Lightbulb,
  ListChecks,
  Lock,
  MessageCircle,
  Search,
  Send,
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
    <div className={`flex ${message.is_moderator_reply ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-3 ${
          message.is_moderator_reply
            ? 'bg-gray-100 text-slate-900 dark:bg-slate-800/80 dark:text-slate-100'
            : 'bg-emerald-500 text-white'
        }`}
      >
        <div className="mb-1 text-xs opacity-80">
          {message.author.fullname} · {formatDateTime(message.created_at, '')}
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

export default function SupportPage({ setIsLoginModalOpen }) {
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
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);

  const maxMessageLength = 512;

  const resetForm = () => {
    setMessage('');
    setRequestType('support');
  };

  const loadThreads = async (page = threadsPage, status = threadsStatus, search = threadsSearch) => {
    if (!isAuthenticated) return;

    setThreadsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '10',
        status,
      });
      if (search.trim()) params.set('search', search.trim());

      const response = await fetch(`${API_ENDPOINTS.SUPPORT_MY_THREADS}?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setSubmitStatus({ type: 'error', message: data.detail || 'Не удалось загрузить обращения.' });
        return;
      }

      const nextThreads = data.threads || [];
      setThreads(nextThreads);
      setThreadsTotalPages(Math.max(1, data.total_pages || 1));
      setSelectedThreadId((prev) => (prev && nextThreads.some((item) => item.id === prev) ? prev : null));
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
    if (isAuthenticated && activeTab === TAB_THREADS) {
      loadThreads(threadsPage, threadsStatus, threadsSearch);
    }
  }, [isAuthenticated, activeTab, threadsPage, threadsStatus, threadsSearch]);

  useEffect(() => {
    if (isAuthenticated && activeTab === TAB_THREADS) {
      loadThreadDetail(selectedThreadId);
    }
  }, [isAuthenticated, activeTab, selectedThreadId]);

  useEffect(() => {
    if (!isAuthenticated) {
      setActiveTab(TAB_NEW);
      setThreads([]);
      setSelectedThread(null);
      setSelectedThreadId(null);
      setMobileThreadOpen(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!selectedThreadId) {
      setMobileThreadOpen(false);
    }
  }, [selectedThreadId]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!message.trim()) {
      setSubmitStatus({ type: 'error', message: 'Пожалуйста, опишите проблему или вопрос.' });
      return;
    }

    if (message.trim().length > maxMessageLength) {
      setSubmitStatus({ type: 'error', message: `Максимальная длина обращения ${maxMessageLength} символов.` });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' });
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
        setSubmitStatus({ type: 'error', message: data.detail || 'Не удалось отправить обращение.' });
        return;
      }

      resetForm();
      setSubmitStatus({ type: 'success', message: data.message || 'Обращение отправлено.' });
      setActiveTab(TAB_THREADS);
      setThreadsStatus('open');
      setThreadsSearch('');
      setThreadsPage(1);
      setSelectedThreadId(null);
      setSelectedThread(null);
      setMobileThreadOpen(false);
    } catch {
      setSubmitStatus({ type: 'error', message: 'Ошибка соединения с сервером.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openThread = (threadId) => {
    setSelectedThreadId(threadId);
    setMobileThreadOpen(true);
  };

  const threadsCountText = threadsStatus === 'closed' ? 'Закрытые обращения' : 'Не закрытые обращения';

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="mx-auto max-w-[1560px] space-y-6">
        <section className="rounded-[30px] border border-gray-200/70 bg-gray-100/50 p-5 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">Поддержка</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Обращения и ответы модераторов в одном месте
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab(TAB_NEW);
                  setMobileThreadOpen(false);
                }}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  activeTab === TAB_NEW
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300 dark:bg-slate-700/70 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                Новое обращение
              </button>
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => setActiveTab(TAB_THREADS)}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    activeTab === TAB_THREADS
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300 dark:bg-slate-700/70 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  <ListChecks className="h-4 w-4" />
                  Мои обращения
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {!isAuthenticated ? (
          <section className="rounded-[30px] border border-gray-200/70 bg-gray-100/50 p-5 sm:p-8 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20">
            <div className="mx-auto max-w-xl text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                <Lock className="h-8 w-8" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-slate-900 dark:text-white">Нужен вход в аккаунт</h2>
              <p className="mt-2 text-slate-500 dark:text-slate-400">
                Чтобы отправлять обращения и видеть историю ответов, войдите в аккаунт Bentum.
              </p>
              <button
                type="button"
                onClick={() => setIsLoginModalOpen?.(true)}
                className="mt-6 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                Войти
              </button>
            </div>
          </section>
        ) : activeTab === TAB_NEW ? (
          <section className="rounded-[30px] border border-gray-200/70 bg-gray-100/50 p-4 sm:p-6 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Тип обращения
                </label>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {REQUEST_TYPES.map((type) => {
                    const Icon = type.icon;
                    const palette = COLOR_CLASSES[type.color];
                    const isSelected = requestType === type.value;

                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setRequestType(type.value)}
                        className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
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
                  rows={8}
                  maxLength={maxMessageLength}
                  required
                  placeholder="Опишите проблему, вопрос или предложение..."
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-500 outline-none transition focus:border-emerald-400 dark:border-slate-600 dark:bg-slate-900/70 dark:text-white dark:placeholder-slate-400"
                />
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {message.length}/{maxMessageLength} символов
                </div>
              </div>

              {submitStatus ? (
                <div
                  className={`rounded-2xl border p-4 text-sm font-medium ${
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

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Отправка...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Отправить обращение
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <div className="grid gap-4 sm:gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
            <section className={`rounded-[30px] border border-gray-200/70 bg-gray-100/50 p-4 sm:p-5 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20 ${mobileThreadOpen ? 'hidden xl:block' : ''}`}>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setThreadsPage(1);
                    setThreadsStatus('open');
                    setMobileThreadOpen(false);
                  }}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    threadsStatus === 'open'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200/80 text-slate-700 dark:bg-slate-700/70 dark:text-slate-300'
                  }`}
                >
                  Не закрытые
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setThreadsPage(1);
                    setThreadsStatus('closed');
                    setMobileThreadOpen(false);
                  }}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    threadsStatus === 'closed'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200/80 text-slate-700 dark:bg-slate-700/70 dark:text-slate-300'
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
                    setMobileThreadOpen(false);
                  }}
                  placeholder="Поиск по обращениям"
                  className="w-full rounded-2xl border border-gray-200/70 bg-white/80 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400 dark:border-slate-700/50 dark:bg-slate-900/70 dark:text-slate-100"
                />
              </label>

              <div className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                {threadsCountText}
              </div>

              <div className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto pr-1 sm:max-h-[640px]">
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
                      onClick={() => openThread(thread.id)}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-300/70 px-4 py-10 text-center text-slate-500 dark:border-slate-700/60 dark:text-slate-400">
                    Обращений пока нет
                  </div>
                )}
              </div>

              <Pager page={threadsPage} totalPages={threadsTotalPages} onChange={setThreadsPage} />
            </section>

            <section className={`rounded-[30px] border border-gray-200/70 bg-gray-100/50 p-4 sm:p-6 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20 ${mobileThreadOpen ? '' : 'hidden xl:block'}`}>
              <div className="mb-4 xl:hidden">
                <button
                  type="button"
                  onClick={() => setMobileThreadOpen(false)}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-200/80 px-3 py-2 text-sm font-medium text-slate-700 dark:bg-slate-700/70 dark:text-slate-300"
                >
                  <ArrowLeft className="h-4 w-4" />
                  К списку
                </button>
              </div>

              {threadLoading ? (
                <div className="rounded-2xl border border-dashed border-gray-300/70 px-4 py-16 text-center text-slate-500 dark:border-slate-700/60 dark:text-slate-400">
                  Загрузка переписки...
                </div>
              ) : selectedThread ? (
                <>
                  <div className="border-b border-gray-200 pb-4 dark:border-slate-700">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{selectedThread.subject}</h2>
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

                  <div className="mt-5 max-h-[52vh] space-y-4 overflow-y-auto pr-1 sm:max-h-[720px]">
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
                  Выберите тему из списка, чтобы открыть чат
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
