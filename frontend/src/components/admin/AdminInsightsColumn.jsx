import React from 'react';
import {
  Activity,
  Ban,
  BookUser,
  CircleDot,
  RefreshCw,
  ShieldAlert,
  UserPlus,
} from 'lucide-react';

function buildLinePath(points, width, height) {
  if (!points.length) {
    return '';
  }

  const maxValue = Math.max(...points.map((point) => point.count), 1);

  return points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const y = height - (point.count / maxValue) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function SectionCard({ title, actionLabel, children, onAction }) {
  return (
    <section className="rounded-[28px] border border-gray-200/70 bg-gray-100/50 shadow-lg shadow-gray-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20">
      <div className="flex items-center justify-between border-b border-gray-200/70 px-5 py-4 dark:border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
        {actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            className="text-sm font-medium text-emerald-600 transition hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function RoleDistributionCard({ roleData, totalUsers }) {
  const stops = [];
  let accumulated = 0;

  roleData.forEach((item) => {
    const percentage = totalUsers > 0 ? (item.count / totalUsers) * 100 : 0;
    stops.push(`${item.color} ${accumulated}% ${accumulated + percentage}%`);
    accumulated += percentage;
  });

  const chartStyle = {
    background: `conic-gradient(${stops.join(', ') || '#334155 0% 100%'})`,
  };

  return (
    <SectionCard title="Распределение ролей">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-5">
        <div className="relative mx-auto shrink-0 lg:mx-0">
          <div className="h-32 w-32 rounded-full p-3 sm:h-40 sm:w-40" style={chartStyle}>
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-white">
              <div className="text-2xl font-bold">{totalUsers}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Всего</div>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          {roleData.map((item) => (
            <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate text-slate-700 dark:text-slate-300">{item.label}</span>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-medium text-slate-900 dark:text-white">{item.count}</div>
                <div className="text-xs text-slate-500 dark:text-slate-500">{item.percentage}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function RegistrationsCard({ series }) {
  const width = 320;
  const height = 140;
  const linePath = buildLinePath(series, width, height);
  const maxValue = Math.max(...series.map((item) => item.count), 1);
  const latest = series.at(-1)?.count ?? 0;

  return (
    <SectionCard title="Регистрации" actionLabel="30 дней">
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-bold text-slate-950 dark:text-white">{latest}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Новых за последний день</div>
          </div>
          <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
            Пик: {maxValue}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200/70 bg-gray-100/70 p-3 sm:p-4 dark:border-slate-700/50 dark:bg-slate-800/70">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full">
            {[0.25, 0.5, 0.75].map((step) => (
              <line
                key={step}
                x1="0"
                x2={width}
                y1={height * step}
                y2={height * step}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-700"
                strokeDasharray="4 6"
              />
            ))}
            <path
              d={linePath}
              fill="none"
              stroke="url(#admin-line)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="admin-line" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
          </svg>

          <div className="mt-2 flex justify-between text-xs text-slate-400 dark:text-slate-500">
            <span>{series[0]?.label}</span>
            <span>{series[Math.floor(series.length / 2)]?.label}</span>
            <span>{series.at(-1)?.label}</span>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

export default function AdminInsightsColumn({
  roleData,
  totalUsers,
  registrationsSeries,
  recentActivity,
  moderationQueue,
  onOpenActivity,
  onOpenModeration,
}) {
  const fallbackActivity = [{
    title: 'Активность появится позже',
    subtitle: 'Пока нет новых событий в системе',
    time: 'Нет данных',
    icon: CircleDot,
    iconShell: 'bg-slate-100 dark:bg-slate-700/60',
    iconClass: 'text-slate-500 dark:text-slate-300',
  }];

  return (
    <div className="space-y-6">
      <SectionCard title="Активность" actionLabel="Смотреть все" onAction={onOpenActivity}>
        <div className="space-y-4">
          {(recentActivity.length ? recentActivity : fallbackActivity).map((item) => (
            <div key={`${item.title}-${item.subtitle}`} className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl ${item.iconShell}`}>
                <item.icon className={`h-4 w-4 ${item.iconClass}`} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-white">{item.title}</div>
                <div className="truncate text-sm text-slate-500 dark:text-slate-400">{item.subtitle}</div>
                <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">{item.time}</div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <RegistrationsCard series={registrationsSeries} />
      <RoleDistributionCard roleData={roleData} totalUsers={totalUsers} />

      <SectionCard title="Очередь модерации" actionLabel="Смотреть все" onAction={onOpenModeration}>
        <div className="space-y-4">
          {moderationQueue.length ? (
            moderationQueue.map((item) => (
              <div key={`${item.title}-${item.time}`} className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl ${item.iconShell}`}>
                  <item.icon className={`h-4 w-4 ${item.iconClass}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">{item.title}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{item.subtitle}</div>
                  <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">{item.time}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-gray-300/70 px-4 py-10 text-center text-slate-500 dark:border-slate-700/60 dark:text-slate-400">
              Открытых обращений без ответа сейчас нет
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

export {
  Activity,
  Ban,
  BookUser,
  RefreshCw,
  ShieldAlert,
  UserPlus,
};
