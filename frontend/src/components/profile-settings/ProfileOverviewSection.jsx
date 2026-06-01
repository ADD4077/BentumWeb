import React from 'react';
import {
  Camera,
  Loader2,
  Save,
  Trash2,
  Upload,
  User,
} from 'lucide-react';

import { buildMediaUrl } from '../../utils/media.js';
import { showWarning } from '../../utils/notifications.js';

const MAX_PROFILE_MEDIA_SIZE = 20 * 1024 * 1024;

export default function ProfileOverviewSection({
  banInfo,
  bannerPreview,
  userMedia,
  setBannerFile,
  setBannerPreview,
  bannerInputRef,
  setDeleteModal,
  avatarPreview,
  setAvatarFile,
  setAvatarPreview,
  avatarInputRef,
  user,
  errors,
  handleSubmit,
  loading,
  avatarFile,
  bannerFile,
  resetSelection,
}) {
  return (
    <div className="space-y-6">
      {banInfo ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {banInfo.reason || 'Для аккаунта действуют ограничения, часть действий может быть недоступна.'}
        </div>
      ) : null}

      <div className="rounded-3xl border border-gray-200/70 bg-gray-100/50 p-6 shadow-lg shadow-gray-900/10 dark:border-slate-800/60 dark:bg-[#121927] dark:shadow-black/20 sm:p-8">
        <div className="relative mb-16 h-36 rounded-2xl bg-slate-200 dark:bg-[#1a2230] sm:h-44">
          {(bannerPreview || userMedia?.banner_url) ? (
            <img
              src={bannerPreview || buildMediaUrl(userMedia.banner_url)}
              alt="Banner"
              className="h-full w-full rounded-2xl object-cover"
            />
          ) : null}

          {!banInfo ? (
            <label className="absolute right-3 top-3 flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-slate-300/70 bg-white/92 text-slate-700 shadow-lg dark:border-slate-800/60 dark:bg-[#17202d] dark:text-slate-300">
              <Upload className="h-5 w-5" />
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (file.size > MAX_PROFILE_MEDIA_SIZE) {
                    showWarning('Файл слишком большой. Максимальный размер: 20MB');
                    event.target.value = '';
                    return;
                  }
                  setBannerFile(file);
                  const reader = new FileReader();
                  reader.onload = (loadEvent) => setBannerPreview(loadEvent.target?.result || null);
                  reader.readAsDataURL(file);
                }}
                className="hidden"
              />
            </label>
          ) : null}

          {userMedia?.banner_url && !banInfo ? (
            <button
              onClick={() => setDeleteModal('banner')}
              className="absolute right-16 top-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/90 text-white shadow-lg"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          ) : null}

          <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2">
            <div className="group relative h-24 w-24 overflow-hidden rounded-3xl border-4 border-white bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-800 sm:h-32 sm:w-32">
              {(avatarPreview || userMedia?.avatar_url) ? (
                <img
                  src={avatarPreview || buildMediaUrl(userMedia.avatar_url)}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-200 dark:bg-[#1a2230]">
                  <User className="h-10 w-10 text-slate-400" />
                </div>
              )}

              {!banInfo ? (
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                  <Camera className="h-7 w-7 text-white" />
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (file.size > MAX_PROFILE_MEDIA_SIZE) {
                    showWarning('Файл слишком большой. Максимальный размер: 20MB');
                    event.target.value = '';
                    return;
                  }
                  setAvatarFile(file);
                  const reader = new FileReader();
                  reader.onload = (loadEvent) => setAvatarPreview(loadEvent.target?.result || null);
                      reader.readAsDataURL(file);
                    }}
                    className="hidden"
                  />
                </label>
              ) : null}
            </div>

            {userMedia?.avatar_url && !banInfo ? (
              <button
                onClick={() => setDeleteModal('avatar')}
                className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-red-500/90 text-white shadow-lg transition-colors hover:bg-red-600"
                title="Удалить аватар"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="pt-4 text-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Оформление профиля</h2>
          <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
            Здесь можно менять только аватар и баннер. Личные данные аккаунта теперь находятся отдельно в личном кабинете.
          </p>

          <div className="mb-6 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4 text-left text-sm leading-6 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100">
            <div className="font-semibold">Рекомендации по загрузке</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Максимальный размер файла: 20MB.</li>
              <li>Поддерживаются JPG, PNG, WEBP, AVIF и GIF.</li>
              <li>Аватар лучше использовать квадратный, чтобы он аккуратно отображался в профиле.</li>
              <li>Для баннера лучше выбирать широкое изображение без важного текста по краям.</li>
            </ul>
          </div>

          {errors.general ? (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
              {errors.general}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={handleSubmit}
              disabled={loading || (!avatarFile && !bannerFile) || Boolean(banInfo)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Сохранить изменения
            </button>

            <button
              onClick={resetSelection}
              className="rounded-2xl border border-gray-200/70 bg-gray-100/50 px-5 py-3 font-medium text-slate-700 dark:border-slate-800/60 dark:bg-[#17202d] dark:text-slate-300"
            >
              Сбросить выбор
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
