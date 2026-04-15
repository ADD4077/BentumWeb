import React from 'react';
import { Star, LogIn } from 'lucide-react';

/**
 * Главная страница (Hero, Features, Mission, Team, CTA)
 */
export const HomePage = ({
  isAuthenticated,
  setIsLoginModalOpen,
  features,
  FeatureCard,
  missionStats,
  isMissionLoading,
  MissionSection,
  teamMembers,
  TeamCarousel,
  CTASection,
  setActiveTab,
  darkMode
}) => {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto mt-10">
        <span className="inline-flex text-sm md:text-base text-emerald-600 font-medium mb-10 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-500 rounded-full items-center gap-2" style={{ animation: 'float 3s ease-in-out infinite' }}>
          <Star className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>Новая версия 2.0 уже доступна</span>
          <Star className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        </span>

        <h1 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight text-slate-900 dark:text-white leading-[1.1]">
          <span className="relative inline-block">
            <span
              className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-7xl md:text-8xl font-bold tracking-tight bg-clip-text text-transparent transition-all duration-1000"
              style={{
                backgroundSize: '200% 100%',
                backgroundPosition: '0% 50%',
                animation: 'colorShift 4s ease-in-out infinite'
              }}
            >
              Бентум
            </span>
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
          Персональный ассистент, который знает, где ваша следующая пара.
          Уведомления, навигация по корпусам и синхронизация с группой — всё в одном месте.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {!isAuthenticated && (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-3xl font-bold text-lg shadow-xl shadow-emerald-500/30 transition-all hover:-translate-y-1 flex items-center justify-center gap-2 pl-5 mt-10"
            >
              <LogIn className="w-5 h-5" />
              <span>Начать</span>
            </button>
          )}
        </div>
      </div>

      {/* Features Grid */}
      <div className="w-full max-w-6xl mx-auto mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <FeatureCard
              title={features[0].title}
              description={features[0].description}
            />
          </div>
          <div className="lg:col-span-1">
            <FeatureCard
              title={features[1].title}
              description={features[1].description}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          <FeatureCard
            title={features[2].title}
            description={features[2].description}
          />
          <FeatureCard
            title={features[3].title}
            description={features[3].description}
          />
        </div>
      </div>

      {/* Mission Section */}
      <div className="w-full max-w-6xl mx-auto mt-16">
        <MissionSection stats={missionStats} isLoading={isMissionLoading} />
      </div>

      {/* Team Carousel */}
      <TeamCarousel teamMembers={teamMembers} darkMode={darkMode} />

      {/* CTA Section */}
      <CTASection setActiveTab={setActiveTab} />
    </div>
  );
};

export default HomePage;
