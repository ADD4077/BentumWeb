import React, { useState } from 'react';
import { Copy, Gift } from 'lucide-react';

function ReferralCopyButton({ value, label }) {
  const [copied, setCopied] = useState(false);

  if (!value) {
    return null;
  }

  const handleCopy = async () => {
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
      className="flex w-full items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
    >
      <div>
        <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
        <span>{copied ? 'Ссылка скопирована' : 'Скопировать ссылку'}</span>
      </div>
      <Copy className="h-4 w-4 shrink-0" />
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
        <ReferralCopyButton value={referral.site_link} label="Ссылка для сайта" />
        <ReferralCopyButton value={referral.telegram_link} label="Ссылка для Telegram" />
      </div>
    </div>
  );
}
