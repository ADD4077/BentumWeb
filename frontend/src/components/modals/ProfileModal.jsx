import React from 'react';
import { Backpack, Book, Calendar, GraduationCap, LogOut, Settings } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext.jsx';
import { useModal } from '../../contexts/ModalContext.jsx';
import { useUserMedia } from '../../hooks/useUserMedia.js';
import { calculateCourseOrDefault } from '../../utils/calculateCourse.js';
import { formatDateOnly } from '../../utils/dates.js';
import { buildMediaUrl } from '../../utils/media.js';

export const ProfileModal = () => {
  const { isProfileModalOpen, setIsProfileModalOpen, setIsProfileSettingsOpen } = useModal();
  const { user, isAuthenticated, logout } = useAuth();
  const userMedia = useUserMedia(isAuthenticated, user, isProfileModalOpen);

  if (!isProfileModalOpen) return null;

  return (
    <div className="modal-backdrop fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="modal-panel flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white/90 shadow-2xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/90">
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
            ) : userMedia.avatar_placeholder ? (
              <div
                className="flex h-32 w-32 items-center justify-center rounded-2xl border-4 border-white bg-gray-200 font-semibold dark:border-slate-800 dark:bg-slate-700"
                style={{
                  color: 'rgb(156 163 175)',
                  fontSize: userMedia.avatar_placeholder.font_size,
                  fontWeight: userMedia.avatar_placeholder.font_weight,
                }}
              >
                {userMedia.avatar_placeholder.initials}
              </div>
            ) : (
              <div
                className="flex h-32 w-32 items-center justify-center rounded-2xl border-4 border-white bg-gray-300 font-semibold text-gray-600 dark:border-slate-800"
                style={{ fontSize: '300%' }}
              >
                U
              </div>
            )}
          </div>

          {!user?.is_banned ? (
            <button
              onClick={() => setIsProfileSettingsOpen(true)}
              className="absolute top-4 right-16 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/30 bg-white/20 text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/30"
              title="Настройки профиля"
            >
              <Settings className="h-5 w-5" />
            </button>
          ) : null}

          <button
            onClick={() => setIsProfileModalOpen(false)}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/30 bg-white/20 text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/30"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto p-6 pt-20">
          <h3 className="mb-2 text-center text-xl font-bold text-slate-900 dark:text-white">
            {user?.fullname || 'Пользователь'}
          </h3>
          <div className="mb-6 text-center text-xs text-slate-500 dark:text-slate-400">
            ID: {user?.id || 'не определен'}
          </div>

          <div className="w-full space-y-6">
            <div className="flex items-center gap-3 text-left">
              <GraduationCap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-base font-medium text-slate-900 dark:text-white">
                {user?.faculty || 'Не указан'}
              </p>
            </div>

            <div className="flex items-center gap-3 text-left">
              <Book className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-base font-medium text-slate-900 dark:text-white">
                {user?.student_code?.slice(0, 8) || 'Не указано'}
              </p>
            </div>

            <div className="flex items-center gap-3 text-left">
              <Backpack className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-base font-medium text-slate-900 dark:text-white">
                {calculateCourseOrDefault(user?.student_code)}
              </p>
            </div>

            <div className="flex items-center gap-3 text-left">
              <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-base font-medium text-slate-900 dark:text-white">
                {formatDateOnly(user?.created_at)}
              </p>
            </div>

            {user?.is_banned ? (
              <button
                onClick={() => {
                  setIsProfileModalOpen(false);
                  logout();
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 px-5 py-3 font-semibold text-white"
              >
                <LogOut className="h-5 w-5" />
                Выйти
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
