import React, { useMemo, useState } from 'react';
import { Check, Copy, Gift } from 'lucide-react';

function ReferralCopyButton({ value, label, unavailableText = 'Ссылка недоступна' }) {
  const [copied, setCopied] = useState(false);
  const isAvailable = Boolean(value);

  const handleCopy = async () => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!isAvailable}
      className={`app-cell-surface group flex min-h-[92px] w-full items-center justify-between gap-4 rounded-2xl border px-5 py-3 text-left transition-all duration-300 ${
        copied
          ? 'scale-[1.01] border-emerald-400 bg-emerald-50/80 shadow-[0_0_0_1px_rgba(16,185,129,0.18)] dark:border-emerald-500 dark:bg-emerald-500/10'
          : isAvailable
            ? 'hover:-translate-y-0.5 hover:border-emerald-400 dark:hover:border-emerald-500'
            : 'cursor-default opacity-80'
      }`}
    >
      <div className="min-w-0 flex-1">
        <span
          className={`block text-base font-semibold leading-tight transition-colors duration-300 ${
            copied
              ? 'text-emerald-600 dark:text-emerald-300'
              : isAvailable
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {label}
        </span>
        <span
          className={`mt-1 block text-sm transition-all duration-300 ${
            copied
              ? 'translate-y-0 text-emerald-600/90 opacity-100 dark:text-emerald-300/90'
              : isAvailable
                ? 'translate-y-0 text-slate-500 opacity-100 dark:text-slate-400'
                : 'translate-y-0 text-slate-400 opacity-100 dark:text-slate-500'
          }`}
        >
          {copied ? 'Ссылка скопирована' : isAvailable ? 'Нажмите, чтобы скопировать' : unavailableText}
        </span>
      </div>

      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 ${
          copied
            ? 'border-emerald-400 bg-emerald-500 text-white dark:border-emerald-500 dark:bg-emerald-500'
            : isAvailable
              ? 'border-slate-200/80 bg-white/70 text-slate-500 group-hover:border-emerald-300 group-hover:text-emerald-500 dark:border-slate-700/70 dark:bg-slate-800/80 dark:text-slate-400 dark:group-hover:border-emerald-500/60 dark:group-hover:text-emerald-300'
              : 'border-slate-200/80 bg-white/40 text-slate-400 dark:border-slate-700/70 dark:bg-slate-800/60 dark:text-slate-500'
        }`}
      >
        {copied ? (
          <Check className="h-4 w-4 scale-110 transition-transform duration-200" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </span>
    </button>
  );
}

export default function ReferralSettingsSection({ referral }) {
  if (!referral) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-5 text-sm text-slate-600 shadow-sm dark:border-slate-700/60 dark:bg-[#17202d] dark:text-slate-300">
        Реферальная система пока недоступна для этого аккаунта.
      </div>
    );
  }

  const referralLinks = useMemo(
    () => [
      {
        label: 'Ссылка для сайта',
        value: referral.site_link,
        unavailableText: 'Ссылка для сайта недоступна',
      },
      {
        label: 'Ссылка для бота',
        value: referral.telegram_link,
        unavailableText: 'Укажите username Telegram-бота в настройках сервера',
      },
    ],
    [referral.site_link, referral.telegram_link]
  );

  return (
    <div className="rounded-2xl border border-gray-200/70 bg-white/70 p-4 text-left shadow-sm dark:border-slate-700/60 dark:bg-[#17202d] sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Gift className="h-5 w-5 text-emerald-500" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
          Реферальная система
        </h3>
      </div>

      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        Приглашайте друзей в Бентум через личный код и делитесь готовыми ссылками на сайт или Telegram-бота.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200/70 bg-gray-50/80 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-800/70">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Ваш код
          </div>
          <div className="text-lg font-bold tracking-[0.18em] text-slate-900 dark:text-white">
            {referral.code}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/70 bg-gray-50/80 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-800/70">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Приглашено
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">{referral.invited_count}</div>
        </div>
      </div>

      {referral.referred_by ? (
        <div className="mt-3 rounded-2xl border border-emerald-200/60 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          Вас пригласил <span className="font-semibold">{referral.referred_by.fullname}</span>
          {referral.referred_by.student_code ? ` (${referral.referred_by.student_code})` : ''}.
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {referralLinks.map((item) => (
          <ReferralCopyButton
            key={item.label}
            value={item.value}
            label={item.label}
            unavailableText={item.unavailableText}
          />
        ))}
      </div>
    </div>
  );
}
