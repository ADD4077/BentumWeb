import React from 'react';
import {
  ArrowUpRight,
  Copy,
  Download,
  Gamepad2,
  Server,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react';

import { sanitizeExternalUrl } from '../utils/url.js';

function StatChip({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200/70 bg-white/85 px-4 py-3 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-500">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function CategoryButton({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
        active
          ? 'border-emerald-400/70 bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
          : 'border-slate-200/70 bg-white/80 text-slate-600 hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700/50 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:text-emerald-400'
      }`}
    >
      {label}
    </button>
  );
}

function FeatureCard({ game }) {
  const safeServerUrl = sanitizeExternalUrl(game.serverUrl);

  return (
    <article className="overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/88 shadow-2xl shadow-slate-900/10 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/70 dark:shadow-black/25">
      <div className="grid lg:grid-cols-[1.15fr_minmax(0,0.85fr)]">
        <div className="relative min-h-[280px] overflow-hidden sm:min-h-[360px]">
          <img
            src={game.image}
            alt={game.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(2,6,23,0.2),rgba(2,6,23,0.82))]" />
          <div className="relative flex h-full flex-col justify-between p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-white">
                Рекомендация
              </span>
              {safeServerUrl ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  Сервер онлайн
                </span>
              ) : null}
            </div>

            <div className="max-w-xl">
              <p className="text-sm font-medium text-emerald-200">
                {game.developer}
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
                {game.title}
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-slate-200 sm:text-base">
                {game.description}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {game.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-6 p-6 sm:p-8">
          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Рейтинг
                </p>
                <div className="mt-2 flex items-center gap-2 text-slate-900 dark:text-white">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-2xl font-bold">{game.rating}</span>
                </div>
              </div>
              <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-right text-emerald-600 dark:text-emerald-300">
                <p className="text-xs uppercase tracking-[0.18em]">Доступ</p>
                <p className="mt-1 text-lg font-bold">
                  {game.price === 0 ? 'Бесплатно' : `$${game.price}`}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <StatChip icon={Server} label="Адрес" value={game.serverIP || 'Через сайт проекта'} />
              <StatChip icon={Users} label="Формат" value="Студенческое комьюнити" />
              <StatChip icon={ShieldCheck} label="Сервер" value="Модерация и дружелюбная среда" />
            </div>
          </div>

          <div className="grid gap-3">
            {safeServerUrl ? (
              <a
                href={safeServerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
              >
                Перейти на сайт
                <ArrowUpRight className="h-4 w-4" />
              </a>
            ) : (
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
              >
                <Download className="h-4 w-4" />
                Получить
              </button>
            )}

            {game.serverIP ? (
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(game.serverIP)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-emerald-500/40 dark:hover:text-emerald-300"
              >
                <Copy className="h-4 w-4" />
                Скопировать IP
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function CatalogCard({ game }) {
  const safeServerUrl = sanitizeExternalUrl(game.serverUrl);

  return (
    <article className="group overflow-hidden rounded-[1.6rem] border border-slate-200/70 bg-white/86 shadow-lg shadow-slate-900/8 transition-transform duration-300 hover:-translate-y-1 dark:border-slate-700/50 dark:bg-slate-800/65 dark:shadow-black/20">
      <div className="relative h-40 overflow-hidden">
        <img
          src={game.image}
          alt={game.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {game.price === 0 ? (
            <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
              Бесплатно
            </span>
          ) : null}
          {safeServerUrl ? (
            <span className="rounded-full bg-slate-950/65 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              Онлайн
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-slate-900 dark:text-white">
              {game.title}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {game.developer}
            </p>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <Star className="h-3.5 w-3.5 fill-current" />
            {game.rating}
          </div>
        </div>

        <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {game.description}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {game.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700/70 dark:text-slate-200"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
            {game.price === 0 ? 'Бесплатно' : `$${game.price}`}
          </div>
          {safeServerUrl ? (
            <a
              href={safeServerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200/70 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700/60 dark:text-slate-200 dark:hover:border-emerald-500/40 dark:hover:text-emerald-300"
            >
              Открыть
              <ArrowUpRight className="h-4 w-4" />
            </a>
          ) : (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
            >
              <Download className="h-4 w-4" />
              Получить
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export const GamesPage = ({
  gameCategories,
  selectedGameCategory,
  setSelectedGameCategory,
  filteredGames,
}) => {
  const featuredGames = filteredGames.filter((item) => item.featured);
  const catalogGames = filteredGames.filter((item) => !item.featured);

  const highlightedGame = featuredGames[0] || filteredGames[0] || null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="section-reveal mb-6 flex flex-wrap gap-3">
        {gameCategories.map((category) => (
          <CategoryButton
            key={category.id}
            active={selectedGameCategory === category.id}
            label={category.name}
            onClick={() => setSelectedGameCategory(category.id)}
          />
        ))}
      </div>

      {highlightedGame ? (
        <section className="section-reveal mt-6 sm:mt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300">
                Главная площадка
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                Во что зайти сегодня
              </h2>
            </div>
          </div>

          <FeatureCard game={highlightedGame} />
        </section>
      ) : null}

      <section className="section-reveal mt-10 pb-4">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Каталог
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              {selectedGameCategory === 'all'
                ? 'Все игровые проекты'
                : gameCategories.find((category) => category.id === selectedGameCategory)?.name}
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filteredGames.length > 0
              ? `${filteredGames.length} ${filteredGames.length === 1 ? 'позиция' : 'позиций'} в подборке`
              : 'Подборка пока пустая'}
          </p>
        </div>

        {filteredGames.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(catalogGames.length > 0 ? catalogGames : filteredGames).map((game) => (
              <CatalogCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-slate-300/80 bg-white/82 px-6 py-16 text-center dark:border-slate-700/60 dark:bg-slate-800/50">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700/70 dark:text-slate-300">
              <Gamepad2 className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
              Игры не найдены
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500 dark:text-slate-400">
              В этой категории пока пусто. Попробуй переключиться на весь каталог
              или загляни сюда позже.
            </p>
            <button
              type="button"
              onClick={() => setSelectedGameCategory('all')}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
            >
              Показать весь каталог
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default GamesPage;
