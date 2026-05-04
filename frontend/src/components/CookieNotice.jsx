import React, { useEffect, useState } from 'react';
import { Cookie, Shield } from 'lucide-react';

const COOKIE_NOTICE_KEY = 'bentum-cookie-notice-accepted';

function CookieNotice({ onOpenPrivacy }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const accepted = window.localStorage.getItem(COOKIE_NOTICE_KEY);
      if (!accepted) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    try {
      window.localStorage.setItem(COOKIE_NOTICE_KEY, '1');
    } catch {
      // ignore storage errors
    }
    setVisible(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-[70] px-4">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[1.6rem] border border-slate-300/70 bg-white/96 px-5 py-4 shadow-2xl shadow-slate-900/10 backdrop-blur-md dark:border-slate-800/70 dark:bg-[#121927]/96 dark:shadow-black/30 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
            <div className="min-w-0 flex items-start gap-4">
              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <Cookie className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white sm:text-[15px] lg:text-base">
                  Мы используем cookie
                </h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Bentum использует cookie для входа в аккаунт, сохранения настроек и стабильной работы сайта.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:flex-none">
              <button
                onClick={onOpenPrivacy}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300/70 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 transition-colors duration-300 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-emerald-500/30 dark:hover:text-emerald-400"
              >
                <Shield className="h-4 w-4" />
                Политика cookie
              </button>

              <button
                onClick={handleAccept}
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors duration-300 hover:bg-emerald-500"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CookieNotice;
