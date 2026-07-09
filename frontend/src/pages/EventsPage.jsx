import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle,
  Eye,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  UserRoundX,
  Users,
  X,
} from 'lucide-react';

import AdminPagination from '../components/admin/AdminPagination.jsx';
import UserProfileModal from '../components/UserProfileModal.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useEvents } from '../hooks/useEvents.js';
import { buildMediaUrl } from '../utils/media.js';
import { showError, showSuccess } from '../utils/notifications.js';

const STATUS_STYLES = {
  active: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20',
  in_progress: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/20',
  completed: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/20',
};

function formatDateTime(value) {
  if (!value) {
    return 'Дата не указана';
  }

  const date = new Date(value);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toDateTimeLocalValue(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const normalized = new Date(date.getTime() - offset * 60_000);
  return normalized.toISOString().slice(0, 16);
}

function statusLabelFromValue(status) {
  if (status === 'in_progress') {
    return 'В процессе';
  }
  if (status === 'completed') {
    return 'Завершено';
  }
  return 'Активно';
}

function EmptyState({ canManage }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/90 px-6 py-12 text-center shadow-[0_32px_120px_rgba(3,8,20,0.12)] dark:border-slate-800/80 dark:bg-[#141c28]/80">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800/80 dark:text-slate-300">
        <CalendarDays className="h-7 w-7" />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Мероприятий пока нет</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">
        {canManage
          ? 'Создайте первое мероприятие, и оно появится в общей сети для студентов.'
          : 'Когда преподаватели добавят мероприятие, здесь появятся карточки с описанием, временем и кнопкой участия.'}
      </p>
    </div>
  );
}

function EventFormModal({ mode, initialEvent, saving, onClose, onSubmit, darkMode }) {
  const isDark = darkMode;
  const [title, setTitle] = useState(initialEvent?.title || '');
  const [description, setDescription] = useState(initialEvent?.description || '');
  const [location, setLocation] = useState(initialEvent?.location || '');
  const [startsAt, setStartsAt] = useState(toDateTimeLocalValue(initialEvent?.starts_at));
  const [maxParticipants, setMaxParticipants] = useState(
    initialEvent?.max_participants ? String(initialEvent.max_participants) : '10',
  );
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerName, setBannerName] = useState(initialEvent?.banner_url ? 'Текущий баннер' : '');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!title.trim() || !description.trim() || !startsAt) {
      showError('Заполните название, описание и дату мероприятия.');
      return;
    }

    if (mode === 'create' && !bannerFile) {
      showError('Для нового мероприятия нужен баннер.');
      return;
    }

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('location', location.replace(/\r?\n/g, ' ').trim());
    formData.append('starts_at', new Date(startsAt).toISOString());
    formData.append('max_participants', String(Math.max(1, Number.parseInt(maxParticipants, 10) || 1)));
    if (bannerFile) {
      formData.append('banner', bannerFile);
    }

    await onSubmit(formData);
  };

  const modalContent = (
    <div className="modal-backdrop fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className={`modal-panel w-full max-w-2xl rounded-3xl border shadow-2xl backdrop-blur-md ${
        isDark ? 'border-slate-700 bg-slate-800/90' : 'border-slate-200 bg-white/95'
      }`}>
        <div className={`flex items-center justify-between border-b px-6 py-5 ${
          isDark ? 'border-slate-800/80' : 'border-slate-200'
        }`}>
          <div>
            <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {mode === 'create' ? 'Новое мероприятие' : 'Редактирование мероприятия'}
            </h3>
            <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Баннер автоматически оптимизируется и сохраняется в одной версии.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
              isDark
                ? 'border-slate-700/80 text-slate-300 hover:border-slate-600 hover:text-white'
                : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900'
            }`}
          >
            Закрыть
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Название</span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-emerald-500/60 ${
                  isDark
                    ? 'border-slate-700/80 bg-slate-900/70 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-900'
                }`}
                placeholder="Например: День кафе"
                maxLength={255}
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Краткое описание</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={`min-h-[132px] w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-emerald-500/60 ${
                  isDark
                    ? 'border-slate-700/80 bg-slate-900/70 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-900'
                }`}
                placeholder="Кратко объясните, что это мероприятие и зачем оно проводится."
                maxLength={1024}
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Место проведения</span>
              <input
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value.replace(/[\r\n]+/g, ' '))}
                className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-emerald-500/60 ${
                  isDark
                    ? 'border-slate-700/80 bg-slate-900/70 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-900'
                }`}
                placeholder="Например: Актовый зал, корпус 2"
                maxLength={255}
              />
            </label>

            <label className="space-y-2">
              <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Дата и время</span>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-emerald-500/60 ${
                  isDark
                    ? 'border-slate-700/80 bg-slate-900/70 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-900'
                }`}
              />
            </label>

            <label className="space-y-2">
              <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Максимум участников</span>
              <input
                type="number"
                min="1"
                max="5000"
                value={maxParticipants}
                onChange={(event) => setMaxParticipants(event.target.value)}
                className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-emerald-500/60 ${
                  isDark
                    ? 'border-slate-700/80 bg-slate-900/70 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-900'
                }`}
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                Баннер {mode === 'create' ? '' : '(можно изменить)'}
              </span>
              <label className={`flex cursor-pointer items-center justify-between rounded-2xl border border-dashed px-4 py-3 text-sm transition hover:border-emerald-500/40 ${
                isDark
                  ? 'border-slate-700/80 bg-slate-900/60 text-slate-300'
                  : 'border-slate-300 bg-slate-50 text-slate-600'
              }`}>
                <span className="truncate pr-4">{bannerName || 'Выберите изображение'}</span>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Загрузить
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setBannerFile(file);
                    setBannerName(file?.name || '');
                  }}
                />
              </label>
            </label>
          </div>

          <div className={`flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end ${
            isDark ? 'border-slate-800/80' : 'border-slate-200'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-2xl border px-5 py-3 text-sm font-medium transition ${
                isDark
                  ? 'border-slate-700/80 text-slate-300 hover:border-slate-600 hover:text-white'
                  : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900'
              }`}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === 'create' ? 'Создать мероприятие' : 'Сохранить изменения'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? modalContent : createPortal(modalContent, document.body);
}

