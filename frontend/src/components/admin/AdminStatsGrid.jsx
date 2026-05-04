import React from 'react';

export default function AdminStatsGrid({ statCards }) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {statCards.map(({ label, value, meta, trend, icon: Icon, shellClass, iconClass, trendClass }) => (
        <article
          key={label}
          className="rounded-[26px] border border-gray-200/70 bg-gray-100/50 p-5 shadow-lg shadow-gray-900/10 backdrop-blur-md transition hover:-translate-y-0.5 dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${shellClass}`}>
              <Icon className={`h-5 w-5 ${iconClass}`} />
            </div>
            {trend ? (
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${trendClass}`}>
                {trend}
              </span>
            ) : null}
          </div>

          <div className="space-y-1">
            <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
            <div className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">{value}</div>
            {meta ? <div className="text-xs text-slate-500 dark:text-slate-500">{meta}</div> : null}
          </div>
        </article>
      ))}
    </section>
  );
}
