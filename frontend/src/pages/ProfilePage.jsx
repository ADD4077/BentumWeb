import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  GraduationCap,
  IdCard,
  Settings,
  Shield,
  Smartphone,
  UserRound,
} from 'lucide-react';

import { API_ENDPOINTS } from '../config/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useModal } from '../contexts/ModalContext.jsx';
import { calculateCourseOrDefault } from '../utils/calculateCourse.js';
import { formatDateOnly, formatDateTime } from '../utils/dates.js';
import { buildMediaUrl } from '../utils/media.js';
import { getRoleLabel } from '../utils/roles.js';

function StatChip({ label, value }) {
  return (
    <div className="rounded-full border border-slate-700/80 bg-slate-800/60 px-3 py-1.5 text-sm text-slate-200">
      <span className="text-slate-400">{label}:</span>{' '}
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

function MainInfoRow({ label, value }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[9rem,1fr] sm:gap-3">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function SideCard({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SideInfo({ icon: Icon, label, value, hint }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-800/80 text-slate-200">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-sm text-slate-400">{label}</div>
        <div className="mt-1 text-base font-semibold text-white">{value}</div>
        {hint ? (
          <div className="mt-2 text-sm leading-6 text-slate-400">{hint}</div>
        ) : null}
      </div>
    </div>
  );
}

export function ProfilePage({ userMedia }) {
  const { user } = useAuth();
  const { setIsProfileSettingsOpen } = useModal();
  const [telegramBinding, setTelegramBinding] = useState(null);
  const [twoFAConfig, setTwoFAConfig] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadExtraInfo = async () => {
      try {
        const [telegramResponse, twoFAResponse] = await Promise.all([
          fetch(API_ENDPOINTS.TELEGRAM_BINDING_STATUS, { credentials: 'include' }),
          fetch(API_ENDPOINTS.TWO_FA_CONFIG, { credentials: 'include' }),
        ]);

        const [telegramData, twoFAData] = await Promise.all([
          telegramResponse.json().catch(() => null),
          twoFAResponse.json().catch(() => null),
        ]);

        if (cancelled) return;

        setTelegramBinding(telegramData?.success ? telegramData.data : null);
        setTwoFAConfig(twoFAData?.success ? twoFAData.data : null);
      } catch {
        if (!cancelled) {
          setTelegramBinding(null);
          setTwoFAConfig(null);
        }
      }
    };

    loadExtraInfo();

    return () => {
      cancelled = true;
    };
  }, []);

  const mainInfo = useMemo(() => ([
    { label: 'ФИО', value: user?.fullname || 'Не указано' },
    { label: 'Факультет', value: user?.faculty || 'Не указан' },
    { label: 'Курс', value: calculateCourseOrDefault(user?.student_code) },
    { label: 'Роль', value: getRoleLabel(user?.role) },
    { label: 'Студенческий код', value: user?.student_code || 'Не указан' },
  ]), [user]);

  const telegramLabel = telegramBinding?.is_linked
    ? telegramBinding.telegram_username
      ? `@${telegramBinding.telegram_username}`
      : [telegramBinding.telegram_first_name, telegramBinding.telegram_last_name].filter(Boolean).join(' ') || 'Привязан'
    : 'Не привязан';

  const sideInfo = useMemo(() => ([
    {
      icon: IdCard,
      label: 'ID аккаунта',
      value: user?.id ? String(user.id) : 'Не указан',
    },
    {
      icon: Calendar,
      label: 'Дата регистрации',
      value: formatDateOnly(user?.created_at, 'Не указана'),
    },
    {
      icon: Shield,
      label: 'Последний вход',
      value: formatDateTime(user?.last_login, 'Неизвестно'),
    },
    {
      icon: Smartphone,
      label: 'Telegram',
      value: telegramLabel,
    },
    {
      icon: Shield,
      label: '2FA',
      value: twoFAConfig?.enabled ? 'Включена' : 'Выключена',
    },
  ]), [telegramBinding?.is_linked, telegramLabel, twoFAConfig?.enabled, user]);

  return (
    <div className="mx-auto w-full max-w-7xl py-8">
      <section className="overflow-hidden rounded-[32px] border border-slate-800/80 bg-[#111827] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="grid xl:grid-cols-[minmax(0,27rem),1fr]">
          <aside className="border-b border-slate-800/80 bg-slate-900/70 xl:border-b-0 xl:border-r">
            <div className="relative h-44 overflow-hidden bg-[linear-gradient(135deg,rgba(15,118,110,0.65),rgba(30,41,59,0.9)_72%)]">
              {userMedia?.banner_url ? (
                <img
                  src={buildMediaUrl(userMedia.banner_url)}
                  alt="Баннер профиля"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08),rgba(15,23,42,0.42))]" />
            </div>

            <div className="px-6 pb-6">
              <div className="-mt-14 relative z-10">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[28px] border-[6px] border-slate-900 bg-slate-950 shadow-xl">
                  {userMedia?.avatar_url ? (
                    <img
                      src={buildMediaUrl(userMedia.avatar_url)}
                      alt="Аватар"
                      className="h-full w-full object-cover"
                    />
                  ) : userMedia?.avatar_placeholder ? (
                    <span
                      className="font-semibold text-slate-300"
                      style={{
                        fontSize: userMedia.avatar_placeholder.font_size,
                        fontWeight: userMedia.avatar_placeholder.font_weight,
                      }}
                    >
                      {userMedia.avatar_placeholder.initials}
                    </span>
                  ) : (
                    <UserRound className="h-10 w-10 text-slate-500" />
                  )}
                </div>
              </div>

              <div className="mt-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                  Личный кабинет
                </div>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
                  {user?.fullname || 'Профиль'}
                </h1>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <StatChip label="Роль" value={getRoleLabel(user?.role)} />
                <StatChip label="Курс" value={calculateCourseOrDefault(user?.student_code)} />
              </div>

              <div className="mt-8 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-5">
                <div className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Основная информация
                </div>
                <div className="space-y-1">
                  {mainInfo.map((item) => (
                    <MainInfoRow key={item.label} label={item.label} value={item.value} />
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <div className="p-6 xl:p-7">
            <div className="mb-6 flex flex-col gap-4 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-lg font-semibold text-white">Данные аккаунта</div>
                <div className="mt-1 text-sm text-slate-400">
                  Здесь собрана информация, которой нет в основном блоке профиля.
                </div>
              </div>
              <button
                onClick={() => setIsProfileSettingsOpen(true)}
                className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 sm:w-auto"
              >
                <Settings className="h-4 w-4" />
                <span>Настройки</span>
              </button>
            </div>

            <div className="space-y-4">
              <SideCard title="Остальная информация">
                <div className="space-y-4">
                  {sideInfo.map((item) => (
                    <SideInfo
                      key={item.label}
                      icon={item.icon}
                      label={item.label}
                      value={item.value}
                    />
                  ))}
                </div>
              </SideCard>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ProfilePage;
