import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CalendarRange,
  IdCard,
  Settings,
  Shield,
  Smartphone,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react';

import { API_ENDPOINTS } from '../config/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useModal } from '../contexts/ModalContext.jsx';
import { calculateCourseOrDefault } from '../utils/calculateCourse.js';
import { formatDateOnly, formatDateTime } from '../utils/dates.js';
import { buildMediaUrl } from '../utils/media.js';
import { getRoleLabel } from '../utils/roles.js';

function MainInfoRow({ label, value }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[10rem,1fr] sm:gap-3">
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-sm font-medium text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}

function SideCard({ title, description, children }) {
  return (
    <section className="app-panel-surface rounded-2xl border p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function SideInfo({ icon: Icon, label, value }) {
  return (
    <div className="app-cell-surface flex gap-4 rounded-2xl border p-4">
      <div className="app-cell-surface flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-slate-700 dark:text-slate-200">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
        <div className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{value}</div>
      </div>
    </div>
  );
}

function ServiceButton({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="app-cell-surface flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition hover:border-emerald-500/40"
    >
      <div className="flex items-center gap-3">
        <div className="app-cell-surface flex h-10 w-10 items-center justify-center rounded-2xl border text-slate-700 dark:text-slate-200">
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold text-slate-900 dark:text-white">{label}</span>
      </div>
      <span className="text-sm text-slate-500 dark:text-slate-400">Открыть</span>
    </button>
  );
}

export function ProfilePage({ setActiveTab, userMedia }) {
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

  const mainInfo = useMemo(
    () => [
      { label: 'ФИО', value: user?.fullname || 'Не указано' },
      { label: 'Факультет', value: user?.faculty || 'Не указан' },
      { label: 'Курс', value: calculateCourseOrDefault(user?.student_code) },
      { label: 'Роль', value: getRoleLabel(user?.role) },
      { label: 'Студенческий код', value: user?.student_code || 'Не указан' },
    ],
    [user],
  );

  const telegramLabel = telegramBinding?.is_linked
    ? telegramBinding.telegram_username
      ? `@${telegramBinding.telegram_username}`
      : [telegramBinding.telegram_first_name, telegramBinding.telegram_last_name]
          .filter(Boolean)
          .join(' ') || 'Привязан'
    : 'Не привязан';

  const sideInfo = useMemo(
    () => [
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
    ],
    [telegramBinding?.is_linked, telegramLabel, twoFAConfig?.enabled, user],
  );

  const serviceButtons = useMemo(() => {
    const items = [];

    if (user?.role === 'chairperson') {
      items.push({
        key: 'chairperson',
        label: 'Председатель',
        icon: CalendarRange,
        onClick: () => setActiveTab('chairperson'),
      });
    }

    if (user?.role === 'moderator' || user?.is_admin) {
      items.push({
        key: 'moderator',
        label: 'Модератор',
        icon: Users,
        onClick: () => setActiveTab('moder'),
      });
    }

    if (user?.is_admin) {
      items.push({
        key: 'admin',
        label: 'Администратор',
        icon: Wrench,
        onClick: () => setActiveTab('admin'),
      });
    }

    return items;
  }, [setActiveTab, user]);

  return (
    <div className="mx-auto w-full max-w-7xl py-8">
      <section className="app-panel-surface overflow-hidden rounded-[32px] border">
        <div className="grid xl:grid-cols-[minmax(0,25rem),1fr]">
          <aside className="border-b border-slate-200/70 dark:border-slate-700/50 xl:border-b-0 xl:border-r">
            <div className="relative h-36 overflow-hidden bg-[linear-gradient(135deg,rgba(15,118,110,0.65),rgba(30,41,59,0.9)_72%)]">
              {userMedia?.banner_url ? (
                <img
                  src={buildMediaUrl(userMedia.banner_url)}
                  alt="Баннер профиля"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08),rgba(15,23,42,0.48))]" />
            </div>

            <div className="px-6 pb-6">
              <div className="-mt-10 relative z-10 flex h-24 w-24 items-center justify-center overflow-hidden rounded-[24px] border-[6px] border-slate-900 bg-slate-950 shadow-xl">
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
                  <UserRound className="h-9 w-9 text-slate-500" />
                )}
              </div>

              <div className="mt-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                  Личный кабинет
                </div>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  {user?.fullname || 'Профиль'}
                </h1>
              </div>

              <button
                type="button"
                onClick={() => setIsProfileSettingsOpen(true)}
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
              >
                <Settings className="h-4 w-4" />
                <span>Настройки</span>
              </button>

              {serviceButtons.length ? (
                <div className="mt-6 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Служебные разделы
                  </div>
                  {serviceButtons.map((item) => (
                    <ServiceButton
                      key={item.key}
                      icon={item.icon}
                      label={item.label}
                      onClick={item.onClick}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </aside>

          <div className="p-6 xl:p-7">
            <div className="mb-6 border-b border-slate-200/70 pb-4 dark:border-slate-700/50">
              <div className="text-2xl font-semibold text-slate-900 dark:text-white">
                Данные аккаунта
              </div>
              <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                Здесь собрана вся информация по аккаунту: основные сведения вынесены в отдельный блок, а технические параметры идут ниже.
              </div>
            </div>

            <SideCard
              title="Основная информация"
              description="Базовые сведения, которые отображают ваш учебный и аккаунтный профиль."
            >
              <div className="space-y-1">
                {mainInfo.map((item) => (
                  <MainInfoRow key={item.label} label={item.label} value={item.value} />
                ))}
              </div>
            </SideCard>

            <div className="mt-4">
              <SideCard
              title="Остальная информация"
              description="Технические и защитные параметры аккаунта."
            >
                <div className="grid gap-4 lg:grid-cols-2">
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
