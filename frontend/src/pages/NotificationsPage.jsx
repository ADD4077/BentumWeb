import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, LogIn, MessageCircle, Shield } from 'lucide-react';

import { API_ENDPOINTS } from '../config/api.js';

const PAGE_SIZE = 12;

const TYPE_META = {
  support_reply: {
    icon: MessageCircle,
    iconClassName: 'text-sky-600 dark:text-sky-400',
  },
  login_success: {
    icon: LogIn,
    iconClassName: 'text-emerald-600 dark:text-emerald-400',
  },
  password_changed: {
    icon: Shield,
    iconClassName: 'text-amber-600 dark:text-amber-400',
  },
  twofa_enabled: {
    icon: Shield,
    iconClassName: 'text-emerald-600 dark:text-emerald-400',
  },
  twofa_disabled: {
    icon: Shield,
    iconClassName: 'text-rose-600 dark:text-rose-400',
  },
};

const formatNotificationDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function NotificationsPage({ setActiveTab }) {
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const sentinelRef = useRef(null);

  const loadNotifications = async (nextPage = 1, replace = false) => {
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        page_size: String(PAGE_SIZE),
      });
      const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.detail || 'Не удалось загрузить уведомления');
      }

      setNotifications((current) => (replace ? (data.notifications || []) : [...current, ...(data.notifications || [])]));
      setPage(data.page || nextPage);
      setHasMore(Boolean(data.has_more));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Не удалось загрузить уведомления');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(1, true);
  }, []);

  useEffect(() => {
    if (!hasMore || initialLoading) {
      return undefined;
    }

    const node = sentinelRef.current;
    if (!node) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !loading && hasMore) {
          loadNotifications(page + 1, false);
        }
      },
      { rootMargin: '240px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, initialLoading, loading, page]);

  const items = useMemo(
    () =>
      notifications.map((notification) => {
        const meta = TYPE_META[notification.type] || TYPE_META.login_success;
        const Icon = meta.icon;

        return (
          <article
            key={notification.id}
            className="glass-card rounded-2xl border border-gray-200/70 bg-gray-100/50 p-5 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20"
          >
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/90 dark:bg-slate-800">
                <Icon className={`h-5 w-5 ${meta.iconClassName}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      {notification.title}
                    </h3>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {notification.body}
                    </p>
                  </div>
                  <div className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                    {formatNotificationDate(notification.created_at)}
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      }),
    [notifications],
  );

  return (
    <section className="mx-auto w-full max-w-5xl px-1 pb-6 pt-6 sm:px-2">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Bell className="h-3.5 w-3.5" />
            Уведомления
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Все уведомления
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Последние события аккаунта, ответы поддержки и уведомления о безопасности Бентум.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('home')}
          className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          На главную
        </button>
      </div>

      {initialLoading ? (
        <div className="rounded-2xl border border-gray-200/70 bg-gray-100/50 px-5 py-8 text-sm text-slate-500 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-400 dark:shadow-black/20">
          Загружаем уведомления...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50 px-5 py-8 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-gray-200/70 bg-gray-100/50 px-5 py-8 text-sm text-slate-500 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-400 dark:shadow-black/20">
          Пока уведомлений нет.
        </div>
      ) : (
        <div className="space-y-4">
          {items}
          <div ref={sentinelRef} className="h-4" />
          {loading ? (
            <div className="py-2 text-center text-sm text-slate-500 dark:text-slate-400">
              Загружаем ещё...
            </div>
          ) : null}
          {!hasMore ? (
            <div className="py-2 text-center text-sm text-slate-400 dark:text-slate-500">
              Это все уведомления.
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

export default NotificationsPage;