function ParticipantsModal({
  eventTitle,
  eventStatus,
  participants,
  loading,
  removingId,
  savingAttendance,
  attendanceDraftIds,
  onClose,
  onViewProfile,
  onRemove,
  onToggleAttendance,
  onSaveAttendance,
  darkMode,
}) {
  const isDark = darkMode;
  const canRemove = eventStatus === 'active';
  const canMarkAttendance = eventStatus === 'in_progress';
  const draftSet = new Set(attendanceDraftIds);

  const modalContent = (
    <div className="modal-backdrop fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className={`modal-panel w-full max-w-2xl rounded-3xl border shadow-2xl backdrop-blur-md ${
        isDark ? 'border-slate-700 bg-slate-800/90' : 'border-slate-200 bg-white/95'
      }`}>
        <div className={`flex items-center justify-between border-b px-6 py-5 ${
          isDark ? 'border-slate-800/80' : 'border-slate-200'
        }`}>
          <div>
            <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Участники</h3>
            <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{eventTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
              isDark
                ? 'border-slate-700/80 text-slate-300 hover:border-slate-600 hover:text-white'
                : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900'
            }`}
          >
            Закрыть
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-300">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : participants.length === 0 ? (
            <div className={`rounded-2xl border px-4 py-10 text-center text-sm ${
              isDark
                ? 'border-slate-800/80 bg-slate-900/50 text-slate-400'
                : 'border-slate-200 bg-slate-50 text-slate-500'
            }`}>
              Участников пока нет.
            </div>
          ) : (
            <div className="space-y-3">
              {participants.map((participant) => {
                const attended = draftSet.has(participant.id);

                return (
                  <div
                    key={participant.id}
                    className={`rounded-2xl border px-4 py-4 ${
                      isDark
                        ? 'border-slate-800/80 bg-slate-900/50'
                        : 'border-slate-200 bg-slate-50/90'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{participant.fullname}</div>
                        <div className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {participant.student_code} В· {participant.faculty || 'Факультет не указан'}
                        </div>
                        <div className={`mt-1 text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{formatDateTime(participant.joined_at)}</div>
                      </div>
                      <div className="flex items-center self-center gap-2">
                        <button
                          type="button"
                          onClick={() => onViewProfile(participant.student_code)}
                          className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border shadow-[0_10px_24px_rgba(2,6,23,0.08)] transition hover:-translate-y-0.5 ${
                            isDark
                              ? 'border-slate-700/80 bg-slate-900/70 text-slate-200 hover:border-sky-500/40 hover:text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-sky-400 hover:text-sky-600'
                          }`}
                          aria-label="Открыть профиль"
                          title="Открыть профиль"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {canMarkAttendance ? (
                          <button
                            type="button"
                            onClick={() => onToggleAttendance(participant.id)}
                            className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border shadow-[0_10px_24px_rgba(2,6,23,0.18)] transition hover:-translate-y-0.5 ${
                              attended
                                ? 'border-emerald-500/45 bg-emerald-500/15 text-emerald-300 hover:border-emerald-400/60'
                                : isDark
                                  ? 'border-slate-700/80 bg-slate-900/70 text-slate-300 hover:border-slate-500/80 hover:text-white'
                                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800'
                            }`}
                            aria-label={attended ? 'Снять отметку участия' : 'Отметить участие'}
                            title={attended ? 'Снять отметку участия' : 'Отметить участие'}
                          >
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                                attended ? 'border-emerald-400 bg-emerald-500/20' : 'border-slate-500/80'
                              }`}
                            >
                              {attended ? <Check className="h-3.5 w-3.5" /> : null}
                            </div>
                          </button>
                        ) : null}

                        {canRemove ? (
                          <button
                            type="button"
                            disabled={removingId === participant.id}
                            onClick={() => onRemove(participant)}
                            className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border shadow-[0_10px_24px_rgba(2,6,23,0.08)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
                              isDark
                                ? 'border-slate-700/80 bg-slate-900/70 text-rose-300 hover:border-rose-500/40 hover:text-rose-200'
                                : 'border-slate-200 bg-white text-rose-500 hover:border-rose-300 hover:text-rose-600'
                            }`}
                            aria-label="Удалить из участников"
                            title="Удалить из участников"
                          >
                            {removingId === participant.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserRoundX className="h-4 w-4" />
                            )}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {canMarkAttendance ? (
          <div className={`flex justify-end border-t px-6 py-5 ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
            <button
              type="button"
              onClick={onSaveAttendance}
              disabled={loading || savingAttendance}
              className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingAttendance ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Сохранить
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );

  return typeof document === 'undefined' ? modalContent : createPortal(modalContent, document.body);
}

function EventDetailsModal({ event, onClose, darkMode }) {
  if (!event) {
    return null;
  }

  const isDark = darkMode;
  const bannerUrl = buildMediaUrl(event.banner_url);
  const statusClassName = STATUS_STYLES[event.status] || STATUS_STYLES.active;
  const participantRatio = event.participant_ratio || `${event.participant_count ?? 0}/${event.max_participants}`;

  const modalContent = (
    <div className="modal-backdrop fixed inset-0 z-[155] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className={`modal-panel w-full max-w-3xl overflow-hidden rounded-3xl border shadow-2xl ${
        isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
      }`}>
        <div className="relative">
          <div className={`relative aspect-[16/6] overflow-hidden ${isDark ? 'bg-slate-900/70' : 'bg-slate-100'}`}>
            {bannerUrl ? (
              <img src={bannerUrl} alt={event.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-500">
                <CalendarDays className="h-12 w-12" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            <div className="absolute left-5 top-5 flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassName}`}>
                {event.status_label || statusLabelFromValue(event.status)}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm ${
                isDark ? 'bg-black/35 text-white' : 'bg-white/85 text-slate-700'
              }`}>
                {participantRatio}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
              isDark ? 'bg-slate-900/70 text-slate-300 hover:bg-slate-800 hover:text-white' : 'bg-white/90 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
            aria-label="Закрыть модальное окно"
            title="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{event.title}</h3>
            <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {event.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className={`rounded-2xl border px-4 py-4 ${
              isDark ? 'border-slate-700/80 bg-slate-900/55' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 h-5 w-5 text-emerald-400" />
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Дата и время
                  </p>
                  <p className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {formatDateTime(event.starts_at)}
                  </p>
                </div>
              </div>
            </div>

            <div className={`rounded-2xl border px-4 py-4 ${
              isDark ? 'border-slate-700/80 bg-slate-900/55' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-5 w-5 text-sky-400" />
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Участники
                  </p>
                  <p className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {participantRatio}
                  </p>
                </div>
              </div>
            </div>

            <div className={`rounded-2xl border px-4 py-4 ${
              isDark ? 'border-slate-700/80 bg-slate-900/55' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-rose-400" />
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Место проведения
                  </p>
                  <p className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {event.location || 'Не указано'}
                  </p>
                </div>
              </div>
            </div>

            <div className={`rounded-2xl border px-4 py-4 ${
              isDark ? 'border-slate-700/80 bg-slate-900/55' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-start gap-3">
                <Eye className="mt-0.5 h-5 w-5 text-violet-400" />
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Статус
                  </p>
                  <p className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {event.status_label || statusLabelFromValue(event.status)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl border px-4 py-4 ${
            isDark ? 'border-slate-700/80 bg-slate-900/55' : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-start gap-3">
              <Eye className="mt-0.5 h-5 w-5 text-violet-400" />
              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Организатор
                </p>
                {event.created_by_student_code ? (
                  <button
                    type="button"
                    onClick={() => setParticipantProfileCode(event.created_by_student_code)}
                    className={`mt-2 text-left text-sm font-medium transition hover:underline ${
                      isDark ? 'text-white hover:text-emerald-300' : 'text-slate-900 hover:text-emerald-600'
                    }`}
                  >
                    {event.created_by_name || 'Не указан'}
                  </button>
                ) : (
                  <p className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {event.created_by_name || 'Не указан'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? modalContent : createPortal(modalContent, document.body);
}

function ConfirmDeleteEventModal({ event, loading, onClose, onConfirm, darkMode }) {
  if (!event) {
    return null;
  }
  const isDark = darkMode;

  const modalContent = (
    <div className="modal-backdrop fixed inset-0 z-[160] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className={`modal-panel w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl ${
        isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
      }`}>
        <div className="relative p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Удалить мероприятие</h3>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Подтвердите удаление карточки мероприятия</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
              }`}
              aria-label="Закрыть модальное окно"
              title="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className={`mb-6 rounded-2xl border p-4 ${
            isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50'
          }`}>
            <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{event.title}</p>
            <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {event.participant_ratio || `${event.participant_count ?? 0}/${event.max_participants}`} участников
            </p>
          </div>

        <div className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className={`mt-0.5 h-5 w-5 flex-shrink-0 ${isDark ? 'text-amber-300' : 'text-amber-600'}`} />
            <div>
              <p className={`font-semibold ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>Внимание</p>
              <p className={`mt-1 text-sm ${isDark ? 'text-amber-100/80' : 'text-amber-700'}`}>
                Мероприятие будет полностью удалено, это действие нельзя отменить.
              </p>
            </div>
          </div>
        </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 rounded-2xl px-6 py-3 font-medium transition-colors ${
                isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => onConfirm(event)}
              disabled={loading}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-6 py-3 font-medium text-white transition-all ${
                loading
                  ? 'cursor-not-allowed bg-slate-500'
                  : 'bg-rose-500 hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-500/20'
              }`}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Удаление...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Удалить
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? modalContent : createPortal(modalContent, document.body);
}

function ConfirmCompleteEventModal({ event, loading, onClose, onConfirm, darkMode }) {
  if (!event) {
    return null;
  }
  const isDark = darkMode;

  const modalContent = (
    <div className="modal-backdrop fixed inset-0 z-[160] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className={`modal-panel w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl ${
        isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
      }`}>
        <div className="relative p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Завершить мероприятие</h3>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Подтвердите завершение текущего мероприятия</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
              }`}
              aria-label="Закрыть модальное окно"
              title="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className={`mb-6 rounded-2xl border p-4 ${
            isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50'
          }`}>
            <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{event.title}</p>
            <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {event.participant_ratio || `${event.participant_count ?? 0}/${event.max_participants}`} участников
            </p>
          </div>

          <div className={`mb-6 rounded-2xl border p-4 ${
            isDark
              ? 'border-amber-500/25 bg-amber-500/10'
              : 'border-amber-300 bg-amber-50'
          }`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
                isDark ? 'text-amber-300' : 'text-amber-600'
              }`} />
              <div>
                <p className={`font-semibold ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>Внимание</p>
                <p className={`mt-1 text-sm ${isDark ? 'text-amber-100/80' : 'text-amber-700'}`}>
                  После завершения мероприятия оно исключено из общего списка. Список участников и отзывы будут
                  сохранятся в базе данных.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 rounded-2xl px-6 py-3 font-medium transition-colors ${
                isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => onConfirm(event)}
              disabled={loading}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-6 py-3 font-medium text-white transition-all ${
                loading
                  ? 'cursor-not-allowed bg-slate-500'
                  : 'bg-emerald-500 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20'
              }`}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Завершение...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Завершить
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? modalContent : createPortal(modalContent, document.body);
}

function ConfirmRemoveParticipantModal({ participant, loading, onClose, onConfirm, darkMode }) {
  if (!participant) {
    return null;
  }
  const isDark = darkMode;

  const modalContent = (
    <div className="modal-backdrop fixed inset-0 z-[160] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className={`modal-panel w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl ${
        isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
      }`}>
        <div className="relative p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
                <UserRoundX className="h-6 w-6" />
              </div>
              <div>
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Убрать участника</h3>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Подтвердите удаление участника из мероприятия</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
              }`}
              aria-label="Закрыть модальное окно"
              title="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className={`mb-6 rounded-2xl border p-4 ${
            isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50'
          }`}>
            <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{participant.fullname}</p>
            <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {participant.student_code} {participant.faculty ? `· ${participant.faculty}` : ''}
            </p>
          </div>

          <div className={`mb-6 rounded-2xl border p-4 ${
            isDark
              ? 'border-amber-500/25 bg-amber-500/10'
              : 'border-amber-300 bg-amber-50'
          }`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
                isDark ? 'text-amber-300' : 'text-amber-600'
              }`} />
              <div>
                <p className={`font-semibold ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>Внимание</p>
                <p className={`mt-1 text-sm ${isDark ? 'text-amber-100/80' : 'text-amber-700'}`}>
                  Пользователь будет удалён из списка участников этого мероприятия. Это действие можно будет
                  выполнить повторно только через новую запись.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 rounded-2xl px-6 py-3 font-medium transition-colors ${
                isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => onConfirm(participant)}
              disabled={loading}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-6 py-3 font-medium text-white transition-all ${
                loading
                  ? 'cursor-not-allowed bg-slate-500'
                  : 'bg-rose-500 hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-500/20'
              }`}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Удаление...
                </>
              ) : (
                <>
                  <UserRoundX className="h-5 w-5" />
                  Удалить
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? modalContent : createPortal(modalContent, document.body);
}

