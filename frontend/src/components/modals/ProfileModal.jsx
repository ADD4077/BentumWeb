import React from 'react';
import { GraduationCap, Book, Backpack, Calendar, Settings } from 'lucide-react';
import { useModal } from '../../contexts/ModalContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useUserMedia } from '../../hooks/useUserMedia.js';
import { buildMediaUrl } from '../../utils/media.js';
import { calculateCourseOrDefault } from '../../utils/calculateCourse.js';

export const ProfileModal = () => {
  const { isProfileModalOpen, setIsProfileModalOpen, setIsProfileSettingsOpen } = useModal();
  const { user, isAuthenticated } = useAuth();
  const userMedia = useUserMedia(isAuthenticated, user, isProfileModalOpen);

  if (!isProfileModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-gray-200 dark:border-slate-700 rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="relative h-32">
          {userMedia.banner_url ? (
            <img 
              src={buildMediaUrl(userMedia.banner_url)}
              alt="Profile Banner"
              className="w-full h-full object-cover"
            />
          ) : userMedia.banner_placeholder ? (
            <div className="w-full h-full bg-gray-200 dark:bg-slate-700" />
          ) : (
            <div className="w-full h-full bg-gray-200" />
          )}
          <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
            {userMedia.avatar_url ? (
              <img 
                src={buildMediaUrl(userMedia.avatar_url)}
                alt="Profile Avatar"
                className="w-32 h-32 rounded-2xl object-cover border-4 border-white dark:border-slate-800"
              />
            ) : userMedia.avatar_placeholder ? (
              <div 
                className="w-32 h-32 rounded-2xl border-4 border-white dark:border-slate-800 flex items-center justify-center font-semibold bg-gray-200 dark:bg-slate-700"
                style={{ 
                  color: 'rgb(156 163 175)',
                  fontSize: userMedia.avatar_placeholder.font_size,
                  fontWeight: userMedia.avatar_placeholder.font_weight
                }}
              >
                {userMedia.avatar_placeholder.initials}
              </div>
            ) : (
              <div className="w-32 h-32 rounded-2xl border-4 border-white dark:border-slate-800 bg-gray-300 flex items-center justify-center text-gray-600 font-semibold" style={{ fontSize: '300%' }}>
                U
              </div>
            )}
          </div>
          {/* Кнопка настроек профиля */}
          <button
            onClick={() => setIsProfileSettingsOpen(true)}
            className="absolute top-4 right-16 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 border border-white/30"
            title="Настройки профиля"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsProfileModalOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 border border-white/30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 pt-20 custom-scrollbar">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 text-center">
            {user?.fullname || 'Пользователь'}
          </h3>
          <div className="text-center text-xs text-slate-500 dark:text-slate-400 mb-6">
            ID: {user?.id || 'не определен'}
          </div>
          <div className="w-full space-y-6">
            <div className="text-left flex items-center gap-3">
              <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-base font-medium text-slate-900 dark:text-white">
                {user?.faculty || 'Не указан'}
              </p>
            </div>
            <div className="text-left flex items-center gap-3">
              <Book className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-base font-medium text-slate-900 dark:text-white">
                {user?.student_code?.slice(0, 8) || 'Не указана'}
              </p>
            </div>
            <div className="text-left flex items-center gap-3">
              <Backpack className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-base font-medium text-slate-900 dark:text-white">
                {calculateCourseOrDefault(user?.student_code)}
              </p>
            </div>
            <div className="text-left flex items-center gap-3 mb-8">
              <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-base font-medium text-slate-900 dark:text-white">
                {user?.created_at ? new Date(user.created_at * 1000).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                }) : 'Не указана'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
