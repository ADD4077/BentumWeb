import React from 'react';
import {
  CalendarRange,
  ChevronRight,
  ClipboardList,
  ShieldCheck,
  Users,
} from 'lucide-react';

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="app-panel-surface rounded-3xl border p-5">
      <div className="app-cell-surface flex h-12 w-12 items-center justify-center rounded-2xl border text-emerald-400">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  );
}

export function ChairpersonPage({ setActiveTab }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <section className="app-panel-surface overflow-hidden rounded-[32px] border">
        <div className="border-b border-slate-200/70 px-6 py-6 dark:border-slate-700/50 sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            Раздел председателя
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Управление мероприятиями и участниками
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-400 sm:text-base">
            Здесь собраны инструменты для председателя: публикация мероприятий, контроль участников
            и быстрый переход в рабочие разделы без лишнего шума в основной навигации.
          </p>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.15fr,0.85fr] sm:px-8">
          <section className="app-panel-surface rounded-3xl border p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Основная рабочая зона</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Раздел мероприятий уже учитывает права председателя: можно создавать события,
              редактировать их, завершать и работать со списком участников.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <FeatureCard
                icon={CalendarRange}
                title="Публикация мероприятий"
                description="Создавайте новые события, добавляйте баннеры, описание и ограничения по участникам."
              />
              <FeatureCard
                icon={Users}
                title="Работа с участниками"
                description="Открывайте списки записавшихся, отмечайте посещаемость и снимайте участников при необходимости."
              />
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('events')}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
            >
              Открыть мероприятия
              <ChevronRight className="h-4 w-4" />
            </button>
          </section>

          <aside className="space-y-4">
            <div className="app-panel-surface rounded-3xl border p-6">
              <div className="app-cell-surface flex h-12 w-12 items-center justify-center rounded-2xl border text-emerald-400">
                <ClipboardList className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Что доступно председателю</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                <li>Создание и редактирование мероприятий.</li>
                <li>Завершение прошедших событий.</li>
                <li>Просмотр и корректировка списка участников.</li>
                <li>Отметка посещаемости в рабочем режиме.</li>
              </ul>
            </div>

            <div className="app-panel-surface rounded-3xl border p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Быстрый переход</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Если нужно вернуться к обычному профилю или в общие разделы, используйте кабинет и основную навигацию.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="app-cell-surface mt-5 inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 dark:text-slate-100"
              >
                Вернуться в кабинет
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

export default ChairpersonPage;
