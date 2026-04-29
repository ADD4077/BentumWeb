import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Ban, AlertTriangle, User, Calendar } from 'lucide-react';

const DURATION_MODE_PRESET = 'preset';
const DURATION_MODE_CUSTOM = 'custom';
const CUSTOM_UNIT_SECONDS = {
  minutes: 60,
  hours: 60 * 60,
  days: 24 * 60 * 60,
};

const PRESET_OPTIONS = [
  { value: '1', label: '1 день' },
  { value: '3', label: '3 дня' },
  { value: '7', label: '7 дней' },
  { value: '14', label: '14 дней' },
  { value: '30', label: '30 дней' },
  { value: '90', label: '90 дней' },
  { value: '365', label: '1 год' },
  { value: '-1', label: 'Навсегда' },
];

const buildDurationPayload = ({ mode, presetDuration, customValue, customUnit }) => {
  if (mode === DURATION_MODE_CUSTOM) {
    const numericValue = Number(customValue);
    const multiplier = CUSTOM_UNIT_SECONDS[customUnit];

    if (!Number.isFinite(numericValue) || numericValue <= 0 || !multiplier) {
      return null;
    }

    const durationSeconds = Math.round(numericValue * multiplier);
    return {
      duration_seconds: durationSeconds,
      durationLabel: `${numericValue} ${customUnit === 'minutes' ? 'мин.' : customUnit === 'hours' ? 'ч.' : 'дн.'}`,
    };
  }

  const numericDuration = Number(presetDuration);
  if (!Number.isFinite(numericDuration) || numericDuration === 0 || numericDuration < -1) {
    return null;
  }

  const selectedPreset = PRESET_OPTIONS.find((option) => Number(option.value) === numericDuration);

  return {
    duration: numericDuration,
    durationLabel: selectedPreset?.label || `${numericDuration} дней`,
  };
};

const BanModal = ({ isOpen, onClose, user, onBan, darkMode: _darkMode }) => {
  const [reason, setReason] = useState('');
  const [durationMode, setDurationMode] = useState(DURATION_MODE_PRESET);
  const [presetDuration, setPresetDuration] = useState('7');
  const [customValue, setCustomValue] = useState('1');
  const [customUnit, setCustomUnit] = useState('days');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setReason('');
    setDurationMode(DURATION_MODE_PRESET);
    setPresetDuration('7');
    setCustomValue('1');
    setCustomUnit('days');
    setErrors({});
    setLoading(false);
  }, [isOpen, user?.id]);

  const durationPreview = useMemo(
    () => buildDurationPayload({ mode: durationMode, presetDuration, customValue, customUnit })?.durationLabel,
    [durationMode, presetDuration, customValue, customUnit],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrors({});

    if (!reason.trim()) {
      setErrors({ reason: 'Укажите причину бана' });
      setLoading(false);
      return;
    }

    const durationPayload = buildDurationPayload({
      mode: durationMode,
      presetDuration,
      customValue,
      customUnit,
    });

    if (!durationPayload) {
      setErrors({ duration: 'Укажите корректную длительность' });
      setLoading(false);
      return;
    }

    try {
      await onBan(user.id, reason.trim(), durationPayload);
      onClose();
    } catch {
      setErrors({ general: 'Ошибка при блокировке пользователя' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="modal-panel max-h-[85vh] w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <Ban className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Блокировка пользователя
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-700/20">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-slate-600">
                <User className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {user?.fullname || 'Пользователь'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Код: {user?.student_code}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Причина блокировки
              </div>
            </label>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Укажите причину блокировки пользователя..."
              className={`h-24 w-full resize-none rounded-xl border px-4 py-3 transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 ${
                errors.reason
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800'
              }`}
            />
            {errors.reason ? <p className="mt-1 text-sm text-red-500">{errors.reason}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                Длительность блокировки
              </div>
            </label>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDurationMode(DURATION_MODE_PRESET)}
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                  durationMode === DURATION_MODE_PRESET
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'border-gray-300 bg-white text-gray-700 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-300'
                }`}
              >
                Готовый срок
              </button>
              <button
                type="button"
                onClick={() => setDurationMode(DURATION_MODE_CUSTOM)}
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                  durationMode === DURATION_MODE_CUSTOM
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'border-gray-300 bg-white text-gray-700 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-300'
                }`}
              >
                Свое время
              </button>
            </div>

            {durationMode === DURATION_MODE_PRESET ? (
              <select
                value={presetDuration}
                onChange={(event) => setPresetDuration(event.target.value)}
                className={`w-full rounded-xl border px-4 py-3 text-gray-900 transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 dark:text-gray-100 ${
                  errors.duration
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                }`}
              >
                {PRESET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-[1fr,140px] gap-2">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={customValue}
                  onChange={(event) => setCustomValue(event.target.value)}
                  className={`rounded-xl border px-4 py-3 text-gray-900 transition-all placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 dark:text-gray-100 dark:placeholder:text-slate-400 ${
                    errors.duration
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                  }`}
                  placeholder="Введите число"
                />
                <select
                  value={customUnit}
                  onChange={(event) => setCustomUnit(event.target.value)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100"
                >
                  <option value="minutes">Минуты</option>
                  <option value="hours">Часы</option>
                  <option value="days">Дни</option>
                </select>
              </div>
            )}

            {durationPreview ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Будет установлено: <span className="font-medium">{durationPreview}</span>
              </p>
            ) : null}

            {errors.duration ? <p className="mt-1 text-sm text-red-500">{errors.duration}</p> : null}
          </div>

          {errors.general ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
            </div>
          ) : null}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-gray-200 px-6 py-3 font-medium text-gray-700 transition-all hover:bg-gray-300 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-medium text-white transition-all hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Блокировка...
                </>
              ) : (
                <>
                  <Ban className="h-5 w-5" />
                  Заблокировать
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default BanModal;
