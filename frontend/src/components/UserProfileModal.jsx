import React, { useEffect, useState } from 'react';
import {
  Calendar,
  GraduationCap,
  Book,
  Backpack,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { API_ENDPOINTS } from '../config/api.js';
import { buildMediaUrl } from '../utils/media.js';
import { calculateCourseOrDefault } from '../utils/calculateCourse.js';

function formatUnixDate(timestamp) {
  if (!timestamp) {
    return 'Не указана';
  }

  return new Date(timestamp * 1000).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatIsoDate(dateString) {
  if (!dateString) {
    return 'Не указан';
  }

  return new Date(dateString).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function InfoRow({ icon: Icon, label, value, className = '' }) {
  return (
    <div className={`text-left flex items-start gap-3 ${className}`.trim()}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="text-base font-medium text-slate-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
}

function AlertInfoRow({ icon: Icon, label, value, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left dark:border-red-500/30 dark:bg-red-500/10 ${className}`.trim()}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-red-500 dark:text-red-300">
            {label}
          </p>
          <p className="text-base font-semibold text-red-700 dark:text-red-200">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function UserProfileModal({ isOpen, onClose, studentCode, darkMode: _darkMode }) {
  const [user, setUser] = useState(null);
  const [userMedia, setUserMedia] = useState({
    avatar_url: null,
    banner_url: null,
    avatar_placeholder: null,
    banner_placeholder: null,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && studentCode) {
      loadUserProfile();
    }
  }, [isOpen, studentCode]);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}/api/user/by-code/${studentCode}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        onClose();
        return;
      }

      const data = await response.json();

      if (!data?.success || !data?.user) {
        onClose();
        return;
      }

      setUser(data.user);
      setUserMedia({
        avatar_url: data.user.avatar_url,
        banner_url: data.user.banner_url,
        avatar_placeholder: data.user.avatar_placeholder,
        banner_placeholder: data.user.banner_placeholder,
      });
    } catch {
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white/90 shadow-2xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/90">
        <div className="relative h-32">
          {userMedia.banner_url ? (
            <img
              src={buildMediaUrl(userMedia.banner_url)}
              alt="Profile Banner"
              className="h-full w-full object-cover"
            />
          ) : userMedia.banner_placeholder ? (
            <div className="h-full w-full bg-gray-200 dark:bg-slate-700" />
          ) : (
            <div className="h-full w-full bg-gray-200" />
          )}

          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 transform">
            {userMedia.avatar_url ? (
              <img
                src={buildMediaUrl(userMedia.avatar_url)}
                alt="Profile Avatar"
                className="h-32 w-32 rounded-2xl border-4 border-white object-cover dark:border-slate-800"
              />
            ) : (
              <div
                className="flex h-32 w-32 items-center justify-center rounded-2xl border-4 border-white bg-gray-300 font-semibold text-gray-600 dark:border-slate-800"
                style={{ fontSize: '300%' }}
              >
                {user?.fullname?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/30 bg-white/20 text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/30"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto p-6 pt-20">
          {loading ? (
            <div className="flex w-full items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-600" />
            </div>
          ) : (
            <>
              <h3 className="mb-2 text-center text-xl font-bold text-slate-900 dark:text-white">
                {user?.fullname || 'Пользователь'}
              </h3>

              <div className="mb-6 text-center text-xs text-slate-500 dark:text-slate-400">
                ID: {user?.id || 'не определен'}
              </div>

              <div className="w-full space-y-6">
                <InfoRow
                  icon={GraduationCap}
                  label="Факультет"
                  value={user?.faculty || 'Не указан'}
                />

                <InfoRow
                  icon={Book}
                  label="Студенческий код"
                  value={user?.student_code?.slice(0, 8) || 'Не указан'}
                />

                <InfoRow
                  icon={Backpack}
                  label="Курс"
                  value={calculateCourseOrDefault(user?.student_code)}
                />

                <InfoRow
                  icon={Calendar}
                  label="Дата регистрации"
                  value={formatUnixDate(user?.created_at)}
                />

                <InfoRow
                  icon={Clock}
                  label="Последний вход"
                  value={formatUnixDate(user?.last_login)}
                />

                {user?.is_banned ? (
                  <AlertInfoRow
                    icon={ShieldAlert}
                    label="Срок бана"
                    value={formatIsoDate(user?.ban_info?.ban_end_date)}
                    className="mb-2"
                  />
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
