import React from 'react';
import { LogIn } from 'lucide-react';

import ShinyText from '../components/ShinyText.jsx';

/**
 * Главная страница (Hero, Features, Mission, Team)
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
  darkMode,
}) => {
  return (
    <div className="flex flex-col items-center">
      <div className="relative mx-auto w-full max-w-5xl px-6 py-10 text-center md:px-10 md:py-16">
        <div className="relative z-10 mx-auto max-w-4xl">
          <h1 className="section-reveal mb-6 text-6xl font-bold tracking-tight leading-[1.06] text-slate-900 dark:text-white md:text-[6rem]">
            <span className="block text-balance">
              <ShinyText
                text="Бентум"
                speed={4.2}
                delay={0.15}
                color="#10b981"
                shineColor="#22d3ee"
                spread={210}
                direction="left"
                yoyo={false}
                pauseOnHover={false}
                disabled={false}
                className="inline-block pt-2 pb-5"
              />
            </span>
          </h1>

          <p className="section-reveal mx-auto max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-400 md:text-xl md:leading-9">
            Персональный ассистент для студентов БНТУ: расписание, литература, новости и мероприятия
            собраны в одном спокойном и понятном месте.
          </p>
        </div>

        {!isAuthenticated ? (
          <div className="relative z-10 mt-10 flex items-center justify-center">
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="hero-cta interactive-lift flex w-full items-center justify-center gap-2 rounded-3xl bg-emerald-600 px-8 py-4 pl-5 text-lg font-bold text-white shadow-xl shadow-emerald-500/30 transition-all hover:-translate-y-1 hover:bg-emerald-500 sm:w-auto"
            >
              <LogIn className="h-5 w-5" />
              <span>Начать</span>
            </button>
          </div>
        ) : null}
      </div>

      <div className="section-reveal mx-auto mt-16 w-full max-w-6xl">
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FeatureCard title={features[0].title} description={features[0].description} />
          </div>
          <div className="lg:col-span-1">
            <FeatureCard title={features[1].title} description={features[1].description} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
          <FeatureCard title={features[2].title} description={features[2].description} />
          <FeatureCard title={features[3].title} description={features[3].description} />
        </div>
      </div>

      <div className="section-reveal mx-auto mt-16 w-full max-w-6xl">
        <MissionSection stats={missionStats} isLoading={isMissionLoading} />
      </div>

      <div className="section-reveal w-full">
        <TeamCarousel teamMembers={teamMembers} darkMode={darkMode} />
      </div>
    </div>
  );
};

export default HomePage;