function EventCard({
  item,
  isAuthenticated,
  canManage,
  joining,
  completing,
  onJoinToggle,
  onEdit,
  onDelete,
  onParticipants,
  onComplete,
  onOpenDetails,
  onRequireLogin,
  darkMode,
}) {
  const isDark = darkMode;
  const bannerUrl = buildMediaUrl(item.banner_url);
  const statusClassName = STATUS_STYLES[item.status] || STATUS_STYLES.active;
  const joined = Boolean(item.user_joined);
  const participantRatio = item.participant_ratio || `${item.participant_count ?? 0}/${item.max_participants}`;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetails(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenDetails(item);
        }
      }}
      className={`overflow-hidden rounded-3xl border shadow-[0_32px_120px_rgba(3,8,20,0.16)] transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 ${
        isDark
          ? 'border-slate-800/80 bg-[#141c28]/85'
          : 'border-slate-200/70 bg-white/92'
      }`}
    >
      <div className={`relative aspect-[16/6] overflow-hidden ${isDark ? 'bg-slate-900/70' : 'bg-slate-100'}`}>
        {bannerUrl ? (
          <img src={bannerUrl} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500">
            <CalendarDays className="h-10 w-10" />
          </div>
        )}
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassName}`}>
            {statusLabelFromValue(item.status)}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm ${
            isDark ? 'bg-black/35 text-white' : 'bg-white/80 text-slate-700'
          }`}>
            {participantRatio}
          </span>
        </div>
      </div>

      <div className="space-y-4 px-5 py-5">
        <div className="space-y-2">
          <h3 className={`line-clamp-2 text-xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.title}</h3>
          <p className={`line-clamp-3 text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{item.description}</p>
        </div>

        <div className={`space-y-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-emerald-400" />
              {formatDateTime(item.starts_at)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-sky-400" />
              {participantRatio}
            </span>
          </div>
          {item.location ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-rose-400" />
                <span className="truncate">{item.location}</span>
              </span>
            </div>
          ) : null}
        </div>

        {canManage ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onParticipants(item);
              }}
              className={`inline-flex h-12 items-center justify-center rounded-2xl border transition ${
                isDark
                  ? 'border-slate-700/80 bg-slate-900/70 text-slate-200 hover:border-sky-500/40 hover:text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-sky-300 hover:text-sky-600'
              } ${
                item.can_complete ? 'w-12 shrink-0' : 'min-w-0 flex-1'
              }`}
              aria-label="Участники мероприятия"
              title="Участники"
            >
              <Users className="h-4 w-4" />
            </button>

            {item.can_edit ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(item);
                }}
                className={`inline-flex h-12 min-w-0 flex-1 items-center justify-center rounded-2xl border transition ${
                  isDark
                    ? 'border-slate-700/80 bg-slate-900/70 text-slate-200 hover:border-emerald-500/40 hover:text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-300 hover:text-emerald-600'
                }`}
                aria-label="Редактировать мероприятие"
                title="Редактировать"
              >
                <Pencil className="h-4 w-4" />
              </button>
            ) : null}

            {item.can_delete ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(item);
                }}
                className={`inline-flex h-12 min-w-0 flex-1 items-center justify-center rounded-2xl border transition ${
                  isDark
                    ? 'border-slate-700/80 bg-slate-900/70 text-rose-300 hover:border-rose-500/40 hover:text-rose-200'
                    : 'border-slate-200 bg-slate-50 text-rose-500 hover:border-rose-300 hover:text-rose-600'
                }`}
                aria-label="Удалить мероприятие"
                title="Удалить"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}

            {item.can_complete ? (
              <button
                type="button"
                disabled={completing}
                onClick={(event) => {
                  event.stopPropagation();
                  onComplete(item);
                }}
                className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-emerald-300 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span className="text-sm font-medium">Завершить</span>
              </button>
            ) : null}
          </div>
        ) : item.status === 'in_progress' ? (
          <div
            className={`rounded-2xl px-4 py-3 text-center text-sm font-medium ${
              joined
                ? 'border border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                : isDark
                  ? 'border border-slate-700/80 bg-slate-900/60 text-slate-400'
                  : 'border border-slate-200 bg-slate-50 text-slate-500'
            }`}
          >
            {joined ? 'Вы участвуете' : 'Регистрация закрыта'}
          </div>
        ) : (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (!isAuthenticated) {
                onRequireLogin();
                return;
              }
              onJoinToggle(item);
            }}
            disabled={joining || (isAuthenticated && !joined && !item.can_join)}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              joined
                ? 'border border-emerald-500/35 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15'
                : 'bg-emerald-500 text-white hover:bg-emerald-400'
            } disabled:cursor-not-allowed disabled:opacity-55`}
          >
            {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {!isAuthenticated
              ? 'Войти, чтобы участвовать'
              : joined
                ? 'Отписаться'
                : item.can_join
                  ? 'Участвовать'
                  : 'Место больше нет'}
          </button>
        )}
      </div>
    </article>
  );
}

