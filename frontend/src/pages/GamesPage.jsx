import React from 'react';
import { Star, Download, Gamepad2 } from 'lucide-react';

/**
 * Страница игр
 */
export const GamesPage = ({
  gameCategories,
  selectedGameCategory,
  setSelectedGameCategory,
  filteredGames
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="section-reveal text-center mb-8 sm:mb-10">
        <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 text-slate-900 dark:text-white tracking-tight">Игры</h2>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto px-4">
          Лучшие игры для студентов БНТУ - отдыхайте с пользой
        </p>
      </div>

      {/* Категории */}
      <div className="section-reveal flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 px-1">
        {gameCategories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedGameCategory(category.id)}
            className={`px-3 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
              selectedGameCategory === category.id
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : 'border border-gray-200/70 bg-gray-100/50 text-slate-600 shadow-lg shadow-gray-900/10 backdrop-blur-md hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-400 dark:shadow-black/20 dark:hover:border-emerald-600 dark:hover:text-emerald-400'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Рекомендуемые игры */}
      {filteredGames.filter(item => item.featured).length > 0 && (
        <div className="section-reveal mb-8 sm:mb-12">
          <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-slate-900 dark:text-white">Рекомендуемые игры</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredGames.filter(item => item.featured).map((game) => (
              <div
                key={game.id}
                className="glass-card interactive-lift shimmer-surface group relative overflow-hidden rounded-xl border border-gray-200/70 bg-gray-100/50 shadow-lg shadow-gray-900/10 backdrop-blur-md transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20 sm:rounded-2xl"
              >
                <div className="relative h-36 sm:h-48 overflow-hidden">
                  <img
                    src={game.image}
                    alt={game.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {game.discount > 0 && (
                    <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-red-500 text-white px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-bold">
                      -{game.discount}%
                    </div>
                  )}
                  {game.serverUrl ? (
                    <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      Онлайн
                    </div>
                  ) : game.price === 0 && (
                    <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-emerald-500 text-white px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-bold">
                      Бесплатно
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg sm:text-xl text-slate-900 dark:text-white mb-1 line-clamp-1">
                        {game.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        {game.developer}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2 sm:ml-3 flex-shrink-0">
                      <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 fill-current" />
                      <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                        {game.rating}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-3 sm:mb-4 line-clamp-2">
                    {game.description}
                  </p>
                  <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4">
                    {game.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {game.price === 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-base sm:text-lg">
                          Бесплатно
                        </span>
                      ) : (
                        <>
                          {game.originalPrice && (
                            <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-through">
                              ${game.originalPrice}
                            </span>
                          )}
                          <span className="text-slate-900 dark:text-white font-bold text-base sm:text-lg">
                            ${game.price}
                          </span>
                        </>
                      )}
                    </div>
                    {game.serverUrl ? (
                      <div className="flex gap-1 sm:gap-2">
                        <a
                          href={game.serverUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 sm:px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-colors flex items-center gap-1"
                        >
                          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Сайт
                        </a>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(game.serverIP);
                          }}
                          className="px-3 sm:px-3 py-2.5 sm:py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg sm:rounded-xl text-sm sm:text-sm font-medium transition-colors flex items-center gap-1"
                        >
                          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span className="hidden sm:inline">IP</span>
                        </button>
                      </div>
                    ) : (
                      <button className="px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2">
                        <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">{game.price === 0 ? 'Получить' : 'Купить'}</span>
                        <span className="sm:hidden">{game.price === 0 ? '↓' : '🛒'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Все игры */}
      <div className="section-reveal">
        <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-slate-900 dark:text-white">
          {selectedGameCategory === 'all' ? 'Все игры' : gameCategories.find(cat => cat.id === selectedGameCategory)?.name}
        </h3>
        {filteredGames.filter(item => !item.featured).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredGames.filter(item => !item.featured).map((game) => (
              <div
                key={game.id}
                className="glass-card interactive-lift shimmer-surface group overflow-hidden rounded-lg border border-gray-200/70 bg-gray-100/50 shadow-lg shadow-gray-900/10 backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-black/20 sm:rounded-xl"
              >
                <div className="relative h-28 sm:h-32 overflow-hidden">
                  <img
                    src={game.image}
                    alt={game.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {game.discount > 0 && (
                    <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 bg-red-500 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-bold">
                      -{game.discount}%
                    </div>
                  )}
                  {game.price === 0 && (
                    <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 bg-emerald-500 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-bold">
                      Бесплатно
                    </div>
                  )}
                </div>
                <div className="p-3 sm:p-4">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white mb-1 line-clamp-1">
                    {game.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    {game.developer}
                  </p>
                  <div className="flex items-center gap-1 mb-2 sm:mb-3">
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {game.rating}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {game.price === 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                          Бесплатно
                        </span>
                      ) : (
                        <>
                          {game.originalPrice && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 line-through">
                              ${game.originalPrice}
                            </span>
                          )}
                          <span className="text-xs sm:text-sm text-slate-900 dark:text-white font-bold">
                            ${game.price}
                          </span>
                        </>
                      )}
                    </div>
                    <button className="px-2 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors">
                      <span className="hidden sm:inline">{game.price === 0 ? 'Получить' : 'Купить'}</span>
                      <span className="sm:hidden">{game.price === 0 ? '↓' : '🛒'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 sm:mb-6">
              <Gamepad2 className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 dark:text-slate-500" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white mb-2">
              Игры не найдены
            </h3>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4 sm:mb-6">
              В выбранной категории пока нет игр. Попробуйте выбрать другую категорию.
            </p>
            <button
              onClick={() => setSelectedGameCategory('all')}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg sm:rounded-xl font-medium transition-colors text-sm sm:text-base"
            >
              Показать все игры
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamesPage;