export function EventsPage({ activeTab, setIsLoginModalOpen, darkMode }) {
  const { isAuthenticated, user } = useAuth();
  const {
    items,
    page,
    total,
    loading,
    canManage,
    loadEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    toggleParticipation,
    completeEvent,
    loadParticipants,
    removeParticipant,
    saveAttendance,
  } = useEvents(activeTab);

  const [currentPage, setCurrentPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [joiningId, setJoiningId] = useState(null);
  const [completingId, setCompletingId] = useState(null);
  const [removingParticipantId, setRemovingParticipantId] = useState(null);
  const [participantDeleteTarget, setParticipantDeleteTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [participantProfileCode, setParticipantProfileCode] = useState(null);
  const [participantsState, setParticipantsState] = useState({
    open: false,
    title: '',
    eventId: null,
    eventStatus: 'active',
    loading: false,
    items: [],
    attendanceDraftIds: [],
  });

  const totalPages = Math.max(1, Math.ceil(total / 6));
  const canManageFromUser = Boolean(canManage || user?.role === 'chairperson' || user?.is_admin);

  useEffect(() => {
    if (activeTab === 'events' && currentPage !== page) {
      loadEvents(currentPage).catch((error) => {
        showError(error.message || 'Не удалось загрузить мероприятия.');
      });
    }
  }, [activeTab, currentPage, loadEvents, page]);

  useEffect(() => {
    setCurrentPage(page);
  }, [page]);

  useEffect(() => {
    if (!detailTarget) {
      return;
    }

    const freshEvent = items.find((item) => item.id === detailTarget.id);
    if (!freshEvent) {
      setDetailTarget(null);
      return;
    }

    setDetailTarget(freshEvent);
  }, [items, detailTarget]);

  const subtitle = useMemo(
    () => (
      canManageFromUser
        ? 'Здесь можно публиковать мероприятия, редактировать будущие и завершать те, которые уже прошли.'
        : 'Следите за ближайшими мероприятиями БНТУ и записывайтесь на те, которые вам интересны.'
    ),
    [canManageFromUser],
  );

  const handleCreate = async (formData) => {
    setSaving(true);
    try {
      await createEvent(formData);
      setCreateOpen(false);
      showSuccess('Мероприятие создано.');
    } catch (error) {
      showError(error.message || 'Не удалось создать мероприятие.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (formData) => {
    if (!editTarget) return;

    setSaving(true);
    try {
      await updateEvent(editTarget.id, formData);
      setEditTarget(null);
      showSuccess('Мероприятие обновлено.');
    } catch (error) {
      showError(error.message || 'Не удалось обновить мероприятие.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    setDeleteTarget(item);
  };

  const handleConfirmDelete = async (item) => {
    setDeletingId(item.id);
    try {
      await deleteEvent(item.id);
      setDeleteTarget(null);
      showSuccess('Мероприятие удалено.');
    } catch (error) {
      showError(error.message || 'Не удалось удалить мероприятие.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleComplete = async (item) => {
    setCompleteTarget(item);
  };
  const handleConfirmComplete = async (item) => {
    setCompletingId(item.id);
    try {
      await completeEvent(item.id);
      setCompleteTarget(null);
      showSuccess('Мероприятие завершено.');
      if (participantsState.open && participantsState.eventId === item.id) {
        setParticipantsState((current) => ({ ...current, eventStatus: 'completed' }));
      }
    } catch (error) {
      showError(error.message || 'Не удалось завершить мероприятие.');
    } finally {
      setCompletingId(null);
    }
  };
  const handleJoinToggle = async (item) => {
    setJoiningId(item.id);
    try {
      const payload = await toggleParticipation(item.id);
      showSuccess(payload.message || (payload.joined ? 'Участие подтверждено.' : 'Вы больше не участвуете.'));
    } catch (error) {
      showError(error.message || 'Не удалось обновить участие.');
    } finally {
      setJoiningId(null);
    }
  };

  const handleOpenParticipants = async (item) => {
    setParticipantsState({
      open: true,
      title: item.title,
      eventId: item.id,
      eventStatus: item.status,
      loading: true,
      items: [],
      attendanceDraftIds: [],
    });

    try {
      const rows = await loadParticipants(item.id);
      setParticipantsState({
        open: true,
        title: item.title,
        eventId: item.id,
        eventStatus: item.status,
        loading: false,
        items: rows,
        attendanceDraftIds: rows.filter((row) => row.attended).map((row) => row.id),
      });
    } catch (error) {
      setParticipantsState((current) => ({ ...current, loading: false }));
      showError(error.message || 'Не удалось загрузить участников.');
    }
  };

  const handleRemoveParticipant = async (participant) => {
    if (!participantsState.eventId) return;
    setParticipantDeleteTarget(participant);
  };

  const handleConfirmRemoveParticipant = async (participant) => {
    if (!participantsState.eventId) return;
    setRemovingParticipantId(participant.id);
    try {
      await removeParticipant(participantsState.eventId, participant.id);
      setParticipantDeleteTarget(null);
      setParticipantsState((current) => ({
        ...current,
        items: current.items.filter((item) => item.id !== participant.id),
        attendanceDraftIds: current.attendanceDraftIds.filter((id) => id !== participant.id),
      }));
      showSuccess('Участник удален.');
    } catch (error) {
      showError(error.message || 'Не удалось удалить участника.');
    } finally {
      setRemovingParticipantId(null);
    }
  };

  const handleToggleAttendance = (participationId) => {
    setParticipantsState((current) => {
      const exists = current.attendanceDraftIds.includes(participationId);
      return {
        ...current,
        attendanceDraftIds: exists
          ? current.attendanceDraftIds.filter((id) => id !== participationId)
          : [...current.attendanceDraftIds, participationId],
      };
    });
  };

  const handleSaveAttendance = async () => {
    if (!participantsState.eventId) return;

    setSavingAttendance(true);
    try {
      const payload = await saveAttendance(participantsState.eventId, participantsState.attendanceDraftIds);
      const rows = payload.participants || [];
      setParticipantsState((current) => ({
        ...current,
        open: false,
        items: rows,
        attendanceDraftIds: rows.filter((row) => row.attended).map((row) => row.id),
      }));
      showSuccess(payload.message || 'Отметки участников сохранены.');
    } catch (error) {
      showError(error.message || 'Не удалось сохранить отметки участников.');
    } finally {
      setSavingAttendance(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="mb-8 pt-[10px] text-center sm:mb-10">
        <h2 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:mb-4 sm:text-4xl">
          Мероприятия
        </h2>
        <p className="mx-auto max-w-3xl text-base text-slate-600 dark:text-slate-400 sm:text-lg">
          {subtitle}
        </p>
      </div>

      {canManageFromUser ? (
        <div className="mb-8 flex justify-center">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-3 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_24px_64px_rgba(16,185,129,0.25)] transition hover:-translate-y-0.5 hover:bg-emerald-400"
          >
            <Plus className="h-4 w-4" />
            Добавить мероприятие
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-20 text-slate-300">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState canManage={canManageFromUser} />
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <EventCard
                key={item.id}
                item={item}
                isAuthenticated={isAuthenticated}
                canManage={canManageFromUser}
                joining={joiningId === item.id}
                completing={completingId === item.id}
                onJoinToggle={handleJoinToggle}
                onEdit={setEditTarget}
                onDelete={handleDelete}
                onParticipants={handleOpenParticipants}
                onComplete={handleComplete}
                onOpenDetails={setDetailTarget}
                onRequireLogin={() => setIsLoginModalOpen(true)}
                darkMode={darkMode}
              />
            ))}
          </div>

          <div className="mt-8">
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
            />
          </div>
        </>
      )}

      {createOpen ? (
        <EventFormModal
          mode="create"
          saving={saving}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
          darkMode={darkMode}
        />
      ) : null}

      {editTarget ? (
        <EventFormModal
          mode="edit"
          initialEvent={editTarget}
          saving={saving}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
          darkMode={darkMode}
        />
      ) : null}

      <EventDetailsModal
        event={detailTarget}
        onClose={() => setDetailTarget(null)}
        darkMode={darkMode}
      />

      {participantsState.open ? (
        <ParticipantsModal
          eventTitle={participantsState.title}
          eventStatus={participantsState.eventStatus}
          participants={participantsState.items}
          loading={participantsState.loading}
          removingId={removingParticipantId}
          savingAttendance={savingAttendance}
          attendanceDraftIds={participantsState.attendanceDraftIds}
          darkMode={darkMode}
          onClose={() =>
            setParticipantsState({
              open: false,
              title: '',
              eventId: null,
              eventStatus: 'active',
              loading: false,
              items: [],
              attendanceDraftIds: [],
            })
          }
          onViewProfile={setParticipantProfileCode}
          onRemove={handleRemoveParticipant}
          onToggleAttendance={handleToggleAttendance}
          onSaveAttendance={handleSaveAttendance}
        />
      ) : null}

      <ConfirmDeleteEventModal
        event={deleteTarget}
        loading={deletingId === deleteTarget?.id}
        onClose={() => {
          if (!deletingId) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        darkMode={darkMode}
      />

      <ConfirmRemoveParticipantModal
        participant={participantDeleteTarget}
        loading={removingParticipantId === participantDeleteTarget?.id}
        onClose={() => {
          if (!removingParticipantId) {
            setParticipantDeleteTarget(null);
          }
        }}
        onConfirm={handleConfirmRemoveParticipant}
        darkMode={darkMode}
      />

      <ConfirmCompleteEventModal
        event={completeTarget}
        loading={completingId === completeTarget?.id}
        onClose={() => {
          if (!completingId) {
            setCompleteTarget(null);
          }
        }}
        onConfirm={handleConfirmComplete}
        darkMode={darkMode}
      />

      <UserProfileModal
        isOpen={Boolean(participantProfileCode)}
        onClose={() => setParticipantProfileCode(null)}
        studentCode={participantProfileCode}
      />
    </div>
  );
}

export default EventsPage;
